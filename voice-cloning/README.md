# Voice cloning on CPU — XTTS-v2 + an Indonesian phonetic front-end

> Everything in this folder is standalone tooling for the NgotakStream Qx repo — it does not
> touch the app. All commands below are run **from this folder** (`cd voice-cloning`).

Zero-shot voice cloning that runs on a **2 vCPU / 4 GB, CPU-only, GPU-less sandbox**, with
**no HuggingFace access** (`github.com`, `pypi.org` and `registry.npmjs.org` are the only
reachable hosts). Hand it a short reference clip (mp3/wav/m4a/…), pick a text, get speech in
that voice — plus helper tooling to make it *sound Indonesian* even though XTTS-v2 has no
Indonesian language pack.

Survey of every serious open TTS/cloning model and what it can do in Indonesian:
[`docs/tts-model-survey.md`](docs/tts-model-survey.md) — TL;DR: the 10k+ star models
(Qwen3-TTS 13.5k, Chatterbox 26.6k, GPT-SoVITS 62.1k, OpenVoice 37.7k, F5-TTS 15.3k, …) do
**not** support Indonesian at all; Chatterbox Multilingual gets closest with **Malay**. The
projects that do speak Indonesian (LEMAS-TTS 103★, Wikidepia 91★, drat 65★) host their weights
on HuggingFace / GitHub Releases, both unreachable from this sandbox.

## Demo takes

`"Pusing gwe kampret"` — same sentence, four pronunciation strategies, cloned from XTTS's
bundled sample voice (a *pipeline* demo, not a target-voice clone):

| file | strategy | what you hear |
| --- | --- | --- |
| `demo/demo_1_italian_phonology.mp3` | XTTS `--language it`, text as written | Italian phonology ≈ Indonesian spelling |
| `demo/demo_2_english_respell.mp3` | XTTS `--language en`, IPA-derived respelling (`pooseeng gweh kahmpruht`) | English phonology forced onto Indonesian sounds |
| `demo/demo_3_italian_respell.mp3` | XTTS `--language it`, Italian respelling (`pusin gue kampret`) | Italian phonology, spelling fixed up |
| `demo/demo_4_espeak_native_indonesian.mp3` | espeak-ng voice `id` | real Indonesian, robotic, no cloning |

Indonesian G2P for the sentence: `pusiŋ ɡwɛ kamprət` (espeak-ng `id`), `pu siŋ ɡwˈɪ kam pret`
(sea-g2p). Speaker similarity of the XTTS takes vs. the reference: **0.60 – 0.70**.

## Quick start

```bash
# 1. build everything: venv, torch, coqui-tts, stub CUDA libs, XTTS-v2 weights (~1.9 GB)
XTTS_HOME=/home/user/work ./scripts/setup_xtts_cpu.sh

# 2. clone a voice (plain)
export XTTS_MODEL_DIR=/home/user/work/xtts-model/XTTS-v2-1
./work/venv/bin/python scripts/clone_voice.py \
    --ref /path/to/reference.mp3 \
    --text "Pusing gwe kampret" \
    --out takes/clone.wav

# 3. or render every pronunciation strategy at once and pick the best take
./work/venv/bin/python scripts/render_variants.py \
    --ref /path/to/reference.mp3 \
    --text "Pusing gwe kampret" \
    --out-dir takes --variants it_aswritten,en_respell,it_respell,espeak_id

# 4. sanity check a take (duration, speaker similarity, offline ASR read-out)
./work/venv/bin/python scripts/check_clone.py --ref /path/to/reference.mp3 --clone takes/en_respell.wav
```

MP3 output needs no ffmpeg — `soundfile`'s libsndfile writes MP3 directly.

## Layout

| file | purpose |
| --- | --- |
| `scripts/setup_xtts_cpu.sh` | one-shot env build (venv → torch → coqui-tts → stubs → weights) |
| `scripts/fetch_xtts_weights.sh` | XTTS-v2 checkpoint from the GitHub mirror (74 concatenated 7z volumes → py7zr) |
| `scripts/make_cuda_stubs.py` | stub `libcudart/libcublas/libcudnn/...` so the CUDA torch wheel imports without the 2.5 GB `nvidia-*-cu12` packages |
| `scripts/clone_voice.py` | reference prep → conditioning latents → 24 kHz cloned speech |
| `scripts/id_phonetics.py` | Indonesian G2P (espeak-ng / sea-g2p), IPA→English/Italian respelling, native espeak-ng Indonesian synthesis |
| `scripts/render_variants.py` | batch-render the pronunciation strategies in one model load |
| `scripts/check_clone.py` | duration / speaker-cosine / pocketsphinx read-out |
| `docs/tts-model-survey.md` | the model survey (stars, Indonesian support, weight hosting) |

