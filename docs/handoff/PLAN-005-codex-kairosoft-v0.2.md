# PLAN-005 — Integrasi Persona Codex, Wrapper CLI & 8 Zona Kantor Kairosoft (v0.2)

| Ukuran | M/L (target < 30 menit) | Branch | `feat/005-codex-kairosoft-v0.2` | Status | Proposal Siap Direview |
| :-- | :-- | :-- | :-- | :-- | :-- |

---

## 1. Tujuan

Mewujudkan lompatan arsitektur **Kantor v0.2** sesuai visi dan draf spesifikasi di [`docs/TSD-KANTOR-v0.2-DRAFT.md`](../TSD-KANTOR-v0.2-DRAFT.md):
1. Menjadikan **Codex** sebagai persona resmi ke-5 (`id: "codex"`) dengan meja kerja di `desk_codex` (Reviewer & second opinion, menunggu keputusan pemilik) dan Art Atelier (`atelier_agy`) menjadi milik **agy**.
2. Menyediakan wrapper CLI `tools/kantor-codex.sh` dan `tools/kantor-codex.ts` agar Claude Code dan AGY dapat mendelegasikan tugas review/second opinion ke Codex CLI dengan telemetri event otomatis (`task.start` / `task.end`).
3. Mengembangkan tata letak Three.js 3D bergaya **Kairosoft 3D Voxel / Diorama** yang mencakup 8 zona ruang:
   - *Office Lobby* dengan resepsionis dan area duduk *Sunken Tatami* (*horigotatsu*).
   - *Hermes Command Desk* (modul heksagonal retro-cyber).
   - *Claude Strategy Room* (ruang rapat kaca kedap suara dengan whiteboard arsitektur).
   - *AGY Engineering Bay* (multi-monitor developer setup & rak server).
   - *Art Atelier (agy)* (easel lukis, tripod kamera, kanvas kreasi artist agy).
   - *Meditation Room* (altar rupang Buddha emas, dupa, bantalan meditasi tatami).
   - *Game Room* (konsol PlayStation 5, TV flat screen 40 inci, sofa santai).
   - *Storage Room* (rak gudang kardus yang memvisualisasikan kapasitas & pemakaian RAM server asli).
4. Menghubungkan metrik RAM server (`os.freemem()` vs `os.totalmem()`) ke objek visual tumpukan kardus di *Storage Room*.

---

## 2. Konteks & Rujukan

- Rujukan utama:
  - [`docs/TSD-KANTOR-v0.2-DRAFT.md`](../TSD-KANTOR-v0.2-DRAFT.md)
  - [`docs/ASPIRASI-DAN-PERENCANAAN-KANTOR-AI.md`](../ASPIRASI-DAN-PERENCANAAN-KANTOR-AI.md)
  - Aset visual referensi: `docs/assets/floorplan-v2.jpg`
  - Pola wrapper yang sudah ada: `tools/kantor-agy.sh` dan `tools/kantor-agy.ts`

---

## 3. Batas Scope

**Boleh diubah/dibuat:**
- `config/personas.json` (tambahkan persona `codex`).
- `config/office.json` (tambahkan spots, waypoints, dan furnitur untuk 8 zona baru).
- `config/idle-lines.json` (tambahkan dialog santai santai di Game Room, Meditation Room, dan Tatami).
- `tools/kantor-codex.sh` & `tools/kantor-codex.ts` (baru).
- `public/app/scene.js`, `public/app/characters.js`, `public/app/idle.js` (voxel assets & 8-room scene geometry).
- `src/server.ts` & `src/state.ts` (penyisipan payload metrik RAM server).
- `test/office.test.ts` (update ekspektasi 5 persona) & `test/kantor-codex.test.ts` (baru).
- `docs/handoff/LOG-005-codex-kairosoft-v0.2.md`.

**Tidak boleh disentuh:**
- `~/.claude/**`, kredensial produksi `~/.config/dare/*` atau `~/.config/kantor/*`.
- File build v0.1 yang sudah terverifikasi tanpa alasan yang jelas.

---

## 4. Rincian Langkah Implementasi

### Langkah 1: Registrasi Persona & Wrapper CLI Codex
1. Daftarkan persona `codex` di `config/personas.json`:
   ```json
   {
     "id": "codex",
     "name": "Codex",
     "role": "Reviewer & second opinion (Codex CLI)",
     "engine": "codex",
     "color": "#10a37f",
     "desk_spot": "desk_codex"
   }
   ```
2. Buat `tools/kantor-codex.ts` dan executable `tools/kantor-codex.sh`:
   - Membaca argumen `--title`, `--task-id`, dan mengeksekusi subproses `codex exec ...`.
   - Mengirim event `task.start` saat mulai, menangkap durasi & estimasi token, lalu mengirim `task.end`.
3. Buat pengujian `test/kantor-codex.test.ts` untuk memverifikasi wrapper dengan CLI mock palsu lokal (sesuai aturan `GEMINI.md`).

### Langkah 2: Ekspansi `config/office.json` (8 Zona Kairosoft)
1. Perluas `spots`:
   - `atelier_agy`: Posisi kanvas lukis di Art Atelier (agy).
   - `desk_codex`: Posisi meja kerja Codex.
   - `meditation_1`, `meditation_2`, `buddha_altar`: Spot altar patung Buddha dan bantalan tatami.
   - `ps5_sofa_1`, `ps5_sofa_2`: Sofa depan TV Game Room.
   - `sunken_tatami_1`, `sunken_tatami_2`: Area duduk santai rendah di Lobby.
   - `reception_desk`: Spot sprite resepsionis.
   - `storage_rack`: Posisi rak besi gudang logistik RAM.
