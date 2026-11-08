# PLAN-002 — Sumber event & token (hook Claude, scanner transcript, wrapper agy)

| Ukuran | S/M (target < 15 menit) | Branch | `feat/002-sources-usage` | Status | Siap dikerjakan |
| :-- | :-- | :-- | :-- | :-- | :-- |

## 1. Tujuan
Setelah tugas ini, aktivitas nyata masuk ke kantor-api dari tiga sumber: (a) hook Claude Code, (b) pemindai
transcript Claude untuk token & biaya, (c) wrapper agy untuk Alex/Windry beserta token-nya. Ada endpoint
`GET /api/usage` untuk tab Token. **Kamu tidak memasang apa pun di `~/.claude`**; Claude yang memasangnya nanti.

## 2. Konteks & rujukan
- Baca dulu: `GEMINI.md`, TSD §5 (5.1, 5.2), §6; kode PLAN-001 di `src/` (`ingest`, tabel `usage`, `scan_offsets`).
- Fakta yang sudah diverifikasi Claude (2026-11-08):
  - Transcript Claude: `~/.claude/projects/<proyek>/<session>.jsonl`. Baris `{"type":"assistant","timestamp":ISO,"sessionId":..., "message":{"id":"msg_…","model":"claude-opus-5-5","usage":{"input_tokens","output_tokens","cache_read_input_tokens","cache_creation_input_tokens","cache_creation":{"ephemeral_5m_input_tokens","ephemeral_1h_input_tokens"},"output_tokens_details":{"thinking_tokens"}}}}`.
  - Satu `message.id` bisa muncul di beberapa baris dengan `usage` **identik** → hitung sekali.
  - Subagent: `~/.claude/projects/<proyek>/<session>/subagents/agent-<id>.jsonl` + `agent-<id>.meta.json` berisi `{"agentType":"general-purpose", "description":..., "model":"haiku", ...}`.
  - `agy -p "..." --output-format json` mencetak satu objek JSON: `{"conversation_id","status":"SUCCESS","response","duration_seconds","num_turns","usage":{"input_tokens","output_tokens","thinking_tokens","cache_read_tokens","total_tokens"}}`. `total_tokens` = input + output (thinking tidak termasuk).
  - Input hook Claude Code (JSON di stdin) selalu punya `session_id`, `transcript_path`, `cwd`, `hook_event_name`. `UserPromptSubmit` punya `prompt`. `SubagentStart`/`SubagentStop` punya `agent_id` dan `agent_type` (anggap bisa tidak ada; tangani dengan aman).

## 3. Batas scope
**Boleh diubah/dibuat:** `src/hookmap.ts`, `src/scanner.ts`, `src/pricing.ts`, `src/usage.ts`, `src/state.ts` (hanya rumus token, lihat langkah 6), `src/server.ts` (tambah `/api/usage` + start scanner), `src/config.ts` (env baru), `config/pricing.json`, `tools/claude-hook.sh`, `tools/claude-hook.ts`, `tools/kantor-agy.sh`, `tools/kantor-agy.ts`, `test/**`, `docs/handoff/LOG-002-sources-usage.md`.

**Tidak boleh disentuh:** `public/**`, `config/office.json`, `~/.claude/**`, `docs/TSD-*`, `GEMINI.md`. Jangan membaca transcript asli di `~/.claude/projects` dari tes; pakai fixture di `test/fixtures/`.

## 4. Langkah yang diharapkan
1. Tulis kerangka LOG-002 dulu.
2. **`src/hookmap.ts`** — fungsi murni `mapHook(input) → KantorEvent | null`:
   - `UserPromptSubmit` → `{source:"claude-hook", persona:"greg", type:"task.start", task_id:"claude-"+session_id, title: prompt (spasi dirapatkan, potong 120)}`.
   - `Stop` → `{persona:"greg", type:"task.end", task_id:"claude-"+session_id}`.
   - `SubagentStart` → persona `betty` bila `agent_type === "betty"`, selain itu `greg`; `type:"task.start"`, `task_id:"sub-"+agent_id` (bila `agent_id` kosong: `"sub-"+session_id+"-"+agent_type`), `title: "Delegasi: "+agent_type`.
   - `SubagentStop` → `task.end` dengan task_id yang sama aturannya.
   - Event lain → `null`.
3. **`tools/claude-hook.ts`** + **`tools/claude-hook.sh`** (sh hanya `exec node <dir>/claude-hook.ts`): baca stdin, `mapHook`, POST ke `${KANTOR_URL:-http://127.0.0.1:8790}/api/events` dengan token dari `KANTOR_INGEST_TOKEN_FILE` (default `~/.config/kantor/ingest_token`). Timeout total 2 detik (AbortController). **Wajib:** tidak mencetak apa pun ke stdout/stderr, dan selalu exit 0 (termasuk JSON rusak, server mati, token tidak ada).
4. **`config/pricing.json`** — struktur saja, **jangan isi angka harga** (Claude yang mengisi setelah verifikasi):
   `{"currency":"USD","unit":"per_million_tokens","models":{}}`, dengan contoh bentuk di LOG: `"<model>": {"input":0,"output":0,"cache_read":0,"cache_write_5m":0,"cache_write_1h":0}`.
   **`src/pricing.ts`**: `costFor(model, usageDetail) → number | null` (null bila model tidak ada di tabel). Cache write: pakai rincian 5m/1h bila ada, kalau tidak ada anggap semua 5m.
