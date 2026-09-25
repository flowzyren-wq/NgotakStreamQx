#!/usr/bin/env python3
"""
Sanity check for a cloned clip.

Prints:
  * duration / peak / RMS,
  * speaker-embedding cosine similarity against the reference audio
    (same speaker usually > 0.6, different speakers < 0.4 with this encoder),
  * a pocketsphinx (English) read-out - a weak, offline intelligibility hint;
    slang and out-of-vocabulary words will come out garbled by design.

Usage:
    python check_clone.py --ref reference.mp3 --clone out/clone.wav
"""
from __future__ import annotations

import argparse
import os
import wave

import numpy as np
import soundfile as sf


def speaker_cosine(ref: str, clone: str) -> float:
    import librosa
    import torch

    from clone_voice import load_xtts

    model = load_xtts()

    def emb(path: str):
        y, _ = librosa.load(path, sr=22050, mono=True)
        with torch.no_grad():
            e = model.get_speaker_embedding(torch.from_numpy(y).unsqueeze(0), 22050)
        return torch.nn.functional.normalize(e.flatten().float(), dim=0)

    return float((emb(ref) * emb(clone)).sum())


def asr(path: str) -> str:
    try:
        import pocketsphinx
    except ImportError:
        return "(pocketsphinx not installed)"
    base = os.path.join(os.path.dirname(pocketsphinx.__file__), "model", "en-us")
    dec = pocketsphinx.Decoder(hmm=os.path.join(base, "en-us"),
                               lm=os.path.join(base, "en-us.lm.bin"),
                               dict=os.path.join(base, "cmudict-en-us.dict"))
    # pocketsphinx wants 16-bit PCM
    wav16 = path + ".16k.wav"
    y, sr = sf.read(path)
    if y.ndim > 1:
        y = y.mean(axis=1)
    sf.write(wav16, (y * 32767).astype(np.int16), sr, subtype="PCM_16")
    with wave.open(wav16) as w:
        dec.start_utt()
        while True:
            buf = w.readframes(1024)
            if not buf:
                break
            dec.process_raw(buf, False, False)
        dec.end_utt()
    hyp = dec.hyp()
    os.remove(wav16)
    return hyp.hypstr if hyp else ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True, help="reference voice used for cloning")
    ap.add_argument("--clone", required=True, help="generated clip")
    ap.add_argument("--skip-similarity", action="store_true")
    args = ap.parse_args()

    y, sr = sf.read(args.clone)
    if y.ndim > 1:
        y = y.mean(axis=1)
    print(f"{args.clone}: {len(y) / sr:.2f}s @ {sr} Hz, peak {np.abs(y).max():.3f}, "
          f"rms {np.sqrt((y ** 2).mean()):.4f}, silence {(np.abs(y) < 0.005).mean():.1%}")

    if not args.skip_similarity:
        print(f"speaker cosine similarity vs {args.ref}: {speaker_cosine(args.ref, args.clone):.3f}")

    print("pocketsphinx heard:", repr(asr(args.clone)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
