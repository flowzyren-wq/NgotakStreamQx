#!/usr/bin/env python3
"""
Indonesian phonetics helpers that work fully offline.

Three things the rest of the pipeline needs:

1. `espeak_ipa(text)` - Indonesian grapheme-to-phoneme via the espeak-ng library
   bundled in the `espeakng-loader` wheel (install with pip; no apt/espeak binary).
   Example: "Pusing gwe kampret" -> "pusiŋ ɡwɛ kamprət"

2. `ipa_to_english_respell(ipa)` - rewrite that IPA as plain English letters so an
   English-only TTS (Coqui XTTS-v2, Chatterbox English, ...) *reads* roughly the
   Indonesian sounds instead of mangling the spelling.

3. `espeak_wav(text, out)` - actually synthesize Indonesian/Malay/Javanese/Sundanese
   speech with espeak-ng (robotic, but genuinely Indonesian pronunciation).  Handy as
   an A/B reference when a cloned voice reads Indonesian text.

espeak-ng here ships voices for id, ms, jv, su + 100 more.
"""
from __future__ import annotations

import ctypes
import os
import pathlib
import sys
import wave

import numpy as np

ESPEAK_SAMPLE_RATE = 22050
AUDIO_OUTPUT_RETRIEVAL = 1
CHARS_UTF8 = 1


# --------------------------------------------------------------------------- #
# library loading
# --------------------------------------------------------------------------- #
def load_espeak():
    """Load libespeak-ng from the espeakng-loader wheel and point it at its data."""
    import espeakng_loader

    data_dir = str(espeakng_loader.get_data_path())        # .../espeak-ng-data
    lib_path = str(espeakng_loader.get_library_path())
    # The wheel is built with a CI-path baked in, so tell espeak where its data
    # really is: ESPEAK_DATA_PATH must be the *parent* of espeak-ng-data.
    os.environ["ESPEAK_DATA_PATH"] = os.path.dirname(data_dir)
    os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", lib_path)
    return lib_path, os.path.dirname(data_dir)


def espeak_ipa(text: str, voice: str = "id", with_stress: bool = False) -> str:
    """Indonesian (or ms/jv/su) text -> IPA string."""
    lib_path, _ = load_espeak()
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    from phonemizer import phonemize

    EspeakWrapper.set_library(lib_path)
    out = phonemize([text], language=voice, backend="espeak",
                    with_stress=with_stress, strip=True)
    return out[0].strip()


def sea_g2p_ipa(text: str, lang: str = "id") -> str:
    """IPA via sea-g2p (pnnbao97/sea-g2p, 113*, pip install sea-g2p) - SEA-specialised.

    Output is syllable-separated: "Pusing gwe kampret" -> "pu siŋ ɡwˈɪ kam pret".
    Great for inspection, but the extra spaces make it a poor direct TTS input.
    """
    from sea_g2p import G2P

    return G2P(lang=lang).convert(text)


def g2p_ipa(text: str, engine: str = "espeak", voice: str = "id") -> str:
    """IPA with the selected engine ('espeak' keeps word boundaries, 'sea-g2p' is SEA-tuned)."""
    if engine == "sea-g2p":
        return sea_g2p_ipa(text, lang="id")
    return espeak_ipa(text, voice=voice)


# --------------------------------------------------------------------------- #
# IPA -> English respelling
# --------------------------------------------------------------------------- #
# Longest-first so digraphs/affricates win over single symbols.
_IPA_TO_EN = [
    ("t͡ʃ", "ch"), ("d͡ʒ", "j"), ("tʃ", "ch"), ("dʒ", "j"),
    ("aɪ", "eye"), ("aʊ", "ow"), ("ɔɪ", "oy"), ("eɪ", "ay"), ("oʊ", "oh"), ("əʊ", "oh"),
    ("iː", "ee"), ("uː", "oo"), ("ɔː", "aw"), ("ɑː", "ah"), ("ɜː", "ur"), ("ɛː", "eh"),
    ("ŋ", "ng"), ("ɡ", "g"), ("ɲ", "ny"), ("ʃ", "sh"), ("ʒ", "zh"), ("θ", "th"), ("ð", "dh"),
    ("ɾ", "r"), ("ɹ", "r"), ("r", "r"), ("j", "y"), ("w", "w"), ("ʔ", ""), ("ɟ", "j"),
    ("a", "ah"), ("ɛ", "eh"), ("e", "eh"), ("ə", "uh"), ("ɪ", "i"), ("i", "ee"),
    ("ɔ", "aw"), ("o", "oh"), ("ʊ", "oo"), ("u", "oo"), ("ʌ", "uh"), ("æ", "a"),
    ("ˈ", ""), ("ˌ", ""), ("ː", ""), (" ", " "),
]


def _apply_table(text: str, table) -> str:
    """Single-pass, longest-match-first symbol substitution.

    Sequential str.replace() cascades (e.g. schwa -> "uh" then "u" -> "oo" turns
    "uh" into "ooh"), so the lookup has to happen in one pass instead.
    """
    table = sorted(table, key=lambda kv: -len(kv[0]))
    out: list[str] = []
    i = 0
    while i < len(text):
        for sym, rep in table:
            if sym and text.startswith(sym, i):
                out.append(rep)
                i += len(sym)
                break
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


