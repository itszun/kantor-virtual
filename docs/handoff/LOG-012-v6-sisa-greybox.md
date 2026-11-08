# LOG-012 — Sisa PLAN-010: papan zona, UI fokus zona, anggaran draw call

| PLAN | `PLAN-012-v6-sisa-greybox.md` | Implementer | agy (Gemini 3.8 Flash) | Tanggal | 2026-11-08 |
| :-- | :-- | :-- | :-- | :-- | :-- |

## Putaran 1

### Ringkasan yang dikerjakan

1. **Papan nama zona terlihat jelas di 1440×900 dan 390×844:**
   - **Penyebab masalah sebelumnya ditemukan:**
     1. *Oklusi garis pandang:* Koordinat sebelumnya `bounds.maxZ - 0.45` berada tepat di balik dinding pemisah selatan setinggi 0.75 m. Dari sudut elevasi kamera isometrik (+x, +y, +z), dinding memotong garis pandang sehingga papan di lantai terhalang dinding.
     2. *Foreshortening ekstrim:* Papan rebah murni (`rotation.x = -Math.PI / 2`) dilihat dari sudut grazing 35° terkompresi secara vertikal menjadi ~2.6 px di mobile dan ~5 px di desktop, sehingga teks tidak terbaca.
     3. *Mipmap blur:* `CanvasTexture` bawaan Three.js melakukan downsampling tekstur teks kanvas pada sudut miring sehingga teks buram total.
     4. *Z-fighting & sorting transparansi:* Papan di y=0.03 bergesekan dengan depth buffer lantai di y=0 saat shadow map aktif, dan `transparent: true` menimbulkan sorting pass yang bermasalah.
   - **Solusi implementasi:**
     - Posisi plakat dipindahkan ke area lantai terbuka di masing-masing zona (`ZONE_LABEL_POS`).
     - Rotasi menggunakan urutan `YXZ`: dirotasi 45° pada sumbu Y (`Math.PI / 4`) sehingga tepi panjang plakat sejajar horizon layar, lalu dimiringkan pada sumbu X (`-Math.PI / 4.8`) agar plakat menghadap langsung ke arah kamera isometrik (+x+z).
     - Resolusi kanvas tekstur ditingkatkan ke 640×160 dengan `generateMipmaps = false`, `minFilter = THREE.LinearFilter`, `magFilter = THREE.LinearFilter`.
     - Tipografi tebal dinamis (48–64 px) warna putih di atas plakat slate gelap (`#1e293b`) dengan border ganda emas hangat (`#f59e0b`), memberikan kontras tinggi di atas seluruh jenis lantai (kayu, tatami, ubin, karpet, dek).
     - Material dibuat `transparent: false`, `depthWrite: true`, `polygonOffset: true` (`polygonOffsetFactor: -2`), dan `renderOrder = 3` sehingga bebas z-fighting.
     - Raycast picking pada papan nama zona tetap berfungsi penuh untuk memanggil `focusZone`.

2. **UI fokus zona & tombol "Lihat semua":**
   - Menambahkan navigasi chip horizontal `#zone-focus-bar` di bagian atas kanvas 3D pada `public/index.html`.
   - Chip tiap zona dibuat secara dinamis dari `config.zones` (tidak di-hardcode) melalui `UIManager.initZoneControls()`.
   - Tombol **"Lihat semua"** memanggil `scene.showOverview()`.
   - Sinkronisasi dua arah:
     - Menekan chip UI mengarahkan kamera (`focusZone`/`showOverview`).
     - Mengetuk papan nama 3D di kanvas otomatis memperbarui status aktif chip UI terkait (`scene.onZoneChange`).
   - Kamera `OrthographicCamera` kini menginterpolasi nilai `zoom` secara mulus saat `focusZone` (zoom 2.1 di mobile, 1.85 di desktop) dan kembali ke zoom 1.0 saat `showOverview()`.
   - Mendukung parameter URL debug `&zone=<id>` (misalnya `&zone=workroom`) untuk fokus langsung saat navigasi/pengujian.
   - Target sentuh chip memenuhi standar sentuh mobile (tinggi minimal 40 px: `min-height: 40px; padding: 8px 14px;`) dengan visual pill blur frosted-glass semi-transparan yang tidak menutupi karakter.

