# TSD Kantor v0.2 — Ekspansi Kairosoft 3D Voxel, Persona Codex & Hermes, 8 Zona Ruang, & Deployment Setup

| Versi | 0.2 | Tanggal | 2026-11-08 | Pemilik | clouduser | Kontributor | Claude (Greg), AGY (Alex & Windry), Codex, Hermes | Status | Implementasi Selesai (Siap Review & Merge) |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |

---

## 1. Tujuan & Latar Belakang

Dokumen ini merumuskan spesifikasi teknis untuk **Kantor v0.2**, melanjutkan fondasi sukses dari v0.1 (`docs/TSD-KANTOR-v0.1.md`). 

Pembaruan utama pada v0.2:
1. **Gaya Visual Kairosoft 3D Voxel/Pixel Diorama:** Mengadopsi estetika *retro simulation* ala Kairosoft (*Game Dev Story*) dengan karakter sprite chibi yang interaktif, hangat, dan ekspresif.
2. **Ekspansi 8 Zona Kantor:**
   - *Lobby Office* dengan meja resepsionis dan area duduk *Sunken Tatami* (*horigotatsu*).
   - *Hermes Command Desk* (modul heksagonal operator retro-cyber).
   - *Claude Strategy Room* (ruang rapat kaca kedap suara dengan papan tulis arsitektur).
   - *AGY Engineering Bay* (multi-monitor developer setup & rak server berkedip).
   - *Art Atelier (agy)* (kuda-kuda lukis, tripod kamera, kanvas hasil kreasi artist agy).
   - *Meditation Room* (altar rupang Buddha emas, dupa, bantalan meditasi tatami).
   - *Game Room* (konsol PlayStation 5, TV flat screen 40 inci, sofa santai).
   - *Storage Room* (rak gudang kardus yang memvisualisasikan kapasitas & pemakaian RAM server asli).
3. **Penambahan Persona ke-5: Codex (menunggu keputusan pemilik):** Entitas evaluasi & second opinion via CLI (`tools/kantor-codex.sh`). Catatan: Pelukis/artis kantor resmi adalah **agy** lewat subagent artist miliknya sendiri.
4. **Telemetri Fisik RAM Server:** Jumlah tumpukan boks kardus di *Storage Room* dikendalikan secara dinamis oleh pemakaian memori nyata server (`os.freemem()` vs `os.totalmem()`).

---

## 2. Persona Studio v0.2

Konfigurasi diperluas di `config/personas.json`:

| id | Nama | Peran | Mesin | Profil biaya/beban | Warna | Spot Meja Default |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `greg` | Greg | Lead / Orchestrator | Claude Code (sesi utama) | biaya tinggi, beban tinggi | ungu `#6d4fd8` | `desk_greg` |
| `betty` | Betty | Asisten administratif (Google Drive) | Claude Code (subagent `betty`) | biaya tinggi, beban rendah | merah muda `#d6457a` | `desk_betty` |
| `alex` | Alex | Task Force — level teknis & Artist | agy | biaya rendah, beban tinggi | biru `#2f6fd6` | `desk_alex` |
| `windry` | Windry | Task Force — level taktis | agy | biaya rendah, beban tinggi | oranye `#e07a2f` | `desk_windry` |
| `codex` | Codex | Reviewer & second opinion (Codex CLI) *(menunggu keputusan pemilik)* | codex CLI / API | biaya sedang, beban telaah | hijau emerald `#10a37f` | `desk_codex` |
| `hermes` | Hermes | Orchestrator & Dispatcher | Hermes Agent | biaya rendah, beban dispatch | cyan `#06b6d4` | `desk_hermes` |
| — | (Director) | Penggerak perilaku santai | DeepSeek / Hermes adapter | biaya rendah, beban rendah | — | tidak tampil fisik |

---

## 3. Arsitektur Komponen & Alur Telemetri

```
Claude Code hooks ──┐
transcript scanner ─┤                       ┌─ SSE /api/stream ──► Browser (Three.js Kairosoft 3D)
tools/kantor-agy.sh ┼─► kantor-api (Node 24) ┤                      - 8 Zona Ruang
tools/kantor-codex.sh ┤   node:sqlite          └─ GET /api/state, /api/history, /api/usage, /api/system
Director (DeepSeek) ┘
```

