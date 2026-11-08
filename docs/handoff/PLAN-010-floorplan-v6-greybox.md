# PLAN-010 — Floorplan v6: zona 3×3, greybox, navgraph tervalidasi

| Pelaksana | **Muu** (Codex CLI) | Reviewer | Greg (Claude) | Batas | ±45 menit kerja agen |
| :-- | :-- | :-- | :-- | :-- | :-- |

Referensi wajib dibaca: `GEMINI.md` (aturan), `docs/FLOORPLAN-V6-SKYLINE-WEIWU.md` (zonasi & spot persona),
gambar `docs/assets/kantor_weiwu_floorplan_v6.jpg`, skill `kantor-office-3d` dan `graphify`.
Konteks review: `docs/handoff/PLAN-009-3d-interior-assets-v5-v6.md` (pemilik memutuskan langsung ke v6, lewati v5).

## Tujuan

Mengubah kantor dari satu ruangan besar menjadi **9 zona v6** yang terbaca jelas. Rinciannya:
- Tiap zona punya lantai, dinding rendah, pintu, dan papan nama zona.
- Furnitur yang sudah ada dipindahkan ke zona yang benar.
- Zona baru diisi prop sederhana (*greybox* yang rapi, belum dipoles).
- Karakter berjalan antar-zona lewat pintu tanpa menembus dinding atau perabot.

Pemolesan prop per zona dikerjakan di PLAN berikutnya.

## Kontrak koordinat (wajib)

- Satuan meter. Lantai di y=0. **Utara = −z**, **Timur = +x**.
- Kamera berada di +x+z, jadi dinding utara dan barat adalah dinding belakang.
- Grid 3×3, dengan sel **8 m (x) × 6 m (z)**:
  - Kolom W/C/E: x ∈ [−12,−4], [−4,4], [4,12].
  - Baris N/M/S: z ∈ [−9,−3], [−3,3], [3,9].
- Zona menurut sel (sesuai §2 dokumen v6):

| Sel | id zona | Label UI |
| :-- | :-- | :-- |
| NW | `executive` | Ruang Eksekutif |
| N | `lobby` | Lobi Utama |
| NE | `meditation` | Meditasi & Sleeping Pod |
| W | `game_ram` | Game Room & RAM Depot |
| C | `tatami` | Sunken Tatami |
| E | `workroom` | Work Room |
| SW | `pantry` | Pantry |
| S | `meeting` | Ruang Rapat |
| SE | `balcony` | Balkon Garden |

- Dinding: dinding luar belakang (utara dan barat) tingginya ±2.4. Dinding antar-zona dan dinding luar depan (selatan dan timur) rendah, ±0.6–0.9, model cutaway, supaya isi zona tidak tertutup dari kamera.
- Pintu: setiap dinding antar-zona yang dilalui jalur punya celah pintu minimal 1.4 m.
- Balkon SE berada di foreground kamera:
  - Lantai dek kayu.
  - Pagar kaca diganti **pagar rendah** (0.6 m) dan planter box, tanpa material transparan besar.
  - Akses ke balkon lewat "sky hallway" dari Work Room atau Meeting Room.
- Lift: pintu lift di dinding utara lobi (dekoratif).

## Skema `config/office.json` (data-driven)

Tambahkan atau ganti dengan bentuk berikut, dan pertahankan kunci yang masih dipakai kode:

```jsonc
{
  "layout": "v6",
  "grid": { "cols": ["W","C","E"], "rows": ["N","M","S"], "cell": [8, 6], "origin": [-12, -9] },
  "room": { "width": 24, "depth": 18, "wallHeight": 2.4 },     // bounding keseluruhan (kompatibilitas)
  "zones": [ { "id": "lobby", "label": "Lobi Utama", "cell": "N", "floor": "wood|tatami|tile|deck|carpet",
               "doors": [ { "side": "S", "offset": 0, "width": 1.6 } ] } ],
  "furniture": [ { "type": "...", "zone": "lobby", "pos": [x, y, z], "size": [w, h, d], "rot": 0, "solid": true } ],
  "spots": { ... }, "waypoints": { "nodes": { ... }, "edges": [ ... ] }
}
```

- `pos` furnitur dan spot boleh tetap **koordinat dunia**. Validator yang memastikan posisinya berada di dalam zonanya.
- **Setiap** furnitur wajib punya `size`, yaitu footprint AABB.
- Tandai `"solid": false` untuk furnitur yang boleh diinjak atau diduduki: karpet, bantal, kursi, area tatami.
- Scene membaca `zones` untuk membangun lantai, dinding, pintu, dan papan nama. Jangan hardcode zona di JS.

## Spot dan persona

- **Pertahankan** nama spot `desk_<id>` untuk keenam persona (tes `office.test.ts` mengandalkannya). Posisi baru:
  - `desk_greg` di `executive`, posisi komando: membelakangi dinding, menghadap pintu.
  - `desk_betty`, `desk_alex`, `desk_windry`, `desk_codex` di `workroom`.
  - `desk_hermes` di `lobby` (konsol dispatcher di samping resepsionis).
