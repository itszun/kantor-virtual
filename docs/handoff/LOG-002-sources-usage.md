# LOG-002 — Sumber event & token (hook Claude, scanner transcript, wrapper agy)

| PLAN | `PLAN-002-sources-usage.md` | Implementer | agy (Alex - Gemini 3.8 Flash) | Tanggal | 2026-11-08 |
| :-- | :-- | :-- | :-- | :-- | :-- |

## Putaran 1

### Ringkasan yang dikerjakan
1. **`src/hookmap.ts`**: Implementasi fungsi murni `mapHook(input)` untuk memetakan hook event dari Claude Code (`UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`) ke format `KantorEvent`. Persona `betty` digunakan bila `agent_type === 'betty'`, selain itu default ke `greg`. Title dibatasi maksimal 120 karakter dengan whitespace dirapatkan.
2. **`tools/claude-hook.ts` & `tools/claude-hook.sh`**: Wrapper hook Claude Code yang membaca stdin, memetakan payload via `mapHook`, lalu mengirimkan POST ke `$KANTOR_URL/api/events` menggunakan bearer token dari `KANTOR_INGEST_TOKEN_FILE` (default `~/.config/kantor/ingest_token`) dengan AbortController timeout 2 detik. Selalu exit 0 dan membungkam output stdout/stderr saat terjadi error (termasuk server mati, token hilang, atau JSON rusak).
3. **`config/pricing.json` & `src/pricing.ts`**: Membuat kerangka konfigurasi harga model tanpa mengisi angka harga (`{"currency":"USD","unit":"per_million_tokens","models":{}}`). Contoh entri model untuk diisi:
   ```json
   "<model>": {"input":0,"output":0,"cache_read":0,"cache_write_5m":0,"cache_write_1h":0}
   ```
   Di `src/pricing.ts`, fungsi `costFor(model, usageDetail, pricing)` menghitung biaya per juta token berdasarkan input, output, cache read, dan rincian cache write 5m/1h (fallback ke 5m jika tidak terinci). Mengembalikan `null` jika model tidak ada pada tabel harga.
4. **`src/scanner.ts`**: Pemindai transcript Claude Code secara inkremental membaca direktori proyek (`.jsonl`), mencatat byte offset di tabel `scan_offsets`, memproses hanya baris lengkap, melewati baris lebih tua dari `KANTOR_SCAN_MAX_AGE_DAYS` (default 7 hari), mendeteksi subagent meta (`agentType === 'betty'`), dan menyimpan token & biaya ke tabel `usage` dengan deduplikasi `message_id`.
5. **`src/state.ts`**: Memperbarui rumus token hari ini menjadi `tokens_today = input + output + cache_read + cache_write` (token `thinking` tidak dijumlahkan ke total).
6. **`tools/kantor-agy.ts` & `tools/kantor-agy.sh`**: Wrapper CLI untuk `agy` yang menerima flag `--persona alex|windry`, `--title`, `--level`, dan argumen agy setelah `--`. Mengirimkan `task.start`, menjalankan agy (secara otomatis menyertakan `--output-format json` jika ada `-p`/`--print`), mencetak `response` ke stdout, dan mengirim `task.end` / `task.fail` beserta usage ke API Kantor tanpa memblokir atau menggagalkan wrapper jika API Kantor bermasalah.
7. **`src/usage.ts` & `GET /api/usage`**: Endpoint laporan agregasi penggunaan token & estimasi biaya per rentang hari (1–31 hari, default 7) dalam zona waktu `Asia/Jakarta`, dikelompokkan berdasarkan tanggal, persona, model, serta ringkasan total. Diintegrasikan ke `src/server.ts` bersama background timer scanner.
8. **Pengujian**: Menambahkan test suite komprehensif (`test/hookmap.test.ts`, `test/claude-hook.test.ts`, `test/scanner.test.ts`, `test/kantor-agy.test.ts`, `test/usage.test.ts`), serta memperbarui ekspektasi di `test/stats.test.ts` agar sesuai rumus token baru. Seluruh 26 tes lulus tanpa jaringan.

### File yang diubah
| File | Perubahan |
| :-- | :-- |
| `src/hookmap.ts` | Dibuat: Pemetaan murni hook Claude Code ke KantorEvent |
| `tools/claude-hook.ts` | Dibuat: Eksekutor hook dengan timeout 2s, pembacaan token, dan silent exit 0 |
| `tools/claude-hook.sh` | Dibuat: Skrip shell pemanggil `tools/claude-hook.ts` |
| `config/pricing.json` | Dibuat: Skema tabel harga kosong |
| `src/pricing.ts` | Dibuat: Fungsi penghitungan biaya token model `costFor` & `loadPricing` |
| `src/scanner.ts` | Dibuat: Scanner inkremental transcript Claude |
| `src/state.ts` | Diubah: Rumus `tokens_today` tidak menyertakan `thinking` |
| `tools/kantor-agy.ts` | Dibuat: Wrapper CLI agy dengan inject `--output-format json` dan ingest event |
| `tools/kantor-agy.sh` | Dibuat: Skrip shell pemanggil `tools/kantor-agy.ts` |
| `src/usage.ts` | Dibuat: Perhitungan agregasi laporan usage hari, persona, dan model (Asia/Jakarta) |
| `src/config.ts` | Diubah: Penambahan konfigurasi env scanner & pricing |
| `src/server.ts` | Diubah: Endpoint `GET /api/usage` dan pemanggilan background scanner |
| `test/stats.test.ts` | Diubah: Penyesuaian ekspektasi `tokens_today` sesuai rumus baru |
| `test/hookmap.test.ts` | Dibuat: Tes pemetaan 4 event hook, unknown event, dan persona Betty |
| `test/claude-hook.test.ts` | Dibuat: Tes exit 0 hook saat server mati/JSON rusak, serta penerimaan event saat server hidup |
| `test/scanner.test.ts` | Dibuat: Tes deduplikasi message_id, pembacaan offset inkremental, batas umur 7 hari, subagent meta, dan harga |
| `test/fixtures/fake-agy.sh` | Dibuat: Fixture agy palsu untuk pengujian wrapper |
| `test/kantor-agy.test.ts` | Dibuat: Tes alur start/end/fail wrapper agy dan injeksi `--output-format json` |
| `test/usage.test.ts` | Dibuat: Tes agregasi `GET /api/usage` per hari, persona, dan model |
| `docs/handoff/LOG-002-sources-usage.md` | Dibuat: Catatan kerja dan hasil pengujian |

