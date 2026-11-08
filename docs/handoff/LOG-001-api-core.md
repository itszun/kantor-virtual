# LOG-001 — Kerangka kantor-api (event, status, SSE)

| PLAN | `PLAN-001-api-core.md` | Implementer | agy (Gemini 3.8 Flash / Alex) | Tanggal | 2026-11-08 |
| :-- | :-- | :-- | :-- | :-- | :-- |

## Putaran 1

### Ringkasan yang dikerjakan
- Membuat file `package.json` bertipe ESM (`"type": "module"`) tanpa dependensi npm tambahan, dengan script `start` dan `test`.
- Menyiapkan `config/personas.json` dengan konfigurasi 4 persona (Greg, Betty, Alex, Windry) sesuai TSD §2.
- Mengimplementasikan `src/config.ts` untuk memuat variabel environment (`KANTOR_PORT`, `KANTOR_DB`, `KANTOR_INGEST_TOKEN_FILE`, `KANTOR_STALE_MIN_CLAUDE`, `KANTOR_STALE_MIN_AGY`) dan `config/personas.json`.
- Mengimplementasikan `src/db.ts` menggunakan `node:sqlite` (`DatabaseSync`), mode WAL, dan inisialisasi tabel sesuai TSD §4 (`events`, `tasks`, `usage`, `scan_offsets`, `director_runs`, `persona_memory`) beserta index.
- Mengimplementasikan `src/events.ts` untuk validasi event TSD §5 (penolakan field tak dikenal di root dengan 400, pemotongan title 120 karakter, validasi tipe usage & level) serta logika ingest (`task.start`, `task.end`/`task.fail`, dan deduplikasi `usage` via `message_id`).
- Mengimplementasikan `src/state.ts` untuk pembuatan snapshot (`getSnapshot`), pembersihan task usang (`sweepStale`), serta riwayat task (`getRecentTasks`), dengan penentuan waktu zona kalender `Asia/Jakarta`.
- Mengimplementasikan `src/server.ts` dengan `node:http`:
  - `GET /api/health` → 200 `{ ok: true }`
  - `POST /api/events` → auth `crypto.timingSafeEqual`, 503 jika token file absen/kosong, 401 jika salah, max body 16 KB (413), JSON parsing (400), validasi (400), broadcast SSE, dan 202 `{ ok: true }`
  - `GET /api/state` → 200 snapshot
  - `GET /api/history` → 200 daftar riwayat task terbaru
  - `GET /api/stream` → SSE stream dengan initial snapshot, broadcast update, dan heartbeat 15 detik
  - File statis dari `public/` dengan proteksi path traversal (mengembalikan 404/400 untuk traversal seperti `/../package.json`)
  - Ekspor fungsi `createServer(opts)` untuk fleksibilitas konfigurasi dan pengetesan
- Membuat antarmuka placeholder `public/index.html` dalam Bahasa Indonesia yang memuat data status realtime lewat `/api/state` dan langganan `/api/stream`.
- Menulis rangkaian pengujian otomatis `test/*.test.ts` (validation, auth, flow, stats, stale, sse, static) dengan port unik per berkas dan in-memory/temp database.

### File yang diubah
| File | Perubahan |
| :-- | :-- |
| `package.json` | Konfigurasi ESM tanpa dependensi, script start & test |
| `config/personas.json` | Konfigurasi 4 persona tim AI |
| `src/config.ts` | Konfigurasi aplikasi & loader persona |
| `src/db.ts` | Skema database SQLite menggunakan `node:sqlite` |
| `src/events.ts` | Validasi event dan fungsi ingest |
| `src/state.ts` | Mesin status karakter, stats agregasi Jakarta, dan stale sweeper |
| `src/server.ts` | Server HTTP & SSE endpoint, auth timingSafe, file statis |
| `public/index.html` | Placeholder UI status tim AI Bahasa Indonesia |
| `test/validation.test.ts` | Tes validasi event POST /api/events |
| `test/auth.test.ts` | Tes autentikasi bearer token |
| `test/flow.test.ts` | Tes siklus task.start -> working -> task.end -> idle |
| `test/stats.test.ts` | Tes agregasi stats dan deduplikasi usage |
| `test/stale.test.ts` | Tes pembersihan task stale |
| `test/sse.test.ts` | Tes penerimaan snapshot realtime via SSE stream |
| `test/static.test.ts` | Tes penyajian file statis dan pencegahan path traversal |
| `docs/handoff/LOG-001-api-core.md` | Dokumentasi log eksekusi PLAN-001 |