5. **`src/scanner.ts`** — `scanOnce(db, rootDir, pricing, now)`:
   - Telusuri `rootDir/**.jsonl` (rekursif; abaikan symlink). Per file pakai `scan_offsets`: baca dari offset, proses hanya baris lengkap (berakhir `\n`), simpan offset baru. Bila ukuran file < offset → mulai dari 0.
   - Lewati baris dengan `timestamp` lebih tua dari `KANTOR_SCAN_MAX_AGE_DAYS` (default 7) — mencegah impor riwayat lama saat pertama jalan.
   - Ambil hanya `type === "assistant"` yang punya `message.id` dan `message.usage`. Baris JSON rusak dilewati (jangan crash).
   - Persona: file di dalam folder `subagents/` → baca `agent-<id>.meta.json` (`agentType === "betty"` → `betty`, selain itu `greg`); file lain → `greg`.
   - Simpan ke `usage` dengan `source:"claude-transcript"`, `message_id`, `model`, `ts` = timestamp baris, `input`, `output`, `cache_read`, `cache_write` (= cache_creation_input_tokens), `thinking`, `cost_usd = costFor(...)`. Duplikat `message_id` → abaikan.
   - Dijalankan oleh server tiap `KANTOR_SCAN_INTERVAL_S` (default 60) bila `KANTOR_CLAUDE_PROJECTS` di-set; bila tidak di-set, scanner mati. Error scanner dicatat ke stderr, server tetap jalan.
6. **Rumus token di `src/state.ts`**: `tokens_today = input + output + cache_read + cache_write` (thinking **tidak** dijumlah, hanya informasi, karena sudah termasuk/terpisah tergantung sumber).
7. **`tools/kantor-agy.ts`** + **`tools/kantor-agy.sh`**: `kantor-agy.sh --persona alex|windry [--title "..."] [--level technical|tactical] -- <argumen agy>`.
   - Level default: alex → `technical`, windry → `tactical`. Persona lain → error exit 2.
   - Kirim `task.start` (task_id `agy-<waktu>-<acak>`, source `agy`, title default = 120 karakter pertama dari prompt `-p`).
   - Jalankan `agy` (path dari env `KANTOR_AGY_BIN`, default `agy`) dengan argumen apa adanya; bila ada `-p`/`--print` dan tidak ada `--output-format`, tambahkan `--output-format json`. Teruskan stdin/stderr; stdout ditangkap.
   - Bila stdout JSON valid: cetak `response` ke stdout (supaya tetap terbaca manusia), ambil `usage`. Bila bukan JSON: cetak apa adanya.
   - Kirim `task.end` (exit 0 dan status bukan error) atau `task.fail`, dengan `usage` dan `model` (dari argumen `--model` bila ada). `cost_usd` null.
   - Exit code wrapper = exit code agy. Gagal kirim event **tidak boleh** menggagalkan wrapper (cukup peringatan satu baris di stderr).
8. **`src/usage.ts` + `GET /api/usage?days=7`** (maks 31): `{ days:[{date, by_persona:{greg:{tokens,cost_usd},...}}], by_model:[{model,tokens,cost_usd}], totals:{tokens,cost_usd} }`, tanggal zona Asia/Jakarta. `cost_usd` null bila semua baris null.
9. Tes (fixture di `test/fixtures/claude-projects/…`, DB temp, port unik):
   - hookmap: keempat event + event tak dikenal + agent_type betty;
   - claude-hook.ts: server mati → exit 0 tanpa output; JSON rusak → exit 0 tanpa output; server hidup → event diterima;
   - scanner: duplikat message_id dihitung sekali; scan kedua tanpa perubahan tidak menambah baris; baris baru ditambahkan → hanya baris baru dibaca; baris tak lengkap di akhir tidak diproses sampai lengkap; meta betty → persona betty; baris > 7 hari dilewati; harga dari pricing fixture menghasilkan cost yang benar; model tanpa harga → cost null;
   - kantor-agy: agy palsu (`test/fixtures/fake-agy.sh` mencetak JSON berisi usage) → task.start + task.end dengan usage tercatat; agy palsu exit 1 → task.fail dan wrapper exit 1; `--output-format json` ditambahkan otomatis;
   - `/api/usage` mengelompokkan per hari/persona/model.

## 5. Kriteria selesai
- [ ] `npm test` lulus (termasuk 21 tes lama); output asli di LOG.
- [ ] `echo '{"hook_event_name":"Stop","session_id":"x"}' | tools/claude-hook.sh; echo $?` mencetak hanya `0` saat server mati (tempel di LOG).
- [ ] Tidak ada dependensi npm baru.

## 6. Larangan (selalu berlaku)
- Patuhi `GEMINI.md` §1. **Jangan menjalankan agy sungguhan dari tes** (hanya agy palsu). Jangan membaca `~/.claude/projects` asli, jangan menyentuh `~/.claude/`.
- Jangan mengisi angka harga di `config/pricing.json`.
- Hentikan proses yang kamu jalankan sendiri memakai PID; jangan `pkill -f`.

## 7. Keluaran
`docs/handoff/LOG-002-sources-usage.md` dari `_TEMPLATE_LOG.md`.
