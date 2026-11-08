# PLAN-012 — Sisa PLAN-010: papan zona, UI fokus zona, anggaran draw call

| Pelaksana | **Alex** (agy, menggantikan Muu) | Reviewer | Greg (Claude) | Batas | 20 menit |
| :-- | :-- | :-- | :-- | :-- | :-- |

Baca dulu:
- `GEMINI.md`
- `docs/handoff/PLAN-010-floorplan-v6-greybox.md`, yang memuat kontrak koordinat dan anggaran.
- `docs/handoff/LOG-010-floorplan-v6-greybox.md`, yang memuat status dan sisa pekerjaan.

Gunakan skill `kantor-office-3d`, `threejs-debug-profiler`, `threejs-camera-direction`, `threejs-game-ui-designer`, dan `graphify`.

Kondisi awal: commit `b85a9fc`, `npm test` 72/72 hijau. Navgraph dan `config/office.json` sudah tervalidasi. **Jangan ubah posisi spot, node, atau furnitur** kecuali `npm test` tetap hijau dan alasannya ditulis di LOG.

## Tugas

1. **Papan nama zona harus terlihat** di 1440×900 dan 390×844.
   - Kondisinya sekarang: `addZoneLabel` di `public/app/scene.js` membuat papan rebah di tepi selatan zona, tetapi papan tidak tampak di screenshot.
   - Cari penyebabnya: texture, ukuran, z-fighting dengan lantai, `transparent`, atau `renderOrder`.
   - Teks Bahasa Indonesia harus terbaca di mobile. Tap atau klik papan memanggil `focusZone` (sudah ada raycast).
2. **UI fokus zona:**
   - Tambahkan daftar zona yang ringkas (chip atau dropdown) di atas atau bawah kanvas 3D, plus tombol **"Lihat semua"** yang memanggil `showOverview()`.
   - Label diambil dari `config.zones`, jangan di-hardcode.
   - Elemen DOM baru boleh ditambahkan di `public/index.html` beserta CSS-nya di `public/style.css`. Logikanya di `public/app/ui.js` atau `main.js`.
   - Harus nyaman di 390×844: target sentuh ≥40 px dan tidak menutupi karakter.
3. **Anggaran draw call: ≤150, termasuk shadow pass, di 390×844.** Saat ini ±180.
   - Gabungkan geometri dinding dan lantai per material (`BufferGeometryUtils.mergeGeometries` dari `three/addons`, yang sudah tersedia di vendor three) atau pakai `InstancedMesh` untuk prop berulang.
   - `castShadow` hanya untuk karakter dan prop besar.
   - Catat angka sebelum dan sesudah dari `#kantor-debug-dump` di LOG.
4. Jangan menyentuh `public/sw.js`, `public/app/pwa.js`, `public/landing/*`, `src/*`, `deploy/*`, dan `config/*` (kecuali sesuai catatan di atas).

## Bukti

- `npm test` hijau. Tulis jumlah tes di LOG.
- Server lokal: `KANTOR_PORT=8797 KANTOR_DB=/tmp/kantor-012.db npm start`. **Jangan pakai port 8790** (produksi). Matikan server itu lewat PID-nya sendiri setelah selesai.
- Screenshot dengan `timeout 60 node tools/shot-cdp.mjs "http://127.0.0.1:8797/index.html?demo=1&debug=1" <out> <w> <h> 6000`. Simpan ke `docs/handoff/shots/012-*.png`:
  - desktop 1440×900
  - mobile 390×844 overview
  - mobile 390×844 fokus satu zona (boleh lewat parameter URL debug, misalnya `&zone=workroom`, bila kamu tambahkan)
- Tulis `docs/handoff/LOG-012-v6-sisa-greybox.md`, berisi:
  - perubahan
  - angka draw call sebelum dan sesudah
  - sisa pekerjaan
- Tanpa commit dan tanpa docker compose.
