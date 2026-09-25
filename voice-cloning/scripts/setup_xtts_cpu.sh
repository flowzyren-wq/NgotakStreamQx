#!/usr/bin/env bash
# One-shot setup: builds a CPU-only voice-cloning environment for XTTS-v2.
#
#   ./setup_xtts_cpu.sh              # installs into $XTTS_HOME (default /home/user/work)
#   XTTS_HOME=~/xtts ./setup_xtts_cpu.sh
#
# What it does
#   1. venv + torch/torchaudio (PyPI wheels; used CPU-only)
#   2. coqui-tts pinned to a transformers 4.x release (5.x breaks coqui-tts)
#   3. stub CUDA libs (make_cuda_stubs.py) so `import torch` works with no NVIDIA bits
#   4. downloads + extracts the XTTS-v2 checkpoint from a GitHub mirror
#
# Everything is public PyPI + github.com; no HuggingFace access required.
set -euo pipefail

XTTS_HOME="${XTTS_HOME:-/home/user/work}"
VENV="$XTTS_HOME/venv"
PY="${PYTHON:-python3}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$XTTS_HOME"

echo "==> python venv at $VENV"
"$PY" -m venv "$VENV"
"$VENV/bin/pip" install -q -U pip setuptools wheel

echo "==> torch 2.5.1 + torchaudio (--no-deps: skip the ~2.5 GB nvidia-*-cu12 wheels)"
"$VENV/bin/pip" install --no-deps "torch==2.5.1" "torchaudio==2.5.1"
"$VENV/bin/pip" install -q filelock typing-extensions sympy networkx jinja2 fsspec

echo "==> coqui-tts 0.27.5 (transformers pinned to 4.57.6)"
"$VENV/bin/pip" install -q "coqui-tts==0.27.5" "transformers==4.57.6"

echo "==> helpers (7z reading, audio i/o, espeak-ng library, ASR sanity check)"
"$VENV/bin/pip" install -q py7zr multivolumefile soundfile espeakng-loader phonemizer pocketsphinx

echo "==> stub CUDA libraries"
"$VENV/bin/python" "$HERE/make_cuda_stubs.py" --venv "$VENV" --out "$XTTS_HOME/cuda-stubs"
if command -v sudo >/dev/null 2>&1; then
  sudo cp "$XTTS_HOME"/cuda-stubs/*.so* /usr/local/lib/ 2>/dev/null || true
  sudo /sbin/ldconfig 2>/dev/null || true
fi

echo "==> XTTS-v2 checkpoint (~1.9 GB download)"
XTTS_HOME="$XTTS_HOME" PYTHON="$VENV/bin/python" "$HERE/fetch_xtts_weights.sh" "$XTTS_HOME/xtts-model"

cat <<EOF

All set.  Example run:

  export XTTS_MODEL_DIR=$XTTS_HOME/xtts-model/XTTS-v2-1
  $VENV/bin/python $HERE/clone_voice.py \\
      --ref /path/to/reference.mp3 \\
      --text "Pusing gwe kampret" \\
      --out out/pusing_gwe_kampret.wav

If the box has less than ~6 GB RAM, add swap first:

  sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
EOF