## Pipeline

1. `prep_reference()` — decode the reference to mono **22.05 kHz** with `librosa`/`libsndfile`
   (no ffmpeg needed), trim silence, peak-normalise.
2. `get_conditioning_latents()` — speaker embedding (perceiver encoder) + GPT conditioning
   latents from up to 30 s (6 s window) of that audio.
3. `model.inference()` — autoregressive GPT + HiFi-GAN decoder → 24 kHz speech in that voice.

On 2 threads: model load ≈ 9 s, conditioning ≈ 1 s, **≈ 10 s of compute per 2 s of speech**.
`XTTS_THREADS` sets the thread count.

## Indonesian, without an Indonesian model

XTTS-v2 covers 17 languages and **Indonesian is not one of them** (`--language id` is
rejected). Two workarounds, both wired into `render_variants.py`:

* **Italian phonology** (`it_aswritten`) — of the 17 available languages, Italian's
  orthography→sound mapping is by far the closest to Indonesian (`u`→/u/, `i`→/i/, `e`→/e/,
  `k`→/k/, `ng`→/ŋɡ/). Spanish destroys `g`/`j`, German and Dutch flatten the vowels.
* **IPA-derived respelling** (`en_respell`, `it_respell`) — Indonesian text → IPA via
  espeak-ng (`id`) or [sea-g2p](https://github.com/pnnbao97/sea-g2p), then rewritten into
  letters that the target language's G2P reads back as the Indonesian sounds.
* **espeak-ng voice `id`** (`espeak_id`) — genuinely Indonesian, entirely offline and
  instant, but robotic and it cannot clone.

The espeak-ng shared library comes from the `espeakng-loader` wheel (no apt, no binary), and
its data path is fixed up at runtime with `ESPEAK_DATA_PATH` because the wheel is built with a
CI path baked in. Voices available locally include `id`, `ms`, `jv`, `su` + ~100 more.

## Sandbox gotchas (already solved)

* **PyPI `torch` wheels are CUDA builds.** With `--no-deps` they die at import
  (`OSError: libcudart.so.12: cannot open shared object file`) and `torch.cuda.is_available()`
  segfaults. `scripts/make_cuda_stubs.py` generates stub CUDA libraries with matching symbol
  versions plus sane `cudaGetDeviceCount() → 0`, so torch reports "no CUDA" instead of
  crashing — saving a ~2.5 GB download. `clone_voice.py` also pins
  `torch.cuda.is_available() = False` defensively.
* **`transformers` must stay on 4.x** (4.57.6 tested). coqui-tts only asks for `>=4.57`, so pip
  installs 5.x, where `transformers.pytorch_utils.isin_mps_friendly` no longer exists and
  `import TTS` explodes.
* **Memory.** The 1.87 GB checkpoint is `torch.load(..., mmap=True)`-ed and assigned straight
  into the module tree (`load_state_dict(..., assign=True)`) — one copy, `missing=0,
  unexpected=0` against stock coqui-tts, peak RSS ≈ 2.5 GB. On a 4 GB box add swap
  (`sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile &&
  sudo swapon /swapfile`); model construction alone spikes to ~2.35 GB and the OOM killer is
  unimpressed.
* **Weights without HuggingFace.** `scripts/fetch_xtts_weights.sh` pulls
  `codeload.github.com/pilijamyuan/XTTS-v2/...` (weights committed to git), concatenates the
  74 `XTTS-v2-1.7z.0NN` volumes into one stream, then unpacks with `py7zr` — `py7zr` cannot
  open `.7z.001` directly, and cloning that repo is far slower than the zip.
* **GitHub Releases are blocked here** too (`release-assets.githubusercontent.com` /
  `objects.githubusercontent.com`), which is why the Indonesian models in the survey could not
  be downloaded. Only git trees + PyPI/npm work.

## Ethics

Only clone voices you own or have permission to use. XTTS-v2 ships under the Coqui Public
Model License (CPML, non-commercial) — see `xtts-model/XTTS-v2-1/LICENSE.txt` before any
commercial use. espeak-ng is GPL-3.0.
