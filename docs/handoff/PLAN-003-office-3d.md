# PLAN-003 — Ruangan kantor 3D + karakter + perilaku santai bawaan

| Ukuran | M (target < 25 menit) | Branch | `feat/003-office-3d` | Status | Siap dikerjakan |
| :-- | :-- | :-- | :-- | :-- | :-- |

## 1. Tujuan
Setelah tugas ini, membuka `/` di browser HP menampilkan kantor 3D isometrik yang hidup: 4 karakter (Greg, Betty,
Alex, Windry) berjalan di antara lounge, pantry kopi, TV, jendela, dan meja; ngobrol dengan bubble; dan dengan
`/?demo=1` karakter bergantian "dapat tugas", berjalan ke mejanya, duduk, monitornya menyala. **Belum** terhubung
ke data live (itu PLAN-004); panel bawah memakai data contoh.

## 2. Konteks & rujukan
- Baca dulu: `GEMINI.md`, TSD §2 (warna persona), §6, §8. `config/personas.json` (sudah ada).
- Gaya visual: low-poly, bersih, terang, hangat (lantai kayu terang, dinding krem, aksen tanaman), sudut kamera
  isometrik dari depan-atas seperti diorama. Buat sendiri secara prosedural (BoxGeometry, CylinderGeometry,
  CapsuleGeometry, SphereGeometry); **tanpa** file model/tekstur dari internet.
- Frontend = **JavaScript ESM biasa** di `public/app/*.js` (browser tidak bisa menjalankan TypeScript). Three.js dari
  npm (`three@0.187.0`, pin persis) disajikan lewat importmap: `"three": "/vendor/three/build/three.module.js"`,
  `"three/addons/": "/vendor/three/examples/jsm/"`.

## 3. Batas scope
**Boleh diubah/dibuat:** `package.json` (dependensi `three` pin persis `0.187.0`), `package-lock.json`,
`config/office.json`, `config/idle-lines.json`, `public/**`, `src/server.ts` (hanya 2 rute baru di langkah 3),
`test/office.test.ts`, `test/nav.test.ts`, `docs/handoff/LOG-003-office-3d.md`.

**Tidak boleh disentuh:** `src/` selain rute di langkah 3, `tools/**`, `~/.claude/**`, `docs/TSD-*`.

## 4. Langkah yang diharapkan
1. Tulis kerangka LOG-003 dulu. `npm install three@0.187.0 --save-exact`.
2. **`config/office.json`**: ukuran lantai (mis. 20 × 12 unit), daftar furnitur (jenis + posisi + rotasi), dan
   **spot** bernama dengan koordinat `[x, z]` + arah hadap:
   `desk_greg`, `desk_betty`, `desk_alex`, `desk_windry` (kursi di depan meja masing-masing), `lounge_1..4`
   (sofa/kursi santai), `coffee` (pantry), `tv`, `window_1`, `window_2`, `whiteboard`, `door`.
   Plus **graf waypoint** (`nodes` + `edges`) yang menghubungkan semua spot tanpa menembus furnitur.
   `config/idle-lines.json`: per persona 8–12 kalimat santai Bahasa Indonesia gaul-sopan yang cocok dengan perannya
   (Greg pemimpin, Betty administratif/Drive, Alex teknis, Windry taktis), plus 6–10 pasangan dialog dua orang.
3. **Server** (`src/server.ts`, minimal): `GET /api/office` → `{office, idle_lines, personas}` dari `config/`;
   `/vendor/three/*` → file dari `node_modules/three/` **hanya** di bawah `build/` dan `examples/jsm/`
   (cegah traversal, content-type JS benar).
4. **`public/index.html` + `public/style.css`** (mobile-first, mirip tata letak contoh, teks Bahasa Indonesia):
   - Kartu header: **"Kantor Weiwu"** · "Tim AI" + subjudul "Semua santai ☕ — otomatis kembali kerja saat ada tugas."
   - Baris stat 4 kolom: Status (titik hijau "Live · HH:MM"), Delegasi hari ini, Aktif sekarang, Token hari ini (+ biaya kecil di bawahnya).
   - Kanvas 3D (tinggi ~55% layar di HP), label nama + peran berwarna persona di atas kepala, bubble putih membulat.
   - Kartu persona yang bisa digeser horizontal (avatar huruf berwarna, nama, peran, badge status "Santai"/"Kerja", aktivitas, "aktif terakhir …").
   - Tab: **Riwayat · Tugas Greg · Aktivitas · Token** (konten contoh).
   - Desktop: kanvas lebih lebar, panel di samping/bawah; tetap rapi.
