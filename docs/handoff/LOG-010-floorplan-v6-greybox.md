# LOG-010 — Floorplan v6: zona 3×3, greybox, navgraph tervalidasi

## Status

**Sebagian selesai.** Muu (Codex CLI) mengerjakan implementasi utama, tetapi berhenti di tengah jalan karena kuota akun Codex habis (tersedia lagi 8 Des 2026). Greg (Claude) menyelesaikan perbaikan agar tes hijau dan menulis log ini.

## Perubahan (Muu)

- `config/office.json` → `layout: "v6"`. Isinya:
  - 9 zona di grid 3×3 (sel 8×6 m, origin [-12,-9]).
  - Furnitur dengan `zone`/`size`/`solid`.
  - Spot dan waypoint baru.
- `public/app/scene.js` ditulis ulang menjadi pembangun berbasis `zones` (1547 → ±345 baris). Isinya:
  - Lantai per zona dan dinding dengan celah pintu.
  - Material cache, `focusZone`, `showOverview`.
  - Overlay `?debug=1` dan `#kantor-debug-dump`.
- `public/app/props-v6.js`: factory prop greybox (sleeping pod, meja rapat, pantry, lift, akuarium koi, pagar rendah, dll.).
- Pemetaan idle di `idle.js`/`main.js`. `src/state.ts`: spot idle default `lounge` → `sunken_tatami_1`, karena spot `lounge` tidak ada lagi di v6.
- `test/layout.test.ts` (baru) dan penyesuaian `test/nav.test.ts`.

## Perbaikan review (Greg)

- **Navgraph menembus perabot.** 6 edge memotong AABB solid. Perbaikannya:
  - game_ram → pantry: pintu S/N di-offset +2.6, ditambah node `game_ram_east` dan `pantry_north` supaya rute memutari sofa.
  - tatami → meeting: lewat `tatami_e`/`tatami_se`/`tatami_s` supaya memutari meja rendah.
  - `meeting_center` dipindah ke [0,4.2]. Sebelumnya titik ini berada di dalam meja rapat. Ditambah node `meeting_nw`/`ne`/`west`/`east`.
  - `desk_greg` dipindah ke **belakang** meja eksekutif (posisi komando: membelakangi dinding, menghadap pintu). Meja eksekutif digeser ke z −6.9. Rute lewat `exec_nw`/`exec_w`.
  - `reception_desk` dipindah ke depan konter. `storage_rack` dipindah ke depan rak.
  - Work Room: meja kanan digeser ke x 9.4. Keempat spot `desk_*` kini duduk tepat di depan mejanya. Sebelumnya `desk_alex` tidak punya meja.
- **Tes layout diperketat.** Edge yang menyeberang zona kini wajib melintas *di dalam* celah pintu (lebar − 0.2 m). Sebelumnya tes hanya mengecek bahwa pintu ada.
- **Scene: `door.offset` sekarang dipakai** di `addWallWithDoor`. Sebelumnya pintu selalu di tengah.
- **Tinggi dinding:** hanya dinding luar utara/barat yang 2.4 m. Dinding antar-zona kini 0.75 m (cutaway), sesuai PLAN. Sebelumnya semua sisi N/W setinggi 2.4 m.
- Pose duduk: `lounge_*` → `meeting_*` dan `executive_sofa` (`characters.js`).
- Tag Muu: "Reviewer" → "3D". Teks UI "Santai di lounge" → "Santai di tatami".
- `test/flow.test.ts` dan `test/stale.test.ts` diselaraskan ke spot idle `sunken_tatami_1`.

## Bukti

- `npm test`: **72 pass, 0 fail**. Angka ini sudah termasuk 6 tes PWA dari PLAN-011.
- Server lokal port 8795. Screenshot ada di `docs/handoff/shots/010-desktop.png` dan `010-mobile.png`.
- Dump debug (1440×900): **180 draw call**, 17.8k segitiga.

## Sisa pekerjaan (untuk PLAN berikutnya / Muu setelah 8 Des)

1. **Anggaran draw call terlampaui**: 180, sedangkan target ≤150. Perlu merge geometri dinding/lantai per material atau InstancedMesh untuk prop berulang.
2. **Papan nama zona belum terlihat** di screenshot. Papan sudah dipindah rebah di tepi selatan zona, tetapi belum terverifikasi tampil. Cek `createTextTexture`.
3. **UI daftar zona dan tombol "Lihat semua" belum ada.** `focusZone`/`showOverview` sudah tersedia di scene, tetapi belum diberi tombol.
4. Screenshot "390×844 fokus satu zona" belum diambil, karena bergantung pada butir 3.
5. Pemolesan prop per zona. Factory detail lama (altar Buddha, dll.) dihapus dalam rewrite dan diganti greybox.
