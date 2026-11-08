# PLAN-009 — Asset Interior 3D: Floorplan v5 sebagai Baseline, v6 sebagai Ekspansi

| Status | Proposal untuk review pemilik | Estimasi | XL, dipecah menjadi paket S/M | Fokus | Visual Three.js, tanpa perubahan backend |
| :-- | :-- | :-- | :-- | :-- | :-- |

## 1. Tujuan

Mewujudkan interior **Kantor Weiwu** sebagai diorama 3D isometrik yang hangat dan original: terinspirasi nuansa permainan simulasi manajemen kantor Jepang, namun tanpa menyalin karakter, logo, tekstur, nama, maupun aset pihak lain.

Rencana ini menggunakan **floorplan v5 sebagai baseline produksi**. Floorplan v6 adalah ekspansi setelah baseline memenuhi bukti visual, navigasi, dan performa yang disepakati.

Referensi visual:

- `docs/assets/kantor_weiwu_floorplan_v5.jpg`
- `docs/assets/kantor_weiwu_floorplan_v6.jpg`
- `docs/FLOORPLAN-V5-KANTOR-WEIWU.md`
- `docs/FLOORPLAN-V6-SKYLINE-WEIWU.md`

## 2. Keputusan arsitektur

1. **Procedural first.** Lantai, dinding, perabot berulang, papan nama, altar, konsol generik, tanaman sederhana, rak, dan karakter dibuat dari primitif Three.js. Ini menjaga gaya konsisten, dapat diedit, ringan, dan sesuai kontrak v0.1 yang tidak mengandalkan model eksternal.
2. **External/AI asset optional.** GLB atau generasi 3D hanya boleh dipertimbangkan untuk hero prop yang tidak layak dibuat prosedural. Setiap asset harus punya persetujuan biaya/lisensi, fallback prosedural, normalisasi skala, dan material toon sebelum masuk aplikasi.
3. **Data-driven layout.** Batas ruang, posisi furnitur, spot aktivitas, dan waypoint tetap didefinisikan dalam `config/office.json`; kode scene membaca konfigurasi tersebut.
4. **Modular scene assembly.** Pecah factory prop dan room builder dari `public/app/scene.js` secara bertahap menjadi modul ESM tanpa menambahkan build step atau dependensi.
5. **Mobile-first visual budget.** Gunakan `InstancedMesh` untuk kardus, bantal, tanaman kecil, dan prop berulang; pertahankan sekitar maksimum 150 draw calls pada perangkat mobile.

## 3. Kontrak gaya visual

- Kamera ortografis isometrik, cutaway tanpa plafon, dinding rendah/belakang.
- Geometri low-poly/voxel dengan siluet terbaca pada layar 390×844.
- `MeshToonMaterial` atau `MeshLambertMaterial`, palet kayu hangat, tatami hijau lembut, aksen warna persona.
- Pixel feel hanya sebagai toggle renderer; tidak mengorbankan keterbacaan UI Bahasa Indonesia.
- Satu `HemisphereLight` dan satu `DirectionalLight` dengan shadow frustum ketat; cahaya lokal hanya untuk aksen meditasi dan game room.
- Karakter chibi original: kepala besar, tubuh pendek, busana warna persona; tidak menggunakan sprite/karakter referensi.

## 4. Urutan implementasi

### Paket 009-A — Blueprint v5 dan kontrak koordinat

**Output:** peta room bounds, koridor, pintu, camera framing, daftar prop, dan navgraph v5 yang tidak berpotongan dengan furnitur.

- Tetapkan skala dunia, orientasi isometrik, dan aturan floor grid.
- Audit layout aktif terhadap v5: lobby/reception, sunken tatami, meditation, work bay, lounge/pantry, game room, dan RAM depot.
- Tandai semua spot idle dan default persona; tambahkan waypoint hanya melalui konfigurasi.
- Tentukan bounding box furnitur untuk validasi jalur jalan.

**Estimasi:** 8–12k token.

### Paket 009-B — Asset factory dan material kit

**Output:** primitive/helper reusable dan style kit yang tidak mengubah perilaku aplikasi.

- Buat helper material kayu, tatami, kain, kaca, logam, layar emissive, dan signage `CanvasTexture`.
- Buat factory modular untuk desk/monitor/chair/sofa, dinding/pintu, rak, tanaman, karpet, bantal, dan signage.
- Terapkan garis batas atau outline sederhana hanya bila tetap hemat draw call.
- Dokumentasikan skala, pivot, dan aturan penamaan asset.

**Estimasi:** 12–18k token.

### Paket 009-C — Ruang kerja dan lobi v5

**Output:** dua zona utama yang mewakili kualitas final.

- Lobby: reception counter, receptionist chibi original, staff rack, koi tank, papan nama, dan entrance.
- Work bay: meja 4–6 persona, monitor dengan state glow, whiteboard, server mini, dan tanaman.
- Validasi komposisi pada mobile serta desktop sebelum kit dipakai ke ruangan lain.

