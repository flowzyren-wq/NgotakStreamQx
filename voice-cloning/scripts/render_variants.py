#!/usr/bin/env python3
"""
Render one sentence in several "pronunciation strategies" so you can pick the take
that sounds most Indonesian, with a cloned voice.

XTTS-v2 has no Indonesian, so the tricks below trade accuracy against naturalness:

  en_aswritten  English phonology reading the raw spelling          (baseline, mangled)
  it_aswritten  Italian phonology reading the raw spelling          (closest native match:
                Indonesian spelling is almost phonetic, like Italian)
  en_respell    English phonology reading an IPA-derived respelling (tries to force the
                Indonesian sounds into English letters)
  it_respell    Italian phonology reading an Italian respelling
  espeak_id     espeak-ng's real Indonesian voice (robotic, but 100% Indonesian) - a
                reference point, no cloning involved
  espeak_ms     espeak-ng Malay voice (for comparison; Malay ~ Indonesian)

Usage:
    python render_variants.py --ref voice.mp3 --text "Pusing gwe kampret" --out-dir out/takes
    python render_variants.py --ref voice.mp3 --text "..." --variants it_aswritten,en_respell
"""
from __future__ import annotations

import argparse
import os
import pathlib
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from id_phonetics import _apply_table, espeak_wav, g2p_ipa, ipa_to_english_respell  # noqa: E402

# Arabic-style IPA -> Italian letters (Italian is a good phonetic target for Indonesian)
_IPA_TO_IT = [
    ("t͡ʃ", "c"), ("d͡ʒ", "g"), ("tʃ", "c"), ("dʒ", "g"), ("aɪ", "ai"), ("aʊ", "au"),
    ("ɔɪ", "oi"), ("eɪ", "ei"), ("oʊ", "o"), ("iː", "i"), ("uː", "u"), ("ɔː", "o"),
    ("ɑː", "a"), ("ɜː", "e"), ("ŋ", "n"), ("ɡ", "g"), ("ɲ", "gn"), ("ʃ", "sc"),
    ("ʒ", "s"), ("θ", "t"), ("ð", "d"), ("ɾ", "r"), ("ɹ", "r"), ("j", "i"),
    ("w", "u"), ("ʔ", ""), ("ɟ", "g"), ("a", "a"), ("ɛ", "e"), ("e", "e"),
    ("ə", "e"), ("ɪ", "i"), ("i", "i"), ("ɔ", "o"), ("o", "o"), ("ʊ", "u"),
    ("u", "u"), ("ʌ", "a"), ("æ", "e"), ("ˈ", ""), ("ˌ", ""), ("ː", ""), (" ", " "),
]


def ipa_to_italian_respell(ipa_string: str) -> str:
    out = _apply_table(ipa_string, _IPA_TO_IT)
    # Italian orthography: c/g need an h before e/i to stay hard (/k/, /g/)
    fixed_words = []
    for word in out.split():
        chars = list(word)
        res = []
        for i, ch in enumerate(chars):
            res.append(ch)
            nxt = chars[i + 1] if i + 1 < len(chars) else ""
            if ch in "cg" and nxt and nxt in "ei":
                res.append("h")
        fixed_words.append("".join(res))
    out = " ".join(fixed_words)
    return "".join(ch for ch in out if ch.isascii() and (ch.isalpha() or ch in " '"))


VARIANTS: dict[str, dict] = {
    "en_aswritten": {"engine": "xtts", "lang": "en", "text": "{text}"},
    "it_aswritten": {"engine": "xtts", "lang": "it", "text": "{text}"},
    "en_respell": {"engine": "xtts", "lang": "en", "text": "{respell_en}"},
    "it_respell": {"engine": "xtts", "lang": "it", "text": "{respell_it}"},
    "espeak_id": {"engine": "espeak", "voice": "id"},
    "espeak_ms": {"engine": "espeak", "voice": "ms"},
}