3. **Optimasi anggaran draw call (≤150 calls):**
   - Menggabungkan seluruh 36 geometri dinding menjadi 1 geometri tunggal menggunakan `BufferGeometryUtils.mergeGeometries` dari vendor Three.js addons.
   - Menggabungkan geometri lantai per material (5 warna/jenis material) menggunakan `BufferGeometryUtils.mergeGeometries`.
   - Membatasi `castShadow = true` hanya untuk prop besar (`height >= 0.7` pada tipe perabot besar: `executive_desk`, `storage_shelves`, `altar`, `sleep_pod`, `reception_counter`, `fridge_sink`, `meeting_table`, `pantry_counter`) dan karakter, serta menonaktifkannya pada ornamen kecil (cone daun tanaman, patung altar kecil, pagar rendah, meja pendek).
   - Memperbaiki peringatan Three.js `PCFSoftShadowMap` menjadi `PCFShadowMap`.

### File yang diubah

| File | Perubahan |
| :-- | :-- |
| `public/app/scene.js` | Merge geometri dinding & lantai via `BufferGeometryUtils.mergeGeometries`, pembaruan posisi/rotasi/tekstur `addZoneLabel`, dukungan interpolasi zoom kamera di `focusZone`/`showOverview`/`updateFocusTween`, callback `onZoneChange`. |
| `public/app/props-v6.js` | Pembatasan `castShadow` hanya pada prop besar berkategori utama dengan tinggi ≥ 0.7 m. |
| `public/app/ui.js` | Penambahan method `initZoneControls` dan `setActiveZone` untuk mengelola chip zona secara dinamis dari `config.zones`. |
| `public/app/main.js` | Integrasi `initZoneControls`, sinkronisasi event `onZoneChange`, dan penanganan parameter URL `&zone=<id>`. |
| `public/index.html` | Penambahan elemen DOM `<nav class="zone-focus-bar" id="zone-focus-bar">` di dalam `#viewport-wrapper`. |
| `public/style.css` | Styling CSS responsif untuk `.zone-focus-bar` dan `.zone-chip` (touch target ≥40px, frosted pill style, state active/hover). |
| `tools/shot-cdp.mjs` | Perbaikan template literal argumen `--user-data-dir` agar memakai PID unik per proses testing headless. |

### Keputusan kecil & alasannya

- **Interpolasi `camera.zoom` pada OrthographicCamera:** Mengubah `camera.position` pada kamera ortografis hanya menggeser frustum/sudut lookAt tanpa mengubah skala ukuran visual objek. Oleh karena itu, properti `zoom` ditambahkan ke `focusAnimation` tween agar fokus ke zona memberikan pembesaran visual yang nyata dan dramatis.
- **Orientasi Plakat `order = 'YXZ'`:** Rotasi Y sebesar 45° membuat garis horizontal plakat tepat tegak lurus dengan pandangan kamera isometrik (+x+z), sehingga teks terbaca rata mendatar dari layar pengguna dan tidak miring 35°.
- **Canvas Texture 640×160 dengan LinearFilter:** Mencegah mipmapping kabur saat dilihat pada sudut perspektif miring, menghasilkan huruf yang tajam dan terbaca tanpa beban komputasi tambahan.

### Angka Draw Call & Segitiga (`#kantor-debug-dump`)

| Kondisi | Draw Calls Sebelum | Draw Calls Sesudah | Segitiga Sebelum | Segitiga Sesudah | Target Anggaran |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **Desktop 1440×900 (Overview)** | 180 | **129** | 17.828 | **17.520** | ≤ 150 |
| **Mobile 390×844 (Overview)** | 180 | **129** | 17.828 | **17.520** | ≤ 150 |
| **Mobile 390×844 (Fokus Work Room)** | 180 | **89** | 17.828 | **10.988** | ≤ 150 |

### Hasil tes (output asli, tidak diringkas)