**Estimasi:** 14–20k token.

### Paket 009-D — Ruang sosial dan rekreasi v5

**Output:** sunken tatami, lounge/pantry, dan game room.

- Sunken tatami/horigotatsu: satu undakan, meja teh, teko, cushion persona.
- Lounge/pantry: sofa, meja kopi, mesin espresso generik, cangkir dan uap hemat.
- Game room: TV 40 inci generik, konsol putih tanpa merek, controller, karpet dan sofa/bean bag.

**Estimasi:** 12–18k token.

### Paket 009-E — Ruang hening dan telemetri v5

**Output:** meditation sanctuary dan RAM depot yang terhubung ke data yang sudah disediakan server.

- Altar ditempatkan hormat di atas lantai; rupang prosedural, lilin, bunga, cushion, dan partikel dupa kecil.
- Storage shelves serta kardus RAM dengan `InstancedMesh`; urutan slot stabil dan perubahan jumlah kardus dianimasikan ringan.
- Meter RAM hanya menggunakan payload endpoint/server yang benar; jangan menciptakan metrik frontend palsu.

**Estimasi:** 10–16k token.

### Paket 009-F — Integrasi, proof, dan optimasi

**Output:** navgraph tervalidasi, screenshot target, tes hijau, dan laporan performa.

- Jalankan `npm test` tanpa jaringan.
- Ambil screenshot setidaknya 390×844 dan 1440×900 untuk tiap zona baru.
- Periksa console, clipping kamera, overlap prop, keterbacaan signage, draw calls, dan shadow budget.
- Simpan bukti dalam `docs/handoff/shots/` dan ringkasan pada LOG yang sesuai.

**Estimasi:** 12–20k token.

## 5. Gate sebelum v6

V6 tidak dimulai sampai seluruh kriteria berikut terpenuhi:

- Semua tujuh zona v5 terbaca jelas dari kamera utama pada mobile dan desktop.
- Setiap persona dapat berjalan ke spot kerja dan idle tanpa menembus prop atau dinding.
- `npm test` lulus dan tidak ada error console.
- Material, signage, dan prop mempunyai gaya yang konsisten; tidak ada placeholder kubus polos pada area utama.
- Mobile scene tetap berada dalam anggaran render yang disepakati (target awal ≤150 draw calls).
- Pemilik menyetujui screenshot v5 sebagai style benchmark.

## 6. V6: Ekspansi sesudah baseline

Setelah gate v5, v6 ditangani sebagai perubahan layout terencana, bukan sekadar penambahan prop.

1. Revisi room bounds, jalur, framing, dan akses elevator/sky corridor terlebih dahulu.
2. Tambahkan executive skyline room dan meeting room sebagai hero spaces.
3. Tambahkan closed pantry, sleeping pods, dan balcony garden memakai kit material yang sudah matang.
4. Gunakan kaca/skyline secukupnya; transparency dan shadow merupakan risiko performa utama.
5. Perbarui navgraph, idle action, screenshot, dan budget performa setiap satu zona selesai.

**Estimasi v6 tambahan:** 40–65k token.

## 7. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
| :-- | :-- | :-- |
| Scope v6 masuk terlalu dini | Layout dan asset v5 tidak pernah selesai/polished | Terapkan gate v5 dan pisahkan setiap zona sebagai PLAN kecil |
| `scene.js` menjadi monolit | Sulit direview dan asset tidak reusable | Extract module ESM bertahap dengan API factory kecil |
| Draw call/shadow membebani mobile | FPS turun, scene terasa berat | Instancing, material sharing, satu directional shadow, static prop grouping |
| Navgraph tidak sejalan dengan furniture | Karakter menembus meja atau berhenti | Room bounds dan route diuji tiap perubahan konfigurasi |
| Asset AI/GLB tidak konsisten | Gaya pecah, lisensi/biaya tidak jelas | Procedural-first; asset eksternal hanya setelah persetujuan dan normalisasi |

## 8. Estimasi keseluruhan

| Lingkup | Estimasi token agen |
| :-- | --: |
| Blueprint + asset system | 20–30k |
| Implementasi dan integrasi v5 | 51–74k |
| QA/polish v5 | 12–20k |
| **Total v5 siap direview** | **82–125k** |
| Ekspansi v6 | 40–65k |
| **Total v5 + v6 lengkap** | **122–190k** |

Estimasi ini adalah token kerja agen dan iterasi desain, bukan biaya API/ChatGPT. Angka aktual bergantung pada jumlah revisi visual setelah screenshot review dan keputusan penggunaan asset generatif pihak ketiga.

## 9. Batasan

- Jangan membuat commit/push, mengubah konfigurasi sistem, atau menambah dependensi tanpa persetujuan.
- Jangan menggunakan asset bergaya salinan atau bermerek.
- Jangan melakukan panggilan API asset-generation berbayar tanpa persetujuan pemilik dan kejelasan kredensial/biaya.
- Semua UI baru tetap dalam Bahasa Indonesia.