- Spot idle lama yang masih relevan dipertahankan namanya, lalu dipindah ke zonanya:
  - `buddha_altar`, `meditation_*` ke `meditation`.
  - `ps5_sofa_*`, `tv`, `storage_rack` ke `game_ram`.
  - `sunken_tatami_*` ke `tatami`.
  - `coffee` ke `pantry`.
  - `reception_desk`, `door` ke `lobby`.
  - `whiteboard` ke `workroom`.
- Spot `lounge_*`, `window_*`, dan `atelier_agy` dihapus atau dipindah sesuai kebutuhan. Spot baru:
  - `sleep_pod_1`, `sleep_pod_2`
  - `meeting_1`…`meeting_4`
  - `pantry_bar`, `pantry_espresso`
  - `sky_garden_1`, `sky_garden_2`, `outdoor_hallway`
  - `executive_sofa`
- Perbarui pemetaan idle di `public/app/idle.js` dan `public/app/main.js` (spot awal per persona) sesuai tabel §5 dokumen v6. Persona `codex` sekarang bernama **Muu** dan `hermes` bernama **Dexter**. Id-nya tidak berubah.
- Cari dan perbarui semua referensi nama spot yang dihapus (pakai graphify dan grep). Tidak boleh ada spot yatim.

## Scene (public/app)

1. Ganti `buildRoom()` menjadi pembangun berbasis `zones`:
   - Lantai per zona dengan material per jenis lantai.
   - Dinding dengan celah pintu.
   - Papan nama zona: `CanvasTexture` berteks Bahasa Indonesia, terbaca di 390×844.
2. Material: gunakan **satu cache material** (satu instance per warna/jenis) untuk lantai, dinding, dan prop baru. Furnitur baru (meja rapat oval, kursi rapat, sleeping pod, kulkas/sink pantry, bonsai/batu taman, pagar rendah, meja eksekutif, pintu lift, akuarium koi) dibuat dari primitif sederhana. Taruh factory baru di modul ESM terpisah `public/app/props-v6.js`, jangan menambah cabang di `scene.js`.
3. Kamera: hitung framing dari bounding box seluruh zona agar seluruh diorama terlihat di 1440×900 dan 390×844. Untuk mobile:
   - Overview boleh kecil.
   - Tambahkan **fokus zona**: tap atau klik papan nama, atau tombol daftar zona di UI, membuat kamera melakukan tween ke zona itu.
   - Tambahkan tombol "Lihat semua".
   - Kunci rentang azimuth OrbitControls agar dinding cutaway tetap benar.
4. Debug: dengan `?debug=1`, tampilkan overlay kecil berisi `renderer.info.render.calls`, jumlah segitiga, dan FPS. Isi dump yang sama ke elemen `#kantor-debug-dump` agar terbaca oleh `tools/shot-cdp.mjs`.
5. Anggaran: ≤150 draw call **termasuk shadow pass** di 390×844. `castShadow` hanya untuk karakter dan prop besar. PixelRatio dibatasi 1.5 bila lebar <520 px.

## Tes baru: `test/layout.test.ts` (tanpa three, tanpa jaringan)

- Ada 9 zona dengan sel unik, dan semuanya ada di grid.
- Setiap spot dan setiap furnitur berada di dalam bounds zona yang tertulis.
- Setiap furnitur punya `size`.
- Tidak ada dua spot yang berjarak <0.6 m.
- Setiap edge waypoint:
  - Tidak memotong AABB furnitur `solid` yang diperbesar 0.25 m. Ujung edge yang merupakan spot milik furnitur itu sendiri dikecualikan.
  - Bila melintasi batas zona, edge harus lewat celah pintu.
- Rute antar semua pasangan spot tetap ada (sudah diuji `nav.test.ts`; pastikan tetap lulus).
- Pasang port unik untuk setiap tes yang membuka server.

## Bukti (wajib di LOG)

- `npm test` hijau. Tulis jumlah tes di LOG.
- Jalankan server lokal di port bebas, misalnya `KANTOR_PORT=8795 KANTOR_DB=/tmp/kantor-010.db npm start`. Jangan pakai 8790, karena itu produksi.
- Ambil screenshot dengan `node tools/shot-cdp.mjs "http://127.0.0.1:8795/index.html?demo=1&debug=1" <out.png> <w> <h> 6000` untuk:
  - 1440×900
  - 390×844 overview
  - 390×844 fokus satu zona
- Simpan screenshot ke `docs/handoff/shots/010-*.png`. Catat angka draw call dari dump ke LOG.
- Tulis `docs/handoff/LOG-010-floorplan-v6-greybox.md`: perubahan, keputusan, angka performa, sisa pekerjaan.

## Larangan

- Ikuti `GEMINI.md`: tanpa commit/push, tanpa `docker compose`, tanpa dependensi baru, tanpa menyentuh `~/.claude`.
- Jangan ubah backend `src/` kecuali untuk validasi skema config, bila memang perlu.
- Jangan mengubah `public/landing/` dan `deploy/`.
- Jangan memakai aset eksternal (GLB/tekstur unduhan). Semuanya prosedural.
- Jangan meniru karakter, logo, atau aset game lain.