def ipa_to_english_respell(ipa: str) -> str:
    """'pusiŋ ɡwɛ kamprət' -> 'pooseeng gweh kahmpruht' (what an English TTS can read)."""
    out = _apply_table(ipa, _IPA_TO_EN)
    # anything left that is not a letter/space/apostrophe gets dropped
    out = "".join(ch for ch in out if ch.isascii() and (ch.isalpha() or ch in " '-"))
    return " ".join(w for w in out.split() if w)


# --------------------------------------------------------------------------- #
# native espeak-ng synthesis
# --------------------------------------------------------------------------- #
class _EspeakSynth:
    """Minimal ctypes wrapper around espeak_Synth() with a PCM collecting callback."""

    _CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)

    def __init__(self):
        lib_path, data_dir = load_espeak()
        self.lib = ctypes.CDLL(lib_path)
        self.lib.espeak_Initialize.restype = ctypes.c_int
        self.lib.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
        self.lib.espeak_SetVoiceByName.restype = ctypes.c_int
        self.lib.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
        self.lib.espeak_SetSynthCallback.argtypes = [self._CB]
        self.lib.espeak_Synth.restype = ctypes.c_int
        self.lib.espeak_Synth.argtypes = [
            ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_int,
            ctypes.c_uint, ctypes.c_uint, ctypes.POINTER(ctypes.c_uint), ctypes.c_void_p,
        ]
        self.lib.espeak_Synchronize.restype = ctypes.c_int
        self._chunks: list[np.ndarray] = []
        self._cb = self._CB(self._on_audio)
        self.lib.espeak_SetSynthCallback(self._cb)
        rc = self.lib.espeak_Initialize(AUDIO_OUTPUT_RETRIEVAL, 500, data_dir.encode(), 0)
        if rc <= 0:
            raise RuntimeError(f"espeak_Initialize failed (rc={rc})")

    def _on_audio(self, wav, num_samples, events):
        if num_samples > 0:
            buf = ctypes.cast(wav, ctypes.POINTER(ctypes.c_short * num_samples)).contents
            self._chunks.append(np.frombuffer(bytes(buf), dtype=np.int16).copy())
        return 0

    def synth(self, text: str, voice: str = "id", speed: int = 160) -> np.ndarray:
        self._chunks = []
        self.lib.espeak_SetVoiceByName(voice.encode())
        # espeak_SetParameter(espeakRATE=1, value, 0); the library exposes it as
        # espeak_SetParameter, but the rate also lives in the voice variant, so set
        # it through espeak_SetParameter when available.
        if hasattr(self.lib, "espeak_SetParameter"):
            self.lib.espeak_SetParameter.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int]
            self.lib.espeak_SetParameter(1, speed, 0)
        data = text.encode("utf-8")
        uid = ctypes.c_uint(0)
        rc = self.lib.espeak_Synth(data, len(data) + 1, 0, 1, 0, CHARS_UTF8,
                                   ctypes.byref(uid), None)
        if rc != 0:
            raise RuntimeError(f"espeak_Synth failed (rc={rc})")
        self.lib.espeak_Synchronize()
        if not self._chunks:
            return np.zeros(0, dtype=np.int16)
        return np.concatenate(self._chunks)


_synth: _EspeakSynth | None = None


def espeak_wav(text: str, out_path: str, voice: str = "id", speed: int = 160) -> str:
    """Synthesize `text` with espeak-ng (robotic but native Indonesian) -> 16-bit wav."""
    global _synth
    if _synth is None:
        _synth = _EspeakSynth()
    pcm = _synth.synth(text, voice=voice, speed=speed)
    pathlib.Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(ESPEAK_SAMPLE_RATE)
        w.writeframes(pcm.tobytes())
    return out_path


def main() -> int:
    import argparse

    ap = argparse.ArgumentParser(description="Indonesian G2P / espeak-ng synthesis helper")
    ap.add_argument("text", nargs="*", default=["Pusing gwe kampret"])
    ap.add_argument("--voice", default="id", help="espeak voice: id, ms, jv, su, ...")
    ap.add_argument("--ipa", action="store_true", help="print IPA + English respelling")
    ap.add_argument("--wav", help="synthesize to this wav file with espeak-ng")
    args = ap.parse_args()

    text = " ".join(args.text)
    if args.wav:
        print("wrote", espeak_wav(text, args.wav, voice=args.voice))
        return 0

    ipa = espeak_ipa(text, voice=args.voice)
    print(f"ipa ({args.voice}): {ipa}")
    print(f"english respelling: {ipa_to_english_respell(ipa)}")
    for v in ("id", "ms", "it", "en-us"):
        try:
            print(f"  {v:6s} {espeak_ipa(text, voice=v)}")
        except Exception as exc:  # pragma: no cover
            print(f"  {v:6s} error: {exc}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
