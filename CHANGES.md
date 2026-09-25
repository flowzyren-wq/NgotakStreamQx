# CHANGES — NgotakStream Qx (rekonstruksi dari APK v1.0.3)

## Sumber & metode

- **APK:** `NgotakStreamQx-arm64-v8a-v1.0.3-fixed.apk` (59 MB, SHA-256 `660955d6…4c966a1b`).
  - Package `id.awoshaaqx.ngotakstreamqx`, versionCode 193, minSdk 24, targetSdk 36, arm64-v8a.
  - Hasil `unzip -t` dan `aapt2 badging`: valid.
- **Framework:** terdeteksi dari isi APK, bukan diasumsikan.
  - React Native 0.86 dengan Expo SDK 57 (New Architecture, React Compiler).
  - JS bundle berupa Hermes bytecode v98 (`assets/index.android.bundle`).
  - DEX berisi RN/Expo, modul Kotlin kustom, Media3, Cast dan libtorrent4j.
- **Garis keturunan:** isi bundle cocok dengan AirFlix (d0x-dev, commit `0779d7c`), yang merupakan turunan Vega App.
  - Hasil perbandingan per modul setelah AirFlix di-compile ke Hermes dengan konfigurasi yang sama: **SAME 2149, DIFF 85, NEW 23 modul**.
  - Basis kode diambil dari source AirFlix. Semua modul yang DIFF atau NEW di-port ulang dari hasil decompile Hermes (`hermes-dec`, ditambah disassembly untuk body class).
  - Tidak ada fitur yang dikarang. Tiap file hasil port mengikuti logika, string, style dan urutan render di APK.

## Ringkasan perubahan

### Rekonstruksi dari APK (DIFF/NEW)

- **Bagian Hentai/Adult (baru):**
  - `src/lib/adult/`: `access`, `crypto`, `registry`, `registryBlob`, `scraper`, `http`, `parse`, `service` dan `types`. Termasuk verifikasi key per perangkat (tweetnacl) dan registry situs terenkripsi.
  - `src/screens/adult/`: `AdultSection`, `AdultBrowse`, `AdultRail`, `AdultSearchPanel` dan `AdultLockedPanel`.
- **Tema:** `SettingsStorage`, `themeProfiles`, `themeStore`, `M3ThemeProvider`, `Appearance`, `AppearancePreference`, `ColorField`, `ThemeEditorSheet`, `ThemeStudio`.
- **Player:** `Player`, `useStream`, `CastRemotePlayer`.
- **Home:** `Home`, `Hero`, `Info`, `EpisodeRowContent`, `ContentOverview`, `SearchSubtitles`, `WatchList`, `Downloads`, `Search`, `AmbientBackground`.
- **Settings:**
  - `Settings` (updater dihapus, sesuai APK), `Preference`, `Surface`, `SettingsSection`, `SettingsRow`, `SquareSettingsCard`;
  - `Extensions`, `ProviderSourceManager`, `ExtensionManager` (default ke provider `valorafilm`), `builtinAirflix`;
  - halaman `About` yang baru.
- **Statistik:** 4 file Stats, `AnimatedTabIconParts`, route `stats`.
- **Lain-lain:** `downloadManager`, `Notification` (tanpa apk-installer/update), `GlobalErrorBoundary`, `client.ts`.
- **`App.tsx`:** route `AdultSection` dan Stats, serta pemilihan provider awal `valorafilm` saat pertama kali init.
- **Aset dari APK:** `hentai_icon.png`, `icon_transparent.png`, logo bootsplash (byte-identik) dan ikon launcher di `android/.../mipmap-*` (byte-identik).

### Rebranding (NgotakStream Qx / QxShaa)

- **Package:** `id.qxshaa.ngotakstreamqx`; varian Play Store memakai `….play`.
  - Scheme `ngotakstreamqx`, slug `ngotakstream-qx`, versi 1.0.3 (193), minSdk 24.
- **Modul native Kotlin:** dipindah ke `native-src/android/id/qxshaa/ngotakstreamqx/`.
  - Plugin (`custom-native-modules`, `proguard`, `saf-copy`, `uri-permission`, `dynamic-launcher-splash`) ikut diperbarui.
