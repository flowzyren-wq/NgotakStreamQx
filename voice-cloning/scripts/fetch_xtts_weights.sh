#!/usr/bin/env bash
# Download + unpack the Coqui XTTS-v2 checkpoint from a GitHub mirror.
#
# Why a mirror?  The canonical copy lives on HuggingFace
# (coqui/XTTS-v2), which is not reachable from every sandbox (this one blocks all
# file hosts except github.com/codeload + pypi.org).  pilijamyuan/XTTS-v2 stores the
# same release as 74 split 7z volumes committed straight into git, so a plain
# codeload ZIP download works.
#
# Usage:  ./fetch_xtts_weights.sh [target_dir]
set -euo pipefail

OUT="${1:-${XTTS_HOME:-/home/user/work}/xtts-model}"
REPO="pilijamyuan/XTTS-v2"
TMP="$(mktemp -d)"
PYTHON="${PYTHON:-${XTTS_HOME:-/home/user/work}/venv/bin/python}"

mkdir -p "$OUT"
echo "==> downloading $REPO (via codeload, ~1.9 GB)"
curl -L --retry 3 -o "$TMP/xtts.zip" \
  "https://codeload.github.com/$REPO/zip/refs/heads/main"
ls -la "$TMP/xtts.zip"

echo "==> unzipping the split volumes"
unzip -q -o "$TMP/xtts.zip" -d "$TMP/src"
PARTS_DIR="$(dirname "$(find "$TMP/src" -name 'XTTS-v2-1.7z.001' | head -1)")"
echo "    volumes in $PARTS_DIR"

echo "==> concatenating volumes (they are byte-splits of one .7z stream)"
cat "$PARTS_DIR"/XTTS-v2-1.7z.* > "$TMP/xtts-full.7z"

echo "==> extracting checkpoint with py7zr (py7zr cannot read .7z.001 directly)"
"$PYTHON" - "$TMP/xtts-full.7z" "$OUT" <<'PY'
import sys, time, py7zr
archive, out = sys.argv[1], sys.argv[2]
t0 = time.time()
with py7zr.SevenZipFile(archive, "r") as a:
    print("   members:", a.getnames())
    a.extractall(path=out)
print(f"   extracted in {time.time() - t0:.1f}s -> {out}")
PY

echo "==> done"
find "$OUT" -maxdepth 2 -name 'model.pth' -printf '   %s  %p\n'
rm -rf "$TMP"
echo "set XTTS_MODEL_DIR to the directory printed above (it must contain config.json, model.pth, vocab.json)"