2. Hubungkan simpul graf baru ke `waypoints.nodes` dan `waypoints.edges` agar pathfinding A* tetap bebas tabrakan (diverifikasi oleh `test/nav.test.ts`).

### Langkah 3: Telemetri RAM Server (Storage Room Ingest)
1. Tambahkan fungsi penghitung persentase RAM di `src/server.ts`:
   ```ts
   import os from 'node:os';
   function getRamMetrics() {
     const total = os.totalmem();
     const free = os.freemem();
     const used = total - free;
     const percent = Number(((used / total) * 100).toFixed(1));
     return { total_mb: Math.round(total / 1048576), used_mb: Math.round(used / 1048576), percent };
   }
   ```
2. Sertakan data RAM dalam event heartbeat / SSE snapshot agar browser dapat mengontrol jumlah kardus di Three.js.

### Langkah 4: Visualisasi Three.js (Procedural Voxel & Props)
1. Bangun geometri voxel modular untuk:
   - Altar rupang Buddha warna emas (`BoxGeometry` + `SphereGeometry` kepala/badan) dan dupa dengan partikel asap tipis meliuk.
   - Konsol PS5 putih ramping di samping TV 40" menyala dengan layar pixel game retro.
   - Meja rendah dan lantai *sunken tatami* bertingkat ke bawah dengan bantal duduk merah.
   - Rak besi gudang dengan tumpukan boks instanced mesh (`THREE.InstancedMesh`).
2. Sediakan avatar sprite untuk Codex dengan palet warna hijau emerald `#10a37f`.

### Langkah 5: Verifikasi & Bukti Screenshot
1. Jalankan seluruh suite tes `npm test` (semua harus hijau).
2. Ambil bukti screenshot visual live resolusi HP dan desktop (`005-kairosoft-desktop.png`, `005-kairosoft-mobile.png`).
3. Tulis laporan di `docs/handoff/LOG-005-codex-kairosoft-v0.2.md`.

---

## 5. Kriteria Selesai

- [ ] Persona `codex` terdaftar dan dikenali oleh `/api/office` dan `/api/events`.
- [ ] Wrapper `tools/kantor-codex.sh` berjalan dan mengirim telemetri task yang valid.
- [ ] Seluruh pasangan spot navigasi (termasuk 8 zona baru) terhubung tanpa dead-end (`test/nav.test.ts` lulus).
- [ ] Tumpukan kardus di Storage Room Three.js merefleksikan persentase pemakaian RAM server asli.
- [ ] `npm test` lulus 100% tanpa jaringan.
- [ ] Dokumentasi dan bukti screenshot lengkap di `docs/handoff/LOG-005-codex-kairosoft-v0.2.md`.

---

## Revisi 1 (Claude/Greg, 2026-11-08, atas keputusan pemilik)

**Fakta:** Codex CLI di server ini TIDAK bisa membuat gambar. Tool `image_gen` tidak diberikan ke akun ini, sudah dites di `codex exec` dan TUI, dengan flag `image_generation=true`. Semua gambar floorplan v2/v3 dibuat oleh **agy lewat subagent image-generator miliknya sendiri (model Gemini)**, bukan Codex.

**Keputusan pemilik:**
1. **Pelukis/artis kantor adalah agy**, lewat subagent artist miliknya sendiri. Codex BUKAN artis.
2. Subagent agy **tidak boleh diberi nama atau peran yang memuat "Codex"** (contoh salah: `Role: "Codex Virtual Artist"`). Pakai nama netral, misalnya `typeName: "image-generator"`, `role: "Agy Artist"`.
3. Floorplan v2 resmi: `docs/assets/floorplan-v2.jpg` (dulu `virtual_ai_studio_kairosoft_v2_alt.jpg`). File berlabel lama: `docs/assets/floorplan-v2-draft-label-lama.jpg`. Salinan di `public/assets/` sudah dihapus, karena gambar konsep tidak disajikan ke publik.

**Yang harus diubah (R1):**
- Semua rujukan "Codex = Artist / Art Atelier / Virtual Artist / pelukis / multimodal / gambar" di `docs/ASPIRASI-DAN-PERENCANAAN-KANTOR-AI.md`, `docs/TSD-KANTOR-v0.2-DRAFT.md`, PLAN/LOG-005, PLAN/LOG-006, `config/*.json`, `public/app/*.js`, `src/*`, `test/*`:
  - Atelier menjadi milik agy: spot `atelier_codex` → `atelier_agy`, label "Art Atelier (agy)". Kanvas = "hasil kreasi artist agy".
  - Persona `codex`: hapus peran Artist/Multimodal. Peran sementara: `"Reviewer & second opinion (Codex CLI)"`, label UI `"Reviewer"` (bukan `"Artis"`), tanpa beret seniman. `desk_spot` tetap `desk_codex`. Persona ini **belum disetujui pemilik**: tandai "menunggu keputusan pemilik" di TSD v0.2. Jangan dihapus dan jangan diperluas.
  - Routing Hermes (PLAN-006, `test/kantor-hermes.test.ts`): intent gambar/lukisan/aset visual → **agy** (persona alex atau windry, sub-peran artist). Codex hanya menerima review/second opinion/teks.
  - Contoh tugas demo di `public/app/main.js` (`persona: 'codex'`, "Render visual 3D Kairosoft…") → pindahkan ke persona agy.
  - Rujukan gambar: ganti ke `docs/assets/floorplan-v2.jpg`.
- `npm test` wajib lulus. Tulis hasil di `LOG-005` bagian "Revisi 1".
- Larangan tetap berlaku: tanpa git commit/push, jangan menyentuh `~/.claude`, tanpa generate gambar baru di revisi ini.