```
> kantor@0.1.0 test
> node --test

✔ mapCodexHook: UserPromptSubmit -> task.start, Stop -> task.end (3.997699ms)
✔ mapAgyHook: hanya PreInvocation pertama dan Stop fullyIdle (0.43676ms)
✔ claude-hook.sh --agent agy selalu mencetak {} dan exit 0 (202.599788ms)
✔ claude-hook.sh --agent codex dilewati saat KANTOR_WRAPPED=1 (194.217845ms)
▶ Autentikasi POST /api/events
  ✔ tanpa token mengembalikan 401 (56.179714ms)
  ✔ token salah mengembalikan 401 (14.187951ms)
  ✔ token file tak ada mengembalikan 503 (24.30062ms)
  ✔ token benar mengembalikan 202 (48.134456ms)
✔ Autentikasi POST /api/events (154.004883ms)
✔ claude-hook.sh: perilaku hook Claude Code (853.499085ms)
✔ validateDirectorOutput: validasi skema output Director (1.514612ms)
✔ buildDirectorPrompt: perlindungan privasi (tanpa membocorkan judul task/prompt) (0.630952ms)
✔ canCallDirector: guardrails interval, budget, dan status idle (4.382258ms)
✔ runDirectorTick: eksekusi dengan mock fetch dan penyimpanan memori (13.397313ms)
✔ Endpoint GET /api/director mengembalikan status dan memori (58.772081ms)
✔ Alur task persona (start -> working di desk -> end -> idle di lounge) (174.379161ms)
✔ mappers: formatCost memformat biaya sesuai aturan (1.896772ms)
✔ mappers: relTime menghasilkan representasi waktu relatif Indonesia (1.526635ms)
✔ mappers: historyToRows memetakan task, status running, dan fallback judul null (0.753237ms)
✔ mappers: gregTasks memfilter hanya persona greg, maks 10, dan menerjemahkan status (0.818676ms)
✔ mappers: activityFromHistory mengurutkan entri terbaru dan membatasi maks 20 (0.822095ms)
✔ mappers: usageView menangani biaya null dan agregasi 7 hari (0.883449ms)
✔ mapHook: pemetaan event hook Claude Code (3.444636ms)
✔ kantor-agy.sh: wrapper agy untuk alex dan windry (1191.891419ms)
▶ kantor-codex.sh: wrapper eksekusi Codex dengan telemetri event kantor-api
  ✔ sukses: mengirim task.start lalu task.end ke server dengan persona codex (559.560986ms)
  ✔ gagal: mengirim task.fail saat subproses codex keluar dengan kode error (318.614821ms)
✔ kantor-codex.sh: wrapper eksekusi Codex dengan telemetri event kantor-api (890.782796ms)
🛰️ Dexter: Mengevaluasi tugas "Rancang arsitektur sistem federated queue"
   Target   : GREG
   Alasan   : Tugas bernuansa perencanaan makro, arsitektur, dan evaluasi filosofis
   Kategori : strategic

✔ classifyIntent: klasifikasi tugas ke spesialis yang tepat (5.229359ms)
▶ tools/kantor-hermes: dispatch orkestrasi dan telemetri event kantor-api
  ✔ dry-run dispatch mengirim event task.start dan task.end persona hermes (123.14586ms)
✔ tools/kantor-hermes: dispatch orkestrasi dan telemetri event kantor-api (143.791845ms)
▶ layout v6: zona, prop, spot, dan navgraph konsisten
  ✔ ada sembilan zona pada sel grid yang unik (1.418312ms)
  ✔ seluruh spot dan furnitur berada dalam zona yang ditetapkan (1.212278ms)
  ✔ spot tidak bertumpukan dan seluruhnya adalah node waypoint (4.680013ms)
  ✔ edge tidak memotong AABB furnitur solid kecuali di endpoint miliknya (13.448834ms)
  ✔ edge yang menyeberangi sel grid melewati pintu pasangan zona (3.257353ms)
✔ layout v6: zona, prop, spot, dan navgraph konsisten (27.921785ms)
✔ metrics: getRamMetrics menghitung kapasitas RAM dan jumlah kardus gudang (1.881813ms)
▶ Graf waypoint dan pathfinding navigasi
  ✔ tidak ada edge ke node tak dikenal di graph (1.64985ms)
  ✔ semua spot bernama ada di graph node (0.37396ms)
  ✔ jalur antar semua pasangan spot ada dan valid (155.892152ms)
  ✔ nearestNode mencari node paling dekat dengan koordinat (0.873382ms)
✔ Graf waypoint dan pathfinding navigasi (162.150752ms)
▶ Endpoint /api/office dan vendor /vendor/three/*
  ✔ GET /api/office 200 berisi 5 persona & semua spot desk_<id> (54.250264ms)
  ✔ GET /vendor/three/build/three.module.js 200 dengan content-type javascript (27.202777ms)
  ✔ GET /vendor/three/../package.json mengembalikan 404 (6.206151ms)
  ✔ GET /vendor/three/src/Three.js mengembalikan 404 (hanya build/ dan examples/jsm/ yang diizinkan) (5.000504ms)
  ✔ GET /vendor/three/package.json mengembalikan 404 (4.035256ms)
✔ Endpoint /api/office dan vendor /vendor/three/* (111.082265ms)
▶ PWA manifest, icons, and service worker
  ✔ Manifest dilayani dengan content-type yang benar dan JSON valid berisi field wajib (43.924394ms)
  ✔ Semua ikon di manifest ada dan berstatus 200 (37.879593ms)
  ✔ /sw.js berstatus 200 dan tidak memuat pola cache untuk /api/ (8.197005ms)
  ✔ Registrasi script pwa.js dapat diakses di /app/pwa.js (6.96267ms)
  ✔ HTML head memuat tag PWA dan safe-area viewport-fit (12.938551ms)
✔ PWA manifest, icons, and service worker (125.118362ms)
✔ scanner: pemindaian transcript Claude secara inkremental dan akurat (8.833149ms)
✔ SSE stream menerima snapshot saat connect dan setelah POST event (138.228684ms)
✔ Pembersihan stale task (sweepStale) (51.536536ms)
▶ File statis dan pencegahan path traversal
  ✔ GET / menyajikan public/index.html (45.440308ms)
  ✔ /../package.json tidak bocor (mengembalikan 404/400) (10.198218ms)
  ✔ file tak ada mengembalikan 404 (5.192245ms)
  ✔ GET /api/health mengembalikan { ok: true } (13.609495ms)
✔ File statis dan pencegahan path traversal (88.979621ms)
✔ Statistik agregasi hari ini dan deduplikasi usage (129.537062ms)
✔ GET /api/system: telemetri RAM server asli dan kalkulator boks gudang (49.598251ms)
✔ GET /api/usage: laporan agregasi token & biaya per hari, persona, dan model (119.448634ms)
▶ Validasi endpoint POST /api/events
  ✔ persona tak dikenal mengembalikan 400 (45.132111ms)
  ✔ type tak dikenal mengembalikan 400 (8.127631ms)
  ✔ field tak dikenal di root mengembalikan 400 (8.804101ms)
  ✔ title dipotong 120 karakter (40.768304ms)
  ✔ body > 16 KB mengembalikan 413 (4.287035ms)
  ✔ JSON rusak mengembalikan 400 (3.836369ms)
✔ Validasi endpoint POST /api/events (124.893785ms)
ℹ tests 72
ℹ suites 0
ℹ pass 72
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2084.386597
```

### Bukti Tangkapan Layar

- `docs/handoff/shots/012-desktop.png` (1440×900, overview dengan chip UI dan seluruh papan nama zona terlihat jelas).
- `docs/handoff/shots/012-mobile-overview.png` (390×844, overview mobile dengan kontrol chip zona horizontal).
- `docs/handoff/shots/012-mobile-zone.png` (390×844, fokus pada Work Room via `?zone=workroom` dengan zoom 2.1×).

### Sisa pekerjaan

- Seluruh poin PLAN-012 telah terpenuhi secara penuh tanpa menyentuh file terlarang atau dependensi backend baru.
- Pekerjaan berikutnya dapat melanjutkan ke pemolesan prop perabot per zona (PLAN-009/aset GLB) bila model siap diintegrasikan.

---

## Review (diisi Claude)
**Putusan:** Diterima / Revisi

**Yang diperiksa:** `git diff`, tes (`npm test`), UI (screenshot 1440×900 & 390×844)

**Catatan:**
- …
