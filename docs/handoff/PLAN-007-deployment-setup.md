# PLAN-007 — Deployment Setup (Dockerfile, Docker Compose, & Runbook)

| Ukuran | S (target < 15 menit) | Branch | `feat/005-kairosoft-v0.2` | Status | Siap Dikerjakan |
| :-- | :-- | :-- | :-- | :-- | :-- |

---

## 1. Tujuan

Menyediakan infrastruktur kontainerisasi dan dokumentasi deployment produksi sesuai spesifikasi [`docs/TSD-KANTOR-v0.1.md`](../TSD-KANTOR-v0.1.md) §9 & §10:
1. **Dockerfile (`node:24-alpine`)**:
   - Image minimalis, non-root user (UID 1001 / `kantor` yang selaras dengan `clouduser`), dukungan built-in Node 24 (`node:sqlite`, direct TypeScript execution via strip types).
   - Serving modul vendor Three.js (`node_modules/three`).
   - Built-in Healthcheck pada `/api/health`.
2. **Docker Compose (`docker-compose.yml`)**:
   - Service `kantor-api` dengan alokasi memori terkendali (`mem_limit: 256m`).
   - Binding port lokal `127.0.0.1:8790:8790`.
   - Volume persisten `./data` (rw), volume read-only `~/.claude/projects` (`/claude-projects:ro`), dan volume token ingest `~/.config/kantor/ingest_token`.
3. **Runbook Deployment (`docs/RUNBOOK-DEPLOY.md`)**:
   - Panduan lengkap Tier 3 untuk pemilik server (Caddy reverse proxy `kantor.weiwu.my.id`, basicauth, SSE `flush_interval -1`, proteksi `/api/events`, DNS, token ingest, dan verifikasi endpoint).

---

## 2. Batas Scope

**Boleh dibuat/diubah:**
- `Dockerfile` (baru)
- `.dockerignore` (baru)
- `docker-compose.yml` (baru)
- `docs/RUNBOOK-DEPLOY.md` (baru)
- `docs/handoff/PLAN-007-deployment-setup.md` & `LOG-007-deployment-setup.md` (baru)

**Tidak boleh disentuh (Aturan Tier 3 & Guardrails):**
- Tidak mengeksekusi `docker compose up` produksi secara langsung.
- Tidak mengedit `/etc/caddy/Caddyfile` atau memodifikasi konfigurasi DNS/firewall sistem.
- Tidak mengubah berkas di luar repositori `~/Projects/kantor/`.

---

## 3. Rincian Langkah Implementasi

1. **Buat `.dockerignore`**: Kecualikan `node_modules`, `.git`, `data/*.db`, file log, dan shots pengujian agar konteks build Docker ringkas.
2. **Buat `Dockerfile`**:
   - Base `node:24-alpine`.
   - Setup user non-root UID:GID 1001.
   - Install dependencies produksi `npm install --omit=dev --ignore-scripts`.
   - Copy folder `config/`, `public/`, `src/`.
   - Deklarasikan volume `/app/data` dan ekspose port 8790.
3. **Buat `docker-compose.yml`**:
   - Proyek `kantor`, service `kantor-api`.
   - Batas memori `256m`, restart `unless-stopped`.
   - Environment variables dan volume mappings.
4. **Buat `docs/RUNBOOK-DEPLOY.md`**:
   - Prosedur persiapan token, konfigurasi Caddyfile, verifikasi DNS, dan health check.
5. **Verifikasi Build Docker**:
   - Jalankan `docker build -t kantor-api:test .` untuk memvalidasi tidak ada syntax error atau missing files pada layer image.
6. **Pastikan Kepemilikan & Dokumentasi**:
   - Enforce `chown -Rh clouduser:clouduser` dan susun `LOG-007-deployment-setup.md`.