- **Nama event native:** `AirflixHttpDownload*` diganti `NgotakHttpDownload*`, di Kotlin dan TS sekaligus.
- **Storage/prefs:** `airflix-*` diganti `ngotakstreamqx-*`. Ini mencakup downloads storage, sync keys, notification group dan shared prefs.
- **Sync:** `AIRFLIX_SYNC_*` / `AirflixSyncManifest` diganti `NGOTAK_SYNC_*` / `NgotakSyncManifest`; direktori `.ngotakstreamqx-sync`.
- **Log:** `[AirflixSync]` diganti `[NgotakSync]`.
- **About:** kredit developer **QxShaa**; toast "Built with love by QxShaa"; fallback package ikut baru.
- **UI/meta:** nama app dan `appName` Gradle jadi "NgotakStream Qx"; teks TMDB key, nama keystore, `constants.ts` dan origin YouTube embed juga diganti.
- **Ikon:** `icon.png`, `adaptive_icon.png`, `splash.png` dan logo bootsplash yang tadinya logo AirFlix diganti artwork NgotakStream Qx dari APK.

### Struktur, dependensi & build

- **Dihapus** (tidak ada di APK dan tidak dipakai): `expo-updates`, `@himanshu8443/react-native-apk-installer` beserta patch-nya, `expo-video-thumbnails`, `GitHubStarButton`.
- **Ditambah:** `tweetnacl` (dipakai bagian Adult). `package-lock.json` sudah diperbarui.
- **`android/`:** hasil `expo prebuild` sekarang di-commit, jadi bisa langsung dibuka di Android Studio. Namespace dan applicationId adalah `id.qxshaa.ngotakstreamqx`.
- **TypeScript:** `tsc --noEmit` lolos dengan **0 error**.
- **Jest:** 148/152 test lolos. Test yang mengacu ke API lama AirFlix sudah disesuaikan dengan APK. Sisa 4 test yang gagal, dan 5 suite yang tidak bisa jalan karena ESM `expo-modules-core`, juga sudah gagal di source AirFlix asli; penyebabnya lingkungan test atau ekspektasi upstream, bukan perubahan di sini.
- **Dokumen:** `README.md`, `NOTICE` (atribusi AirFlix dan Vega, Apache-2.0) dan `THIRD_PARTY_NOTICES.md`. `LICENSE` Apache-2.0 tetap dipertahankan.
- **Dibersihkan:** folder kerja decompile `_work/` dan workflow fetch APK.

## Bagian yang TIDAK bisa dipulihkan / catatan

1. **Nama file dan path asli** untuk modul yang NEW (Adult, Stats, dll.) tidak tersimpan di bundle Hermes. Nama file dan folder dipilih sendiri.
2. **Komentar dan tipe TypeScript** hilang saat kompilasi. Tipe berikut direkonstruksi dari cara pemakaiannya:
   - `ThemeProfile`, `ThemeColorKey`;
   - semua tipe Adult dan Props.
3. **Nama variabel lokal dan helper** sebagian besar ditebak dari konteks.
4. **Ambiguitas yang dipilih secara wajar:**
   - urutan array di `saveProfile`;
   - family ikon yang ambigu;
   - alpha border chip di Settings;
   - `typeof` di `getDeviceCode` dan `pickBest`: decompiler menampilkan `boolean`/`bigint`, tetapi dipakai sebagai `string`/`number` sesuai penggunaannya.
5. **Body class** dipulihkan dari disassembly karena decompiler melewatinya.
6. **Kode native Java/Kotlin template** (`MainActivity`, `MainApplication`, Gradle) berasal dari template Expo lewat prebuild, bukan dari DEX. DEX hasil R8 tidak bisa dikembalikan ke source yang rapi.
7. **Gambar hasil turunan, tidak byte-identik:**
   - `icon_transparent.png` diambil dari res yang sudah dikompilasi;
   - `icon.png`, `splash.png` dan logo bootsplash iOS dibuat dari logo APK yang di-resize.
8. **Ikon notifikasi `ic_notification`** tidak ada di resource APK. Ikon generik yang lama dipakai (tidak mengandung branding).
9. **Build APK dan uji jalan di perangkat** tidak dilakukan, sesuai permintaan. Tidak ada JDK/Android SDK di sandbox.
10. **Dibiarkan apa adanya karena fungsional atau atribusi:**
    - identifier `builtinAirflix` (paket provider pihak ketiga dari AirFlix);
    - pengecekan URL `airflix-providers` (migrasi sumber lama);
    - URL provider `B7ByteMe/valorafilm-providers`;
    - komentar asal port di `urlGuard.ts`.
11. **Bug bawaan APK yang dipertahankan:**
    - Import tema di ThemeStudio memakai `readAsStringAsync` dari API baru `expo-file-system`, yang di sana hanya stub legacy, sehingga import selalu gagal. Perbaikannya: import dari `expo-file-system/legacy`.
    - Tipe `fullscreenOrientation: 'default'` di Player diberi cast.
