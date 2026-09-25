# NgotakStream Qx

Aplikasi streaming Android (React Native + Expo, Hermes, New Architecture) oleh **QxShaa**.

- Package: `id.qxshaa.ngotakstreamqx`
- Versi: 1.0.3 (versionCode 193), minSdk 24, targetSdk 36

## Struktur

| Path | Isi |
|---|---|
| `src/` | Kode aplikasi (TypeScript/React Native) |
| `src/lib/adult/`, `src/screens/adult/` | Bagian Hentai (terkunci dengan key per perangkat) |
| `native-src/android/id/qxshaa/ngotakstreamqx/` | Modul native Kotlin (DoH, HTTP download, torrent, thumbnail) |
| `plugins/` | Config plugin Expo (dipakai saat prebuild) |
| `android/` | Proyek native Android hasil `expo prebuild`, bisa langsung dibuka di Android Studio |
| `assets/` | Ikon, splash, font, gambar |

## Menjalankan

```bash
npm install            # postinstall menjalankan patch-package
npm run build:sandbox  # generate src/lib/sandbox/generated
npm run prebuild       # regenerate folder android/ (opsional, sudah ada di repo)
npm run android        # build + install debug
```

Buka folder `android/` di Android Studio (butuh JDK 17+ dan Android SDK 36).
Setelah `npm install`, Gradle akan sync otomatis.

Build release butuh keystore `ngotakstreamqx-key.keystore` di root repo (lihat `plugins/with-android-signing.js`).

## Lisensi

Apache-2.0. Turunan dari AirFlix dan Vega App, lihat `NOTICE` dan `THIRD_PARTY_NOTICES.md`.
