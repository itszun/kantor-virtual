# PLAN-001 — Kerangka kantor-api (event, status, SSE)

| Ukuran | S (target < 15 menit) | Branch | `feat/001-api-core` | Status | Siap dikerjakan |
| :-- | :-- | :-- | :-- | :-- | :-- |

## 1. Tujuan
Setelah tugas ini, `node src/server.ts` menjalankan server di `KANTOR_PORT` (default 8790) yang menerima event
aktivitas tim AI, menyimpan ke SQLite, menghitung status tiap persona (idle/working), dan menyiarkan snapshot ke
browser lewat SSE. Belum ada 3D, belum ada scanner, belum ada Director.

## 2. Konteks & rujukan
- Baca dulu: `GEMINI.md`, `docs/TSD-KANTOR-v0.1.md` §2, §4, §5, §6.
- Node 24: `node:http`, `node:sqlite` (`DatabaseSync`), `node:test`. File `.ts` dijalankan langsung (type-stripping).

## 3. Batas scope
**Boleh diubah/dibuat:** `package.json`, `config/personas.json`, `src/**`, `test/**`, `public/index.html` (placeholder sederhana), `docs/handoff/LOG-001-api-core.md`.

**Tidak boleh disentuh:** `docs/TSD-*`, `GEMINI.md`, `CLAUDE.md`, `tools/agy-run.sh`, apa pun di luar `~/Projects/kantor`.

## 4. Langkah yang diharapkan
1. Buat branch `feat/001-api-core` dari `main` (bila `main` belum punya commit, kerja langsung di working tree dan catat di LOG).
2. Tulis kerangka `docs/handoff/LOG-001-api-core.md` dari `_TEMPLATE_LOG.md` **sebelum** menulis kode.
3. `package.json`: `"type": "module"`, script `"start": "node src/server.ts"`, `"test": "node --test test/"`. Tanpa dependensi.
4. `config/personas.json`: 4 persona sesuai TSD §2 (`id`, `name`, `role`, `engine`, `color`, `desk_spot`: `desk_<id>`).
5. `src/config.ts`: baca env `KANTOR_PORT` (8790), `KANTOR_DB` (`data/kantor.db`), `KANTOR_INGEST_TOKEN_FILE` (wajib untuk ingest; bila tidak ada, `POST /api/events` selalu 503), `KANTOR_STALE_MIN_CLAUDE` (30), `KANTOR_STALE_MIN_AGY` (60). Muat `config/personas.json`.
6. `src/db.ts`: buka SQLite (buat folder `data/` bila perlu), `PRAGMA journal_mode=WAL`, buat tabel TSD §4 (`events`, `tasks`, `usage`, `scan_offsets`, `director_runs`, `persona_memory`) dengan `CREATE TABLE IF NOT EXISTS`. `usage.message_id` UNIQUE (boleh NULL).
7. `src/events.ts`: `validateEvent(body)` sesuai TSD §5 (persona & type dari daftar; title dipotong 120; level `technical|tactical|null`; angka usage bilangan bulat ≥ 0; tolak field tak dikenal di root dengan 400). `ingest(event)`:
   - simpan ke `events`;
   - `task.start` → insert/replace `tasks` status `running` (task_id kosong → buat id unik);
   - `task.end` / `task.fail` → tutup task (`done`/`failed`, `ended_at`); bila task_id kosong, tutup task running terbaru milik persona itu;
   - `usage` atau event dengan `usage` → insert ke tabel `usage` (`INSERT OR IGNORE` bila ada message_id).
8. `src/state.ts`: `snapshot()` → `{ ts, personas:[{id,name,role,color,state:"idle"|"working", spot, task:{id,title,level,started_at}|null, last_active_at}], stats:{ delegations_today, active_now, tokens_today, cost_today_usd } }`. "today" = hari kalender zona `Asia/Jakarta`. `spot` = `desk_spot` bila working, `"lounge"` bila idle. `sweepStale()` menandai task running yang melewati batas menit (agy untuk source `agy`, lainnya Claude) sebagai `stale`.
9. `src/server.ts` (node:http):
   - `GET /api/health` → `{ok:true}`
   - `POST /api/events` → Bearer token dibandingkan dengan `crypto.timingSafeEqual`; body maks 16 KB (413); JSON rusak 400; sukses 202 `{ok:true}`. Setelah ingest, siarkan snapshot ke SSE.
   - `GET /api/state` → snapshot.
   - `GET /api/history?limit=40` (maks 200) → task terbaru.
   - `GET /api/stream` → SSE (`text/event-stream`, `event: snapshot`), kirim snapshot saat connect, saat berubah, dan komentar heartbeat tiap 15 detik. Bersihkan klien saat `close`.
   - Selain itu sajikan file dari `public/` (GET saja, cegah path traversal, `index.html` untuk `/`, 404 bila tidak ada).
   - `sweepStale()` tiap 60 detik.
   - Ekspor fungsi `createServer(opts)` agar tes bisa memakai DB sementara dan port sendiri.
10. `public/index.html`: placeholder yang memuat `/api/state` dan menampilkannya sebagai daftar sederhana (akan diganti di PLAN-003/004).
11. Tes `test/*.test.ts` (DB di folder temp, port unik per file):
    - validasi: persona tak dikenal 400, type tak dikenal 400, title dipotong 120, body > 16 KB 413;
    - auth: tanpa token 401, token salah 401, token file tak ada 503;
    - alur: `task.start` alex → snapshot alex `working` di `desk_alex`; `task.end` → `idle` di `lounge`;
    - stats: dua `task.start` hari ini → `delegations_today` 2; usage dengan message_id sama dua kali → dihitung sekali;
    - stale: task agy dengan `started_at` 61 menit lalu → `sweepStale()` → persona idle;
    - SSE: klien menerima `event: snapshot` setelah POST event;
    - statis: `/../package.json` tidak bocor (404/400).

## 5. Kriteria selesai
- [ ] `npm test` lulus; output asli ditempel di LOG.
- [ ] `KANTOR_INGEST_TOKEN_FILE=<file temp> node src/server.ts` jalan, `curl /api/state` mengembalikan 4 persona (tempel output di LOG).
- [ ] Tidak ada dependensi npm baru.

## 6. Larangan (selalu berlaku)
- Patuhi `GEMINI.md` §1 (Tier 3: sudo, rm -rf, git commit/push/reset, membaca secret, menyentuh `~/.claude` atau proyek lain).
- Jangan membuat keputusan desain baru. Bila ragu, pilih opsi paling sederhana yang konsisten dengan TSD, lalu catat di LOG.
- Hentikan server yang kamu jalankan sebelum selesai (pakai PID yang kamu simpan; jangan `pkill -f` dengan pola).

## 7. Keluaran
`docs/handoff/LOG-001-api-core.md` dari `_TEMPLATE_LOG.md`.
