#!/usr/bin/env python3
"""
Zero-shot voice cloning with Coqui XTTS-v2, CPU only (no GPU, no HuggingFace).

Pipeline: reference audio (mp3/wav/...) -> cleaned 22.05 kHz mono wav ->
speaker + GPT conditioning latents -> synthesized speech in that voice.

Usage:
    python clone_voice.py --ref voice.mp3 --text "Pusing gwe kampret" --out out/clone.wav

Environment:
    XTTS_MODEL_DIR   directory holding config.json/model.pth/vocab.json
                     (default: $XTTS_HOME/xtts-model/XTTS-v2-1)
    XTTS_HOME        working dir used by setup_xtts_cpu.sh (default /home/user/work)
    XTTS_THREADS     CPU threads for torch (default 2)
"""
from __future__ import annotations

import argparse
import os
import pathlib
import sys
import time

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", os.environ.get("XTTS_THREADS", "2"))
os.environ.setdefault("MKL_NUM_THREADS", os.environ.get("XTTS_THREADS", "2"))

import numpy as np
import soundfile as sf
import torch

# No GPU here, and torch is a CUDA wheel running against stub CUDA libraries
# (see make_cuda_stubs.py) - make sure nothing ever probes the GPU for real.
torch.cuda.is_available = lambda: False  # type: ignore[assignment]
torch.cuda.device_count = lambda: 0  # type: ignore[assignment]

IGNORE_PREFIXES = ("torch_mel_spectrogram_style_encoder", "torch_mel_spectrogram_dvae", "dvae")


def default_model_dir() -> str:
    env = os.environ.get("XTTS_MODEL_DIR")
    if env:
        return env
    candidates = [
        pathlib.Path(os.environ.get("XTTS_HOME", "/home/user/work")) / "xtts-model" / "XTTS-v2-1",
        pathlib.Path.home() / "xtts" / "xtts-model" / "XTTS-v2-1",
    ]
    for cand in candidates:
        if (cand / "model.pth").exists():
            return str(cand)
    return str(candidates[0])


# --------------------------------------------------------------------------- #
# reference audio preparation
# --------------------------------------------------------------------------- #
def prep_reference(src: str, dst: str, sr: int = 22050, max_seconds: float = 30.0,
                   trim_db: float = 30.0, start: float = 0.0, normalize: bool = True) -> float:
    """Decode any audio file to a mono 22.05 kHz wav that XTTS can condition on.

    libsndfile (via soundfile/librosa) handles mp3/m4a/flac/wav without ffmpeg.
    """
    import librosa

    y, _ = librosa.load(src, sr=sr, mono=True, offset=start)
    if max_seconds:
        y = y[: int(sr * max_seconds)]
    if trim_db:
        y = librosa.effects.trim(y, top_db=trim_db)[0]
    if normalize:
        peak = float(np.abs(y).max()) or 1.0
        y = (y / peak) * 0.95
    sf.write(dst, y, sr)
    return len(y) / sr


# --------------------------------------------------------------------------- #
# model
# --------------------------------------------------------------------------- #
def load_xtts(model_dir: str | None = None, verbose: bool = True, threads: int | None = None):
    """Load XTTS-v2 straight from a local directory (no network access).

    The 1.87 GB checkpoint is memory-mapped and assigned directly into the module
    tree, so the fp32 model runs in a ~4 GB box (peak RSS ~2.5 GB).
    """
    if threads:
        torch.set_num_threads(threads)
    model_dir = model_dir or default_model_dir()

    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.layers.xtts.tokenizer import VoiceBpeTokenizer
    from TTS.tts.layers.xtts.xtts_manager import LanguageManager, SpeakerManager
    from TTS.tts.models.xtts import Xtts

    cfg = XttsConfig()
    cfg.load_json(os.path.join(model_dir, "config.json"))

    model = Xtts.init_from_config(cfg)
    model.language_manager = LanguageManager(cfg)
    model.tokenizer = VoiceBpeTokenizer(vocab_file=os.path.join(model_dir, "vocab.json"))
    speaker_file = os.path.join(model_dir, "speakers_xtts.pth")
    model.speaker_manager = SpeakerManager(speaker_file) if os.path.exists(speaker_file) else None

    t0 = time.time()
    model.init_models()

    ckpt = torch.load(os.path.join(model_dir, "model.pth"), map_location="cpu",
                      mmap=True, weights_only=True)
    state = ckpt.get("model", ckpt)
    state = {k: v for k, v in state.items() if k.split(".")[0] not in IGNORE_PREFIXES}
    missing, unexpected = model.load_state_dict(state, assign=True, strict=False)
    if verbose:
        print(f"[model] XTTS-v2 loaded from {model_dir} in {time.time() - t0:.1f}s "
              f"(missing={len(missing)}, unexpected={len(unexpected)})", flush=True)
        if missing:
            print("[model] missing keys (first 8):", missing[:8], flush=True)
    model.eval()
    return model


