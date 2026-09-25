# Voice clone pake Voicebox

Script buat clone suara dari file audio pake [Voicebox](https://github.com/jamiepine/voicebox),
terus bikin suaranya ngomong kalimat yang lu mau (default: **"Pusing gwe kampret"**).

## Cara pakai

```bash
# 1. Jalanin Voicebox (Docker, versi CPU)
git clone https://github.com/jamiepine/voicebox.git
cd voicebox && docker compose up -d --build     # server di http://127.0.0.1:17600
cd ..
#   (atau install app desktop Voicebox dari voicebox.sh -> server di :17493)

# 2. Clone suaranya + generate
./voice-clone/clone_voice.sh vidgap-com-ficy_yeay-7454370796857838854-music.mp3 "Pusing gwe kampret"
# -> hasil.wav
```

Butuh: `docker`, `curl`, `ffmpeg`, `python3`. RAM minimal 8 GB, dan model
Chatterbox Multilingual (~3,2 GB) bakal ke-download otomatis waktu pertama kali generate.

## Tips biar hasilnya lebih mirip

- **Pake potongan yang cuma suara ngomong** (tanpa musik/backsound). Atur pake
  `START_SEC` dan `DUR_SEC` (3–29 detik), misal: `START_SEC=4 DUR_SEC=12 ./voice-clone/clone_voice.sh file.mp3`
- Kalau ada musik di belakangnya, pisahin vokalnya dulu:
  `pip install demucs && demucs --two-stems=vocals file.mp3` → pakai `separated/htdemucs/file/vocals.wav`
- Kalau transkrip otomatis salah, isi manual: `REF_TEXT="kata-kata di audionya" ./voice-clone/clone_voice.sh ...`
- Voicebox belum ada bahasa Indonesia, jadi script ini pake **Melayu (`ms`)** di
  Chatterbox Multilingual, yang paling mirip. Aksennya mungkin masih agak Malaysia.

## Penting

Clone suara orang lain cuma boleh kalau lu punya izin dari orangnya — lihat
[RESPONSIBLE_USE.md](https://github.com/jamiepine/voicebox/blob/main/RESPONSIBLE_USE.md) dari Voicebox.
Jangan dipakai buat nyamar jadi orang itu, nipu, atau diposting seolah-olah beneran dia yang ngomong.
