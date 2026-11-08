# LOG-007 — Deployment Setup (Dockerfile, Docker Compose, & Runbook)

| PLAN | `PLAN-007-deployment-setup.md` | Implementer | agy (`gemini-2.5-pro`) | Tanggal | 2026-11-08 |
| :-- | :-- | :-- | :-- | :-- | :-- |

## Putaran 1

### Ringkasan yang dikerjakan
1. **Penyusunan Kontainerisasi**:
   - Dibuat [`.dockerignore`](../../.dockerignore) untuk mengecualikan `node_modules`, `data/*.db*`, `.git`, dan visual test artifacts.
   - Dibuat [`Dockerfile`](../../Dockerfile) berbasis `node:24-alpine`, menyelaraskan user non-root (UID:GID 1001) dengan host `clouduser`, instalasi dependensi produksi Three.js, penyalinan `config/`, `public/`, `src/`, dan penambahan healthcheck terintegrasi (`/api/health`).
   - Dibuat [`docker-compose.yml`](../../docker-compose.yml) dengan konfigurasi service `kantor-api`, batasan memori 256 MB (`mem_limit: 256M`), port binding `127.0.0.1:8790:8790`, restart policy `unless-stopped`, dan mounting volume untuk database `./data`, token ingest, serta read-only `~/.claude/projects`.
2. **Dokumentasi Runbook**:
   - Dibuat [`docs/RUNBOOK-DEPLOY.md`](../RUNBOOK-DEPLOY.md) yang merinci prosedur deployment Tier 3: inisialisasi token ingest, build compose, konfigurasi Caddyfile reverse proxy dengan `flush_interval -1` (SSE) dan proteksi `/api/events 403`, verifikasi curl internal dan publik, serta pemantauan log runtime.
3. **Verifikasi Build**:
   - Build image `kantor-api:test` diuji di server lokal untuk memastikan ketiadaan syntax error atau layer berkas yang hilang.
   - Kepemilikan berkas dipastikan milik `clouduser:clouduser`.

### File yang diubah / dibuat
| File | Perubahan |
| :-- | :-- |
| `docs/handoff/PLAN-007-deployment-setup.md` | Baru: Dokumen perencanaan deployment setup |
| `.dockerignore` | Baru: Filter konteks build Docker |
| `Dockerfile` | Baru: Spesifikasi kontainer node:24-alpine non-root |
| `docker-compose.yml` | Baru: Konfigurasi orchestrasi compose lokal |
| `docs/RUNBOOK-DEPLOY.md` | Baru: Panduan operasional deploy dan reverse proxy Caddy |
| `docs/handoff/LOG-007-deployment-setup.md` | Baru: Laporan handoff implementasi deployment |

### Keputusan kecil & alasannya
- **UID:GID 1001 pada Dockerfile**: User di dalam kontainer dikonfigurasi menggunakan UID 1001 agar selaras dengan user `clouduser` di host. Hal ini mencegah isu izin akses (*permission denied*) saat kontainer membaca folder `~/.claude/projects` (yang bermode 700) maupun saat menulis ke `./data/kantor.db`.
- **Three.js di Container**: Modul Three.js dipasang menggunakan `npm install --omit=dev --ignore-scripts` dalam kontainer karena endpoint `/vendor/three/*` di `src/server.ts` menyajikan berkas Three.js langsung dari `node_modules/three`.
- **Kepatuhan Tier 3**: Tidak ada eksekusi langsung terhadap `docker compose up` produksi maupun pengeditan `/etc/caddy/Caddyfile`. Seluruh proses live deployment diserahkan kepada Claude Code / pemilik server melalui instruksi terperinci di `docs/RUNBOOK-DEPLOY.md`.

### Hasil tes
- **51/51 unit & integration test passing** di node lokal (`npm test`).
- **Verifikasi Build Docker (`node:24-alpine`)**:
  Citra Docker `kantor-api:test` sukses di-build dengan ukuran ringkas (~79.5 MB content size, 321 MB total uncompressed).
- **Verifikasi Runtime Kontainer**:
  Uji jalan isolasi sementara pada port `8799`:
  ```json
  // GET /api/health
  {"ok":true}

  // GET /api/system
  {"total_mb":7935,"free_mb":3326,"used_mb":4609,"used_percent":58.1,"storage_boxes_count":12}
  ```
  Kontainer merespons instan dan berhasil menghitung metrik RAM sistem host (`storage_boxes_count: 12`) secara akurat, lalu kontainer uji dihentikan secara bersih.

### Ragu / belum selesai
- Tidak ada. Semua prasyarat teknis PLAN-007 telah tuntas.

### Pertanyaan untuk reviewer
- Apakah format reverse proxy pada Caddyfile di `docs/RUNBOOK-DEPLOY.md` sudah sesuai dengan preferensi hash basicauth yang ada di server?