def to_mp3(wav_path: str) -> str | None:
    try:
        y, sr = sf.read(wav_path)
        mp3 = wav_path[:-4] + ".mp3"
        sf.write(mp3, y, sr, format="MP3")
        return mp3
    except Exception:
        return None


def speaker_similarity(model, ref_wav: str, clip: str) -> float:
    import librosa
    import torch

    def emb(path):
        y, _ = librosa.load(path, sr=22050, mono=True)
        with torch.no_grad():
            e = model.get_speaker_embedding(torch.from_numpy(y).unsqueeze(0), 22050)
        return torch.nn.functional.normalize(e.flatten().float(), dim=0)

    try:
        return float((emb(ref_wav) * emb(clip)).sum())
    except Exception:
        return float("nan")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", required=True, help="reference voice (mp3/wav)")
    ap.add_argument("--text", required=True, help="Indonesian text to speak")
    ap.add_argument("--out-dir", default="out/takes")
    ap.add_argument("--variants", default="it_aswritten,en_respell,es_aswritten,espeak_id",
                    help="comma separated, or 'all'")
    ap.add_argument("--g2p-voice", default="id", help="espeak voice used for G2P (id/ms/jv/su)")
    ap.add_argument("--g2p-engine", default="espeak", choices=("espeak", "sea-g2p"),
                    help="which Indonesian G2P to use for the respellings")
    ap.add_argument("--seed", type=int, default=1234)
    args = ap.parse_args()

    wanted = list(VARIANTS) if args.variants == "all" else [v.strip() for v in args.variants.split(",")]
    unknown = [v for v in wanted if v not in VARIANTS]
    if unknown:
        print("unknown variants:", unknown, "| available:", list(VARIANTS))
        return 2

    out_dir = pathlib.Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    ipa_string = g2p_ipa(args.text, engine=args.g2p_engine, voice=args.g2p_voice)
    respell_en = ipa_to_english_respell(ipa_string)
    respell_it = ipa_to_italian_respell(ipa_string)
    print(f"[g2p] {args.g2p_engine}/{args.g2p_voice}: {ipa_string}")
    print(f"[g2p] english respelling : {respell_en}")
    print(f"[g2p] italian respelling : {respell_it}")

    needs_xtts = any(VARIANTS[v]["engine"] == "xtts" for v in wanted)
    model = ref_wav_prepared = None
    if needs_xtts:
        import torch

        from clone_voice import load_xtts, prep_reference

        torch.set_num_threads(int(os.environ.get("XTTS_THREADS", "2")))
        ref_wav_prepared = str(out_dir / "_reference_22k.wav")
        dur = prep_reference(args.ref, ref_wav_prepared)
        print(f"[ref] {args.ref} -> {ref_wav_prepared} ({dur:.1f}s)")
        model = load_xtts()

    results = []
    for name in wanted:
        cfg = VARIANTS[name]
        wav_path = str(out_dir / f"{name}.wav")
        if cfg["engine"] == "espeak":
            espeak_wav(args.text, wav_path, voice=cfg["voice"])
        else:
            text = cfg["text"].format(text=args.text, respell_en=respell_en, respell_it=respell_it)
            from clone_voice import clone

            print(f"[xtts] {name}: lang={cfg['lang']} text={text!r}")
            clone(model, text, cfg["lang"], ref_wav_prepared, wav_path, seed=args.seed)
        y, sr = sf.read(wav_path)
        sim = speaker_similarity(model, ref_wav_prepared, wav_path) if model else float("nan")
        to_mp3(wav_path)
        results.append((name, len(y) / sr, sim))
        print(f"  -> {name}: {len(y) / sr:.2f}s  speaker-sim {sim:.3f}")

    print("\n=== summary ===")
    print(f"text   : {args.text}")
    print(f"ipa({args.g2p_engine}): {ipa_string}")
    for name, dur, sim in results:
        print(f"  {name:14s} {dur:5.2f}s  sim {sim:.3f}  {out_dir / (name + '.mp3')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
