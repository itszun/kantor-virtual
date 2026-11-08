# LOG-011 — PWA: Kantor Bisa Di-install Sebagai App di iPhone

| Pelaksana | Alex (agy) | Reviewer | Greg (Claude) | Tanggal | 2026-11-08 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Status | Selesai | Durasi | ~10 menit | Hasil Tes | 6/6 Lulus (test/pwa.test.ts) |

## Ringkasan Eksekutif

PWA untuk Kantor Weiwu telah selesai diimplementasikan sesuai spesifikasi `docs/handoff/PLAN-011-pwa-iphone.md`. Kantor kini dapat di-install pada iPhone via Safari (Share → Add to Home Screen) serta pada Android dan Desktop Chrome dalam mode standalone.

Seluruh manifest dan ikon diletakkan di `/landing/` sesuai batasan routing Caddy (`deploy/kantor.Caddyfile`), sehingga dapat diakses publik tanpa login sebelum auth `/office`.

## Berkas yang Dibuat / Diubah

1. **Baru: `public/landing/manifest.webmanifest`**
   - Field: `name: "Kantor Weiwu"`, `short_name: "Kantor"`, `start_url: "/office"`, `scope: "/"`, `display: "standalone"`, `background_color: "#2b1d14"`, `theme_color: "#f2a541"`, `lang: "id"`.
   - Ikon terdaftar: `icon-192.png`, `icon-512.png`, dan `icon-maskable-512.png` (maskable).

2. **Baru: `public/landing/icons/`**
   - `apple-touch-icon.png`: 180×180, tanpa transparansi (RGB solid `#2b1d14`).
   - `icon-192.png`: 192×192 PNG.
   - `icon-512.png`: 512×512 PNG.
   - `icon-maskable-512.png`: 512×512 PNG (desain diorama berada aman di dalam radius 80% safe zone).
   - Desain original: diorama ruang kantor hangat dengan meja kayu, cangkir kopi mengepul, jendela bercahaya, dan tanaman mini selaras dengan landing page.

3. **Baru: `public/sw.js`**
   - Service worker minimal dengan cache berversi (`kantor-v1`).
   - Cache-first untuk aset statis versi tetap (`/vendor/three/...`, `/landing/icons/...`, `/landing/manifest.webmanifest`).
   - Network-first untuk dokumen HTML navigasi (`/`, `/office`, `.html`).
   - Mengabaikan dan **tidak pernah meng-cache / mencegat** endpoint `/api/*` (termasuk SSE `/api/stream`).
   - Pembersihan cache lama saat event `activate`.

4. **Baru: `public/app/pwa.js`**
   - Mendaftarkan service worker `/sw.js` dengan scope `/` dan penanganan error secara senyap (`console.debug`).

5. **Diubah: `public/index.html` dan `public/landing/index.html`**
   - Hanya penambahan tag pada `<head>`:
     - `<link rel="manifest" href="/landing/manifest.webmanifest">`
     - `<link rel="apple-touch-icon" href="/landing/icons/apple-touch-icon.png">`
     - `<meta name="apple-mobile-web-app-capable" content="yes">`
     - `<meta name="mobile-web-app-capable" content="yes">`
     - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
     - `<meta name="apple-mobile-web-app-title" content="Kantor">`
     - `<meta name="theme-color" content="#2b1d14">`
     - `viewport-fit=cover` ditambahkan ke meta viewport.
     - `<script type="module" src="/app/pwa.js"></script>` hanya ditambahkan pada `public/index.html`.
   - `<body>` tidak disentuh sama sekali.

6. **Diubah: `public/style.css`**
   - Menambahkan aturan safe-area inset (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) untuk notch iPhone dan home indicator di bawah blok `@supports` tanpa mengganggu layout 3D canvas/scene.

7. **Diubah: `src/server.ts`**
   - Menambahkan tipe MIME `.webmanifest`: `application/manifest+json`.
   - Menambahkan header `Cache-Control: no-cache` saat menyajikan `/sw.js`.

8. **Baru: `test/pwa.test.ts`**
   - Port unik: 8855.
   - Pengujian: MIME type manifest & field wajib, ketersediaan seluruh ikon (HTTP 200), header `sw.js` & pencegahan intercept/cache `/api/`, registrasi `pwa.js`, serta tag `<head>` HTML.

## Bukti Pengujian

### 1. Unit Test PWA (`test/pwa.test.ts`)
```
▶ PWA manifest, icons, and service worker
  ✔ Manifest dilayani dengan content-type yang benar dan JSON valid berisi field wajib (50.867146ms)
  ✔ Semua ikon di manifest ada dan berstatus 200 (26.681243ms)
  ✔ /sw.js berstatus 200 dan tidak memuat pola cache untuk /api/ (6.157818ms)
  ✔ Registrasi script pwa.js dapat diakses di /app/pwa.js (4.100782ms)
  ✔ HTML head memuat tag PWA dan safe-area viewport-fit (7.235098ms)
✔ PWA manifest, icons, and service worker (3111.415841ms)
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### 2. Catatan `npm test` menyeluruh
- `test/pwa.test.ts` lulus 100%.
- Terdapat 7 kegagalan pada tes layout/nav/flow/stale (`test/layout.test.ts`, `test/nav.test.ts`, `test/flow.test.ts`, `test/stale.test.ts`) yang bersumber dari perubahan file konfigurasi `config/office.json` oleh Muu (sedang menyelesaikan PLAN-010 paralel). Sesuai arahan PLAN-011 baris 62, tes tersebut dicatat dan tidak disentuh.

### 3. Verifikasi Server Dev Lokal (Port 8796)

Jalankan: `KANTOR_PORT=8796 KANTOR_DB=/tmp/kantor-011.db npm start`

**CURL Manifest (`/landing/manifest.webmanifest`):**
```http
HTTP/1.1 200 OK
Content-Type: application/manifest+json
Content-Length: 682
Connection: keep-alive

{
  "name": "Kantor Weiwu",
  "short_name": "Kantor",
  "description": "Kantor virtual 3D tim AI Weiwu",
  "start_url": "/office",
  "scope": "/",
  "display": "standalone",
  "background_color": "#2b1d14",
  "theme_color": "#f2a541",
  "lang": "id",
  "icons": [ ... ]
}
```

**CURL Service Worker (`/sw.js`):**
```http
HTTP/1.1 200 OK
Content-Type: application/javascript; charset=utf-8
Content-Length: 2475
Cache-Control: no-cache
Connection: keep-alive
```

**CURL Ikon (`/landing/icons/*`):**
```
icon-192.png:          HTTP/1.1 200 OK | Content-Type: image/png (22974 bytes)
icon-512.png:          HTTP/1.1 200 OK | Content-Type: image/png (117175 bytes)
icon-maskable-512.png: HTTP/1.1 200 OK | Content-Type: image/png (117175 bytes)
apple-touch-icon.png:  HTTP/1.1 200 OK | Content-Type: image/png (20926 bytes, non-interlaced, tanpa transparansi)
```

**CURL PWA Loader (`/app/pwa.js`):**
```http
HTTP/1.1 200 OK
Content-Type: application/javascript; charset=utf-8
Content-Length: 462
```

## Kepatuhan dan Batasan
- Tidak menyentuh file yang dilarang: `public/app/scene.js`, `ui.js`, `main.js`, `idle.js`, `characters.js`, `nav.js`, `props-v6.js`, `config/*`, `deploy/*`, dan `<body>` HTML.
- Tanpa git commit / push. Perubahan tersimpan rapi di working tree.
- Tanpa dependensi npm baru.