5. **`public/app/`** (modul terpisah, kecil-kecil):
   - `scene.js`: renderer (antialias, `setPixelRatio(min(devicePixelRatio,2))`), `OrthographicCamera` isometrik, cahaya hemisfer + directional dengan bayangan lembut, ruangan: lantai kayu (garis papan via CanvasTexture), 2 dinding, 2 jendela dengan siluet kota, 4 meja + kursi + 2 monitor tiap meja (layar = material emisif yang bisa dinyalakan warna persona), 2 whiteboard (CanvasTexture berisi tulisan "Delegasi terbaru" dan "Tugas Greg"), lounge (sofa, meja kopi bundar, karpet bundar), TV di dinding dengan layar berwarna, pantry kopi, 4–6 tanaman pot. `OrbitControls` terbatas (pan & zoom, rotasi dikunci kecil). Resize responsif.
   - `characters.js`: karakter dari primitif (badan kapsul warna persona, kepala bola warna kulit, rambut sederhana berbeda tiap persona, kaki dua silinder). Animasi: jalan (ayun kaki + bob), duduk (turun + kaki menekuk), idle bernapas. `CSS2DRenderer` untuk label (nama · peran, warna persona) dan bubble (muncul 4–6 detik, maks 80 karakter).
   - `nav.js` (**tanpa import three**, supaya bisa dites di Node): `shortestPath(graph, fromSpot, toSpot)` (Dijkstra/A*), `nearestNode`.
   - `idle.js`: perilaku santai bawaan: tiap karakter idle memilih aktivitas acak berbobot (duduk di lounge, ngopi, nonton TV, lihat jendela, jalan ke whiteboard), sesekali dua karakter idle bertemu dan bergantian bicara memakai pasangan dialog. Satu spot hanya satu karakter.
   - `director-client.js`: antarmuka `applyState(snapshot)` — persona `working` → batalkan aktivitas santai, jalan ke `desk_<id>`, duduk, nyalakan monitor, bubble = judul tugas; kembali `idle` → matikan monitor, jalan ke lounge. Dipakai `?demo=1` sekarang dan SSE di PLAN-004.
   - `ui.js`: isi panel & tab dari objek snapshot (data contoh bila demo).
   - `main.js`: rakit semua; `?demo=1` → tiap 20–40 detik acak satu persona mulai/selesai tugas contoh.
   - Fallback: bila WebGL tidak tersedia, sembunyikan kanvas, tampilkan pesan + panel.
6. Performa: target 60 fps di HP menengah; batasi bayangan (satu shadow map 1024), `requestAnimationFrame` berhenti saat tab tersembunyi.
7. Tes Node: `test/nav.test.ts` (jalur antar semua pasangan spot ada; tidak ada edge ke node tak dikenal); `test/office.test.ts` (`/api/office` 200 berisi 4 persona & semua spot `desk_<id>`; `/vendor/three/build/three.module.js` 200 dengan content-type JavaScript; `/vendor/three/../package.json` dan `/vendor/three/src/...` 404).
8. **Bukti visual**: jalankan server sementara (port 8793, token file temp) lalu ambil screenshot dengan Chrome headless:
   `google-chrome --headless=new --no-sandbox --enable-unsafe-swiftshader --use-angle=swiftshader --hide-scrollbars --window-size=430,932 --virtual-time-budget=8000 --screenshot=docs/handoff/shots/003-mobile.png "http://127.0.0.1:8793/?demo=1"` dan versi desktop `--window-size=1440,900` → `003-desktop.png`. Lihat hasilnya sendiri dan perbaiki bila kosong/rusak. Hentikan server via PID.

## 5. Kriteria selesai
- [ ] `npm test` lulus (tes lama + baru); output asli di LOG.
- [ ] Dua screenshot ada di `docs/handoff/shots/` dan memperlihatkan ruangan, 4 karakter berlabel, dan panel.
- [ ] Tidak ada error di console browser (jalankan Chrome headless dengan `--enable-logging=stderr --v=0` dan tempel baris error, bila ada, di LOG).
- [ ] Satu-satunya dependensi baru: `three` 0.187.0 (pin persis).

## 6. Larangan (selalu berlaku)
- Patuhi `GEMINI.md` §1. Tanpa CDN/aset dari internet saat runtime; semua dari server sendiri.
- Jangan menyalin aset/gaya produk lain; desain sendiri.
- Hentikan proses yang kamu jalankan sendiri memakai PID; jangan `pkill -f`.

## 7. Keluaran
`docs/handoff/LOG-003-office-3d.md` dari `_TEMPLATE_LOG.md`, plus screenshot.
