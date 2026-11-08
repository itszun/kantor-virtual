# PLAN-011 — PWA: kantor bisa di-install sebagai app di iPhone

| Pelaksana | **Alex** (agy) | Reviewer | Greg (Claude) | Batas | 15 menit |
| :-- | :-- | :-- | :-- | :-- | :-- |

Baca `GEMINI.md` terlebih dahulu. **PLAN-010 sedang dikerjakan paralel oleh Muu** di working tree yang sama. Patuhi batas file di bawah supaya tidak bentrok.

## Tujuan

Pemilik membuka `https://kantor.weiwu.my.id` di Safari iPhone, memilih **Share → Add to Home Screen**, lalu mendapat ikon "Kantor Weiwu". Saat dibuka dari ikon itu, kantor tampil layar penuh (standalone) tanpa bar Safari. Android dan desktop Chrome juga harus bisa melakukan install.

## Kendala routing (jangan diubah, cukup dipatuhi)

Caddy (`deploy/kantor.Caddyfile`) mengatur akses sebagai berikut:
- Hanya `/` dan `/landing/*` yang publik.
- Path lain, termasuk `/office`, `/app/*`, dan `/api/*`, berada di balik basic auth.
- `/api/events` diblok.

Karena itu:
- **Manifest dan ikon wajib ditaruh di `/landing/`** supaya bisa diambil tanpa login.
- `start_url` adalah `/office`. Pemilik akan diminta basic auth saat pertama kali membuka app, dan itu dapat diterima.

## File yang BOLEH diubah atau dibuat

- Baru: `public/landing/manifest.webmanifest`
  - `name` "Kantor Weiwu", `short_name` "Kantor", `start_url` "/office", `scope` "/", `display` "standalone".
  - `background_color` dan `theme_color` mengikuti palet landing (`#2b1d14` / `#f2a541`).
  - `lang` "id". Ikon 192, 512, dan maskable 512.
- Baru: `public/landing/icons/`
  - `apple-touch-icon.png` (180×180, tanpa transparansi), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
  - Desain original: kotak hangat berisi mug kopi atau jendela kantor kecil bergaya diorama, selaras dengan `public/landing/index.html`.
  - Boleh dibuat oleh subagent image-generator kamu (Agy Artist) atau secara programatik, misalnya HTML/canvas yang dirender dengan `google-chrome --headless --screenshot`.
  - Tanpa logo atau merek pihak lain, dan tanpa dependensi baru.
- Baru: `public/sw.js`, service worker minimal:
  - Cache-first hanya untuk aset statis versi tetap (`/vendor/three/...`, ikon, font lokal bila ada).
  - Network-first untuk HTML.
  - **Jangan pernah** meng-cache atau mencegat `/api/*`, terutama SSE `/api/stream`.
  - Nama cache diberi versi, misalnya `kantor-v1`. Hapus cache lama saat `activate`.
- Baru: `public/app/pwa.js`, berisi registrasi SW (`navigator.serviceWorker.register('/sw.js', { scope: '/' })`) dan penanganan error yang senyap.
- `public/index.html` dan `public/landing/index.html`: **hanya tambahan di dalam `<head>`**:
  - `<link rel="manifest" href="/landing/manifest.webmanifest">`
  - `<link rel="apple-touch-icon" href="/landing/icons/apple-touch-icon.png">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="Kantor">`
  - `<meta name="theme-color" ...>`
  - Tambahkan juga `<script type="module" src="/app/pwa.js"></script>`, hanya di `public/index.html`.
- `public/index.html`: viewport tambahkan `viewport-fit=cover`. Bila perlu, tambahkan padding safe-area (`env(safe-area-inset-*)`) **di `public/style.css` saja**, dengan selector baru yang tidak mengganggu layout scene.
- `src/server.ts`: hanya menambah entri `MIME_TYPES` untuk `.webmanifest` (`application/manifest+json`). Pastikan `/sw.js` dilayani dengan `Cache-Control: no-cache`, cukup lewat perubahan minimal di handler statis.
- Baru: `test/pwa.test.ts`, dengan port unik yang belum dipakai tes lain. Isinya:
  - Manifest dilayani dengan content-type yang benar dan JSON valid berisi field wajib.
  - Semua ikon di manifest ada dan berstatus 200.
  - `/sw.js` berstatus 200 dan tidak memuat pola cache untuk `/api/`.

## File yang DILARANG disentuh

`public/app/scene.js`, `ui.js`, `main.js`, `idle.js`, `characters.js`, `nav.js`, `props-v6.js`, `config/*`, `deploy/*`, dan isi `<body>` HTML. File-file ini sedang dikerjakan Muu atau di luar lingkup tugas ini.

## Bukti

- `npm test` hijau. Bila ada tes yang merah di file milik Muu (PLAN-010), catat saja di LOG dan jangan memperbaikinya.
- Jalankan server lokal di port 8796 (`KANTOR_PORT=8796 KANTOR_DB=/tmp/kantor-011.db npm start`). Jangan pakai 8790, karena itu produksi.
- `curl` manifest, ikon, dan `sw.js`, lalu tulis hasilnya di LOG.
- Tulis `docs/handoff/LOG-011-pwa-iphone.md`.
- Tanpa commit dan tanpa docker compose.
