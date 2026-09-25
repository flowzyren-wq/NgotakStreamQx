# Taruh file suara di sini / drop the reference audio here

Upload lewat **web GitHub** (nggak perlu git, bisa dari HP):

1. Buka <https://github.com/flowzyren-wq/NgotakStreamQx/upload/main>
2. Drag / pilih file mp3-nya
3. Di kolom path tulis: `voice-cloning/incoming/`
4. Klik **Commit changes**
5. Bilang ke gw di chat: "udah keupload" (atau kasih tau nama filenya)

File-nya cuma 300 KB, jadi aman buat repo (batas GitHub 100 MB per file).

Abis itu gw fetch repo-nya (`git fetch`) terus render kloningnya — pakai
`voice-cloning/scripts/render_variants.py`, yang hasilnya 4 versi pelafalan:

- `it_aswritten` — fonologi Italia, teks apa adanya
- `en_respell`  — ejaan Inggris hasil turunan IPA (`pooseeng gweh kahmpruht`)
- `it_respell`  — ejaan Italia hasil turunan IPA
- `espeak_id`   — suara Indonesia asli espeak-ng (buat pembanding, tanpa kloning)

Catatan: gw **nggak bisa** ambil file dari MediaFire / Google Drive / Dropbox —
sandbox gw cuma bisa akses github.com, pypi.org, dan npmjs.org. Dari GitHub
bisa, karena repo lu publik.