# --------------------------------------------------------------------------- #
# synthesis
# --------------------------------------------------------------------------- #
def clone(model, text: str, language: str, ref_wav: str, out_path: str,
          temperature: float = 0.75, repetition_penalty: float = 2.0,
          top_k: int = 50, top_p: float = 0.85, speed: float = 1.0,
          gpt_cond_len: int = 6, seed: int | None = None) -> str:
    if seed is not None:
        torch.manual_seed(seed)

    t0 = time.time()
    gpt_cond_latent, speaker_embedding = model.get_conditioning_latents(
        audio_path=[ref_wav], max_ref_length=30, gpt_cond_len=gpt_cond_len,
        gpt_cond_chunk_len=gpt_cond_len, sound_norm_refs=False,
    )
    print(f"[clone] conditioning latents ready in {time.time() - t0:.1f}s", flush=True)

    t1 = time.time()
    out = model.inference(
        text, language, gpt_cond_latent, speaker_embedding,
        temperature=temperature, length_penalty=1.0,
        repetition_penalty=repetition_penalty, top_k=top_k, top_p=top_p,
        do_sample=True, enable_text_splitting=False, speed=speed,
    )
    wav = out["wav"]
    if hasattr(wav, "detach"):
        wav = wav.detach().cpu().numpy()
    wav = np.asarray(wav, dtype=np.float32).squeeze()
    sr = model.config.audio.output_sample_rate
    pathlib.Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    sf.write(out_path, wav, sr)
    print(f"[clone] {len(wav) / sr:.2f}s of speech in {time.time() - t1:.1f}s -> {out_path}",
          flush=True)
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser(description="Clone a voice with XTTS-v2 (CPU only).")
    ap.add_argument("--ref", required=True, help="reference audio (mp3/wav/ogg/m4a/...)")
    ap.add_argument("--text", required=True, help="text to speak")
    ap.add_argument("--out", required=True, help="output wav path")
    ap.add_argument("--language", default="en", help="XTTS language code (default: en)")
    ap.add_argument("--model-dir", default=None)
    ap.add_argument("--threads", type=int, default=int(os.environ.get("XTTS_THREADS", "2")))
    ap.add_argument("--temperature", type=float, default=0.75)
    ap.add_argument("--repetition-penalty", type=float, default=2.0)
    ap.add_argument("--top-k", type=int, default=50)
    ap.add_argument("--top-p", type=float, default=0.85)
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--ref-start", type=float, default=0.0, help="skip N seconds of the reference")
    ap.add_argument("--ref-seconds", type=float, default=30.0, help="max reference length used")
    ap.add_argument("--clips", type=int, default=1, help="number of takes to generate")
    args = ap.parse_args()

    torch.set_num_threads(args.threads)

    workdir = os.path.dirname(os.path.abspath(args.out)) or "."
    os.makedirs(workdir, exist_ok=True)
    ref_wav = os.path.join(workdir, "_reference_22k.wav")
    dur = prep_reference(args.ref, ref_wav, max_seconds=args.ref_seconds, start=args.ref_start)
    print(f"[ref] {args.ref} -> {ref_wav} ({dur:.1f}s @ 22.05 kHz)", flush=True)

    model = load_xtts(args.model_dir, threads=args.threads)

    for i in range(args.clips):
        out = args.out if args.clips == 1 else args.out.replace(".wav", f"_{i + 1}.wav")
        clone(model, args.text, args.language, ref_wav, out,
              temperature=args.temperature, repetition_penalty=args.repetition_penalty,
              top_k=args.top_k, top_p=args.top_p,
              seed=None if args.seed is None else args.seed + i)
    return 0


if __name__ == "__main__":
    sys.exit(main())