### 3.1 Wrapper Baru: `tools/kantor-codex.sh` & `tools/kantor-codex.ts`
Mengikuti pola `kantor-agy.ts`:
* Mengirim `task.start` ke `POST /api/events` dengan persona `codex`.
* Menjalankan binary `@openai/codex` CLI lokal secara headless/subproses:
  ```bash
  tools/kantor-codex.sh --title "Review arsitektur sistem" -- codex exec "..."
  ```
* Menangkap status keluaran, menghitung estimasi penggunaan, dan mengirim `task.end` / `task.fail`.
* Memperbarui visual sprite Codex di 3D office dengan meja kerja di `desk_codex`.

### 3.2 Telemetri RAM Server (Storage Room Ingest)
Endpoint `GET /api/system` (atau diselipkan dalam snapshot SSE):
```json
{
  "total_mem_mb": 16384,
  "used_mem_mb": 8192,
  "used_percent": 50.0,
  "storage_boxes_count": 10
}
```
* Three.js client membaca jumlah `storage_boxes_count` (formula: `Math.round((used_percent / 100) * MAX_BOXES)`).
* Objek kardus di rak gudang di-render secara instanced mesh (`THREE.InstancedMesh`) untuk efisiensi render 60 FPS.

---

## 4. Spesifikasi Geometri 8 Zona (`config/office.json`)

Ekspansi area ruang dari `20x12` menjadi layout modular bersudut:

### 4.1 Spots Baru yang Wajib Terdaftar di `spots`:
1. `atelier_agy`: Posisi meja kanvas seni di Art Atelier (agy).
2. `meditation_1`, `meditation_2`: Bantalan tatami di depan altar rupang Buddha.
3. `buddha_altar`: Spot altar patung Buddha dan pembakaran dupa.
4. `ps5_sofa_1`, `ps5_sofa_2`: Sofa depan TV flat screen Game Room.
5. `sunken_tatami_1`, `sunken_tatami_2`: Area duduk santai lantai rendah di Lobby.
6. `reception_desk`: Tempat berdiri sprite resepsionis.
7. `storage_rack`: Posisi rak besi gudang logistik RAM.

### 4.2 Waypoints & Graph Edges
Semua spot baru harus memiliki simpul (*node*) dan terhubung dengan graf navigasi utama sehingga algoritma *pathfinding* A* di `src/pathfinding.ts` dapat menemukan rute valid tanpa tabrakan dinding.

---

## 5. Rencana Transisi & Verifikasi (Selesai Dikerjakan)

1. **PLAN-005 (Kairosoft 3D Voxel Studio & 8 Zona):**
   * Registrasi persona `codex` di `config/personas.json`.
   * Registrasi 12 spot baru dan koneksi waypoint navigasi di `config/office.json`.
   * Implementasi prosedural Three.js 60 FPS untuk 8 zona Kairosoft dan `updateStorageBoxes` via `THREE.InstancedMesh`.
   * Bukti screenshot visual di `docs/handoff/shots/005-kairosoft-desktop.png` dan `005-kairosoft-mobile.png`.
2. **PLAN-006 (Hermes Orchestrator & Dispatcher Daemon):**
   * Registrasi persona `hermes` di `config/personas.json` dengan spot `desk_hermes`.
   * Pembangunan dispatcher `tools/kantor-hermes.sh` dan CLI wrapper `tools/kantor-codex.sh`.
   * Pengujian intent classification dan eksekusi telemetri API.
3. **PLAN-007 (Deployment Setup & Kontainerisasi):**
   * Penyusunan `Dockerfile` (`node:24-alpine` non-root UID 1001), `docker-compose.yml`, `.dockerignore`, dan `docs/RUNBOOK-DEPLOY.md`.
   * Verifikasi build citra Docker dan uji runtime isolasi berhasil 100%.
4. **Hasil Verifikasi Akhir:**
   * **51/51 automated tests lulus (100% hijau, 0 error)** (`npm test`).
   * Seluruh kepemilikan berkas dipastikan `clouduser:clouduser`.
   * Seluruh perubahan siap direview dan di-commit oleh Claude Code (`Greg`).
