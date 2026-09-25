# TTS / voice-cloning model survey — "which popular repo can speak Indonesian?"

Surveyed 2026-09-26 from this sandbox. Star counts straight from the GitHub API.

## The short version

**No 10k+ star open TTS model supports Indonesian.** The big ones either cover
~10-23 languages that *exclude* Indonesian (Chatterbox has the closest language:
**Malay**), or are English/Chinese only. Everything that does speak Indonesian is a small
community project whose weights live on HuggingFace / GitHub Releases — and this sandbox can
only reach `github.com` (git/codeload), `pypi.org` and `registry.npmjs.org`.

| repo | ★ | Indonesian? | voice cloning | weights hosted on | reachable here? |
| --- | --- | --- | --- | --- | --- |
| [jamiepine/voicebox](https://github.com/jamiepine/voicebox) | 55.7k | via its engines (none speak ID) | ✅ (multi-engine) | HuggingFace | ❌ HF blocked |
| [coqui-ai/TTS](https://github.com/coqui-ai/TTS) (archived) / [idiap/coqui-ai-TTS](https://github.com/idiap/coqui-ai-TTS) | 46.1k / 2.3k | ❌ (17 langs, no `id`) | ✅ XTTS-v2 | HF + GitHub mirrors | ⚠️ **yes** — mirror `pilijamyuan/XTTS-v2` commits the checkpoint to git |
| [RVC-Boss/GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) | 62.1k | ❌ (zh/en/ja/ko) | ✅ (fine-tune) | HF | ❌ |
| [RVC-Project/Retrieval-based-Voice-Conversion-WebUI](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI) | 38.5k | ✅ (language-agnostic VC) | ✅ (needs GPU training) | HF | ❌ |
| [myshell-ai/OpenVoice](https://github.com/myshell-ai/OpenVoice) | 37.7k | ❌ (en/es/fr/zh/ja/ko) | ✅ | HF | ❌ |
| [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) (Multilingual) | 26.6k | ❌ but **Malay (ms)** is supported — closest to ID | ✅ zero-shot | HF (`ResembleAI/chatterbox`) | ❌ |
| [index-tts/index-tts](https://github.com/index-tts/index-tts) | 24.2k | ❌ | ✅ | HF | ❌ |
| [SWivid/F5-TTS](https://github.com/SWivid/F5-TTS) | 15.3k | ❌ base (en/zh) | ✅ | HF | ❌ |
| [QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) | 13.5k | ❌ (10 langs, no ID) | ✅ 3s clone | HF | ❌ |
| [hexgrad/kokoro](https://github.com/hexgrad/kokoro) | 9.0k | ❌ (and it can't clone) | ❌ | HF | ❌ |
| [LEMAS-Project/LEMAS-TTS](https://github.com/LEMAS-Project/LEMAS-TTS) | 103 | ✅ **Indonesian** (10 langs) | ✅ zero-shot | HF + ModelScope | ❌ |
| [Wikidepia/indonesian-tts](https://github.com/Wikidepia/indonesian-tts) | 91 | ✅ **Indonesian**, Javanese, Sundanese | ❌ multi-speaker only | GitHub Releases (330 MB) | ❌ releases host blocked |
| [drat/TTS-Indonesia-Gratis](https://github.com/drat/TTS-Indonesia-Gratis) | 65 | ✅ ID/JV/SU (wraps the model above) | ❌ | GitHub Releases | ❌ |
| [pnnbao97/sea-g2p](https://github.com/pnnbao97/sea-g2p) | 113 | ✅ Indonesian **G2P** (text→IPA) | n/a | committed to git + PyPI | ✅ **yes** |
| [Wikidepia/g2p-id](https://github.com/Wikidepia/g2p-id) | 42 | ✅ Indonesian **G2P** | n/a | PyPI (`g2p-id`) | ✅ **yes** |

Notes on the ones that *do* speak Indonesian:

* **LEMAS-TTS** is the most interesting: zero-shot cloning + Indonesian + Vietnamese, 10
  languages. Weights are HuggingFace/ModelScope only → unusable from this box. On a normal
  machine it is the first thing to try.
* **Wikidepia's Indonesian TTS** (the model behind the popular *TTS Indonesia Gratis* app) is
  a Coqui multi-speaker model: Wibowo / Ardi / Gadis (Indonesian), Juminten (Javanese), Asep
  (Sundanese). 330 MB, GitHub Releases → this sandbox's egress allowlist blocks
  `release-assets.githubusercontent.com`, so we could not fetch it; on your own PC:
  `gh release download v1.2 -R Wikidepia/indonesian-tts` works fine.
* **Chatterbox Multilingual** (Resemble AI, MIT) is the best "big repo" option if you can
  reach HuggingFace: 23 languages *including Malay*, zero-shot cloning in ~1 GB of weights.
  Malay pronunciation of Indonesian text is a much better fit than English.

## What this leaves us with (and what we did)

Since the Indonesian-native weights are unreachable, the pipeline in `scripts/` uses
**Coqui XTTS-v2** (the one cloning model whose weights we could actually get, via the
git-committed mirror `pilijamyuan/XTTS-v2`) and works around the missing Indonesian by
routing the text through an Indonesian phonetic front-end:

```
Indonesian text ──► espeak-ng G2P (voice "id") ──► IPA
   ├─► English respelling  ──► XTTS  --language en   (`en_respell`)
   ├─► Italian respelling  ──► XTTS  --language it   (`it_respell`)
   ├─► raw text            ──► XTTS  --language it   (`it_aswritten`)
   └─► espeak-ng's own Indonesian voice (`espeak_id`) — robotic but native
```

Italian is used deliberately: its orthography→sound rules are the closest match to
Indonesian (`u`→/u/, `i`→/i/, `e`→/e/, `k`→/k/, `ng`→/ŋɡ/) of the 17 XTTS languages.
Spanish mangles `g`/`j` and German/Dutch flatten the vowels, so Italian wins.

Measured on the demo sentence "Pusing gwe kampret" (reference = XTTS's bundled sample
voice): espeak gives `pusiŋ ɡwɛ kamprət`, sea-g2p gives `pu siŋ ɡwˈɪ kam pret`, and the
XTTS takes land at speaker-similarity 0.60–0.72 versus the reference.