### Keputusan kecil & alasannya
- Menggunakan `spawn` asynchronous (bukan `spawnSync`) pada pengujian yang menjalankan skrip klien terhadap server lokal di proses pengujian yang sama, guna mencegah blocking pada Node.js event loop agar server HTTP tetap dapat merespons permintaan.
- Pada `tools/kantor-agy.ts`, jika `--title` tidak disediakan secara eksplisit, judul tugas diambil dari prompt `-p`/`--print` (dipotong 120 karakter) atau fallback ke `"Tugas <persona>"`.
- Pada `src/usage.ts`, tanggal diformat menggunakan `Intl.DateTimeFormat` dengan zona waktu `Asia/Jakarta` (`en-CA` format `YYYY-MM-DD`), dan nilai `cost_usd` bernilai `null` apabila seluruh row pada agregasi tersebut tidak memiliki informasi biaya.

### Hasil tes (output asli, tidak diringkas)
1. **Kriteria 1: `npm test` lulus (26 tes)**
```
> kantor@0.1.0 test
> node --test

▶ Autentikasi POST /api/events
  ✔ tanpa token mengembalikan 401 (62.748832ms)
  ✔ token salah mengembalikan 401 (15.635668ms)
  ✔ token file tak ada mengembalikan 503 (10.192376ms)
  ✔ token benar mengembalikan 202 (63.641631ms)
✔ Autentikasi POST /api/events (166.339781ms)
✔ claude-hook.sh: perilaku hook Claude Code (967.637937ms)
✔ Alur task persona (start -> working di desk -> end -> idle di lounge) (155.716571ms)
✔ mapHook: pemetaan event hook Claude Code (3.57672ms)
✔ kantor-agy.sh: wrapper agy untuk alex dan windry (1199.09087ms)
✔ scanner: pemindaian transcript Claude secara inkremental dan akurat (9.758005ms)
✔ SSE stream menerima snapshot saat connect dan setelah POST event (158.396396ms)
✔ Pembersihan stale task (sweepStale) (86.210747ms)
▶ File statis dan pencegahan path traversal
  ✔ GET / menyajikan public/index.html (51.825454ms)
  ✔ /../package.json tidak bocor (mengembalikan 404/400) (21.725394ms)
  ✔ file tak ada mengembalikan 404 (16.157433ms)
  ✔ GET /api/health mengembalikan { ok: true } (10.914104ms)
✔ File statis dan pencegahan path traversal (118.474821ms)
✔ Statistik agregasi hari ini dan deduplikasi usage (120.274955ms)
✔ GET /api/usage: laporan agregasi token & biaya per hari, persona, dan model (112.283261ms)
▶ Validasi endpoint POST /api/events
  ✔ persona tak dikenal mengembalikan 400 (59.808148ms)
  ✔ type tak dikenal mengembalikan 400 (13.972556ms)
  ✔ field tak dikenal di root mengembalikan 400 (15.229477ms)
  ✔ title dipotong 120 karakter (54.865255ms)
  ✔ body > 16 KB mengembalikan 413 (5.259423ms)
  ✔ JSON rusak mengembalikan 400 (4.18298ms)
✔ Validasi endpoint POST /api/events (169.555428ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1698.092216
```

2. **Kriteria 2: `echo '{"hook_event_name":"Stop","session_id":"x"}' | tools/claude-hook.sh; echo $?` saat server mati**
```
0
```

3. **Kriteria 3: Tidak ada dependensi npm baru**
`package.json` tetap tanpa dependensi runtime baru.

### Ragu / belum selesai
- Tidak ada. Semua kriteria selesai terpenuhi.

### Pertanyaan untuk reviewer
- Struktur tabel harga di `config/pricing.json` sudah disiapkan dengan format `per_million_tokens`. Model dan tarif dapat diisikan oleh Claude setelah verifikasi harga resmi.

---

## Review (diisi Claude)
**Putusan:** Diterima (2026-11-08)

**Yang diperiksa:** `src/scanner.ts`, `tools/claude-hook.ts`, `tools/kantor-agy.ts`, diff `src/server.ts`; `npm test` 26/26; dry-run scanner terhadap transcript asli (read-only, DB temp): 43 file, rescan tanpa perubahan 4 ms dan 0 baris baru; persona/model terpisah benar.

**Perubahan reviewer:**
- `src/server.ts`: siarkan snapshot SSE bila scan menambah baris usage (sebelumnya token baru tampil hanya saat ada event lain).
- `config/pricing.json`: diisi harga resmi (platform.claude.com/docs pricing, 2026-11-08).

**Catatan untuk nanti:** scan pertama membaca file utuh secara sinkron (OK untuk 139 MB saat ini); baris model `<synthetic>` ikut tercatat dengan usage 0.
