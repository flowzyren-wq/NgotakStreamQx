#!/usr/bin/env bash
# Clone suara dari file audio pake Voicebox (github.com/jamiepine/voicebox),
# terus bikin suara itu ngomong kalimat yang lu mau.
#
# Pemakaian:
#   ./clone_voice.sh <file_audio> ["teks yang mau diucapin"]
#
# Contoh:
#   ./clone_voice.sh ficy.mp3 "Pusing gwe kampret"
#
# Env opsional:
#   VOICEBOX_URL  URL server Voicebox (default: nyari otomatis di :17600 lalu :17493)
#   REF_TEXT      transkrip audio referensi (kalau kosong, di-transcribe otomatis pake Whisper)
#   START_SEC     detik mulai potongan referensi (default 0)
#   DUR_SEC       panjang potongan referensi, 3–29 detik (default 15)
#   LANG_CODE     bahasa buat Voicebox (default ms = Melayu, paling mirip Indonesia)
#   ENGINE        engine TTS (default chatterbox = Chatterbox Multilingual)
#   OUT           file output (default hasil.wav)
set -euo pipefail

SRC="${1:?Pakai: $0 <file_audio> [\"teks\"]}"
TEXT="${2:-Pusing gwe kampret}"
START_SEC="${START_SEC:-0}"
DUR_SEC="${DUR_SEC:-15}"
LANG_CODE="${LANG_CODE:-ms}"
ENGINE="${ENGINE:-chatterbox}"
OUT="${OUT:-hasil.wav}"

need() { command -v "$1" >/dev/null || { echo "❌ butuh '$1' (install dulu)"; exit 1; }; }
need curl; need ffmpeg; need python3

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

# --- 1. Cari server Voicebox --------------------------------------------------
if [[ -z "${VOICEBOX_URL:-}" ]]; then
  for u in http://127.0.0.1:17600 http://127.0.0.1:17493; do
    if curl -sf -m 3 "$u/health" >/dev/null; then VOICEBOX_URL="$u"; break; fi
  done
fi
[[ -n "${VOICEBOX_URL:-}" ]] || {
  echo "❌ Server Voicebox gak ketemu. Jalanin dulu: (di folder voicebox) docker compose up -d --build"
  echo "   atau buka app Voicebox desktop, lalu coba lagi."
  exit 1
}
echo "✅ Voicebox: $VOICEBOX_URL"

# --- 2. Siapin audio referensi (mono 24 kHz, max 29 detik) --------------------
REF="$(mktemp --suffix=.wav)"
trap 'rm -f "$REF"' EXIT
ffmpeg -loglevel error -y -ss "$START_SEC" -t "$DUR_SEC" -i "$SRC" \
  -ac 1 -ar 24000 -af "highpass=f=80,loudnorm" "$REF"
echo "✅ Referensi: ${DUR_SEC}s mulai detik ${START_SEC}"

# --- 3. Transkrip referensi (Whisper di dalam Voicebox) -----------------------
if [[ -z "${REF_TEXT:-}" ]]; then
  echo "⏳ Transcribe audio referensi (download Whisper pertama kali bisa agak lama)..."
  for i in $(seq 1 120); do
    code=$(curl -s -o /tmp/vb_tr.json -w '%{http_code}' -F "file=@$REF" -F "language=id" "$VOICEBOX_URL/transcribe")
    [[ "$code" == 200 ]] && break
    [[ "$code" == 202 ]] || { echo "   (transcribe HTTP $code: $(cat /tmp/vb_tr.json))"; }
    sleep 10
  done
  [[ "$code" == 200 ]] || { echo "❌ Transcribe gagal. Isi manual: REF_TEXT=\"...\" $0 $*"; exit 1; }
  REF_TEXT="$(json 'd["text"]' </tmp/vb_tr.json)"
fi
echo "📝 Transkrip: $REF_TEXT"

# --- 4. Bikin voice profile + upload sample -----------------------------------
NAME="clone-$(basename "${SRC%.*}" | cut -c1-40)-$(date +%s)"
PROFILE_ID=$(curl -sf -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"name":sys.argv[1],"language":sys.argv[2],"voice_type":"cloned","default_engine":sys.argv[3]}))' "$NAME" "$LANG_CODE" "$ENGINE")" \
  "$VOICEBOX_URL/profiles" | json 'd["id"]')
echo "✅ Profile: $NAME ($PROFILE_ID)"

curl -sf -F "file=@$REF;filename=reference.wav" -F "reference_text=$REF_TEXT" \
  "$VOICEBOX_URL/profiles/$PROFILE_ID/samples" >/dev/null
echo "✅ Sample ke-upload"

# --- 5. Generate ---------------------------------------------------------------
echo "⏳ Generate: \"$TEXT\" (download model pertama kali ~3 GB, sabar ya)..."
GEN_ID=$(curl -sf -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"profile_id":sys.argv[1],"text":sys.argv[2],"language":sys.argv[3],"engine":sys.argv[4]}))' "$PROFILE_ID" "$TEXT" "$LANG_CODE" "$ENGINE")" \
  "$VOICEBOX_URL/generate" | json 'd["id"]')

# Status endpoint = SSE; baca sampai completed/failed
STATUS=$(curl -sN -m 3600 "$VOICEBOX_URL/generate/$GEN_ID/status" \
  | grep --line-buffered -oE '"status": "(completed|failed)".*' | head -1 || true)
if [[ "$STATUS" != *completed* ]]; then
  echo "❌ Generate gagal: $STATUS"; exit 1
fi

curl -sf -o "$OUT" "$VOICEBOX_URL/audio/$GEN_ID"
echo "🎉 Jadi! -> $OUT"