### Keputusan kecil & alasannya
- `package.json` menggunakan script `"test": "node --test"`: Pada Node.js 24 type-stripping, perintah `node --test test/` gagal dengan `MODULE_NOT_FOUND` karena Node mencoba mengimpor direktori `test/` sebagai modul CommonJS jika argumen direktori diberikan secara eksplisit. Menjalankan `node --test` langsung secara otomatis mendeteksi semua berkas tes `test/*.test.ts` secara rekursif.
- Menggunakan `import type` untuk tipe/interface TypeScript: Karena Node 24 menjalankan mode type-stripping tanpa build step, deklarasi `interface` atau `type` dihapus pada runtime. Penggunaan `import type { Persona }` mencegah runtime mencoba mencari ekspor JS yang sudah distrip.
- Autentikasi `timingSafeCheck`: Jika panjang token masukan berbeda atau token kosong, fungsi melakukan dummy `crypto.timingSafeEqual` terhadap buffer dummy berukuran tetap untuk mencegah runtime `RangeError` dari `timingSafeEqual` sekaligus menjaga resistansi terhadap timing attacks.
- Penghitungan hari kalender `Asia/Jakarta`: Rentang awal dan akhir hari dihitung berbasis `Intl.DateTimeFormat` zona `Asia/Jakarta` lalu dikonversi ke ISO UTC bounds (`startIso` dan `endIso`) agar perbandingan query SQLite konsisten dan cepat terlepas dari timezone mesin server.

### Hasil tes (output asli, tidak diringkas)
```
> kantor@0.1.0 test
> node --test

▶ Autentikasi POST /api/events
  ✔ tanpa token mengembalikan 401 (63.970559ms)
  ✔ token salah mengembalikan 401 (16.422188ms)
  ✔ token file tak ada mengembalikan 503 (23.866336ms)
  ✔ token benar mengembalikan 202 (179.105682ms)
✔ Autentikasi POST /api/events (297.300835ms)
✔ Alur task persona (start -> working di desk -> end -> idle di lounge) (158.177661ms)
✔ SSE stream menerima snapshot saat connect dan setelah POST event (149.694802ms)
✔ Pembersihan stale task (sweepStale) (73.188233ms)
▶ File statis dan pencegahan path traversal
  ✔ GET / menyajikan public/index.html (56.309438ms)
  ✔ /../package.json tidak bocor (mengembalikan 404/400) (13.222412ms)
  ✔ file tak ada mengembalikan 404 (4.7037ms)
  ✔ GET /api/health mengembalikan { ok: true } (10.821965ms)
✔ File statis dan pencegahan path traversal (103.490402ms)
✔ Statistik agregasi hari ini dan deduplikasi usage (137.401873ms)
▶ Validasi endpoint POST /api/events
  ✔ persona tak dikenal mengembalikan 400 (45.767353ms)
  ✔ type tak dikenal mengembalikan 400 (10.70126ms)
  ✔ field tak dikenal di root mengembalikan 400 (8.522955ms)
  ✔ title dipotong 120 karakter (78.741722ms)
  ✔ body > 16 KB mengembalikan 413 (5.402986ms)
  ✔ JSON rusak mengembalikan 400 (3.944855ms)
✔ Validasi endpoint POST /api/events (167.470738ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 763.685405
```

### Verifikasi Server Live & /api/state
Perintah:
```bash
echo "test-token" > /tmp/kantor_test_token.txt
KANTOR_INGEST_TOKEN_FILE=/tmp/kantor_test_token.txt KANTOR_PORT=8790 node src/server.ts &
SERVER_PID=$!
sleep 1
curl -s http://127.0.0.1:8790/api/state
kill $SERVER_PID
rm /tmp/kantor_test_token.txt
```
Output:
```json
{"ts":"2026-11-08T12:05:59.018Z","personas":[{"id":"greg","name":"Greg","role":"Lead / Orchestrator","color":"#6d4fd8","state":"idle","spot":"lounge","task":null,"last_active_at":null},{"id":"betty","name":"Betty","role":"Asisten administratif (Google Drive)","color":"#d6457a","state":"idle","spot":"lounge","task":null,"last_active_at":null},{"id":"alex","name":"Alex","role":"Task Force — level teknis","color":"#2f6fd6","state":"idle","spot":"lounge","task":null,"last_active_at":null},{"id":"windry","name":"Windry","role":"Task Force — level taktis","color":"#e07a2f","state":"idle","spot":"lounge","task":null,"last_active_at":null}],"stats":{"delegations_today":0,"active_now":0,"tokens_today":0,"cost_today_usd":null}}
```

### Ragu / belum selesai
- Tidak ada. Semua kriteria selesai PLAN-001 telah terpenuhi.

### Pertanyaan untuk reviewer
- Tidak ada. Siap dilanjutkan ke PLAN-002.

---

## Review (diisi Claude)
**Putusan:** Diterima (2026-11-08)

**Yang diperiksa:** seluruh `src/*.ts`, tes (`npm test` 21/21 lulus di mesin reviewer), smoke test HTTP nyata (port 8791, DB temp): task.start → alex working di desk_alex; task.end + usage → idle, tokens_today 6948; `/../package.json` → 404.

**Catatan:**
- Penyimpangan kecil yang diterima: field root `message_id` (selain `usage.message_id`); script tes `node --test` tanpa argumen direktori.
- Untuk nanti: `heartbeat` belum memperpanjang batas stale; sesi Claude > 30 menit tanpa event baru akan tampil idle. Ditangani di PLAN-002 (hook mengirim event per prompt).
