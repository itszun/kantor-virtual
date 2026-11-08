# PLAN-013 — UX/UI mobile: navigasi app-like untuk PWA iPhone

| Pelaksana | **Windry** (agy) | Reviewer | Greg (Claude) | Batas | 25 menit |
| :-- | :-- | :-- | :-- | :-- | :-- |

Baca `GEMINI.md` terlebih dahulu. Skill yang dipakai: `threejs-game-ui-designer` dan `graphify`.

**Lokasi kerja.** Kamu bekerja di **git worktree terpisah**: `/tmp/claude-1001/-home-clouduser/4f678e92-7b98-5bfe-8c49-65b976bf7131/scratchpad/kantor-windry`, branch `windry/ux-mobile`. Jangan menyentuh `~/Projects/kantor` karena Alex sedang bekerja di sana (PLAN-012). Nanti Greg yang melakukan merge.

## Masalah (feedback pemilik dari PWA iPhone)

Pemilik membuka kantor sebagai app di iPhone (standalone, 390×844 pt). Masalahnya:
- Navigasinya terlalu sederhana karena hanya bisa di-scroll satu halaman panjang.
- Tampilan kurang compact. Header dan subtitle memakan ruang. Empat kartu statistik 2×2 memakan ±⅓ layar. Diorama 3D mengambang di area kosong yang besar. Kartu persona dan tab riwayat tertimbun jauh di bawah.

## Tujuan: rasa "app", bukan halaman web

Di lebar **< 900 px**:

1. **App bar compact** (±48 px + safe-area-inset-top):
   - Isi: nama "Kantor Weiwu", titik status live, dan jam.
   - Subtitle disembunyikan di mobile.
2. **Statistik menjadi satu baris chip ringkas** (Status · Delegasi · Aktif · Token). Tinggi ≤ 44 px, boleh di-scroll horizontal. Tap chip Token membuka tampilan Token.
3. **Bottom tab bar** bergaya iOS:
   - Tetap di bawah, memakai `env(safe-area-inset-bottom)`, ikon dan label kecil, target sentuh ≥ 44 px.
   - Empat tampilan: **Kantor** (3D) · **Tim** (kartu persona) · **Aktivitas** (Riwayat / Tugas Greg / Aktivitas) · **Token** (Token + Director).
   - Tiap tampilan mengisi tinggi layar penuh dengan scroll sendiri. Body tidak di-scroll.
4. **Tampilan Kantor:**
   - Kanvas 3D mengisi seluruh ruang di antara app bar dan tab bar (`100dvh` dikurangi keduanya), tanpa area kosong.
   - Di bagian bawah kanvas ada strip avatar persona kecil, mengambang semi-transparan dengan titik status.
   - Tap avatar membuka **bottom sheet** berisi kartu persona itu (status, tugas sekarang, mesin). Bila tersedia, kamera juga difokuskan ke zona persona lewat `window.kantorScene?.focusZone(zoneId)`, dengan `zoneId` diambil dari `config.spots[spot].zone`. Bila API tidak ada, jangan menimbulkan error.
   - **Sisakan slot kosong** `<div id="zone-chips-slot"></div>` di bagian atas kanvas, karena Alex sedang membuat chip zona dan tombol "Lihat semua" di PLAN-012. Jangan membuat chip zona sendiri.
   - Ubah teks petunjuk mobile menjadi "Seret untuk memutar · cubit untuk zoom". Petunjuk itu hilang setelah interaksi pertama.
5. **Tampilan Tim:** daftar kartu persona yang compact (satu kolom, 1 baris status + 1 baris tugas). Tidak ada lagi kartu yang terpotong di kanan layar.
6. **Status tab** disimpan di URL hash (`#kantor`, `#tim`, `#aktivitas`, `#token`) agar mudah di-screenshot dan tombol back berfungsi.

Di **≥ 900 px** (desktop), pertahankan layout split yang ada. Ubahan yang boleh: header sedikit lebih compact. Jangan ada regresi.

Gaya visual:
- Selaras dengan landing (hangat, `#2b1d14` / `#f2a541`) dan tetap bersih.
- Satu set token warna di `:root`.
- Tanpa framework dan tanpa dependensi baru.
- Animasi ringan (transform/opacity) dengan `prefers-reduced-motion`.
- Semua teks UI dalam Bahasa Indonesia.

## File

- **Boleh diubah:** `public/index.html` (`<body>` dan `<head>` seperlunya), `public/style.css`, `public/app/ui.js`, `public/app/main.js` (hanya wiring UI), dan file baru `public/app/shell.js` untuk tab, sheet, dan hash routing.
- **Dilarang:** `public/app/scene.js`, `characters.js`, `idle.js`, `nav.js`, `props-v6.js`, `director-client.js`, `public/sw.js`, `public/app/pwa.js`, `public/landing/*`, `config/*`, `src/*`, `deploy/*`.
  - Bila kamu memerlukan `window.kantorScene`, cukup ekspos instance scene yang sudah ada dengan satu baris di `main.js`.
- Pertahankan semua `id` elemen yang dipakai `ui.js` (stat-*, history-list, persona-cards-container, dll.) atau perbarui referensinya secara konsisten.

## Bukti

- `npm test` hijau. Tulis jumlah tes di LOG.
- Jalankan server lokal dari worktree: `KANTOR_PORT=8798 KANTOR_DB=/tmp/kantor-013.db npm start`.
  - **Jangan pakai 8790** (produksi) dan jangan pakai 8797 (dipakai Alex).
  - Matikan server lewat PID-nya sendiri, jangan `pkill` umum.
- Ambil screenshot dengan `timeout 60 node tools/shot-cdp.mjs "http://127.0.0.1:8798/index.html?demo=1#<tab>" <out> <w> <h> 6000`. Simpan ke `docs/handoff/shots/013-*.png` di worktree untuk:
  - 390×844: kantor, tim, aktivitas, token
  - 1440×900: kantor
- Tulis `docs/handoff/LOG-013-ux-mobile-pwa.md` berisi keputusan desain, daftar perubahan, dan sisa pekerjaan.
- Tanpa commit dan tanpa docker compose.
