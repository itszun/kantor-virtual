# TSD Kantor v0.1 — Kantor virtual 3D untuk tim AI

| Versi | 0.1 | Tanggal | 2026-11-08 | Pemilik | clouduser | Penulis | Claude (Greg) |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |

## 1. Tujuan

Halaman `https://kantor.weiwu.my.id` menampilkan tim AI sebagai karakter 3D di sebuah kantor. Saat ada pekerjaan,
karakter yang bersangkutan berjalan ke mejanya dan bekerja. Saat tidak ada pekerjaan, karakter bersantai: jalan,
ngopi, nonton TV, ngobrol. Halaman juga menampilkan riwayat delegasi dan **token yang terpakai** (serta biaya bila ada).

Terinspirasi konsep "Kantor Hermes" (Kanezza). Aset, gaya, dan nama dibuat sendiri, bukan salinan.

## 2. Persona (keputusan pemilik, 2026-11-08)

| id | Nama | Peran | Mesin | Profil biaya/beban | Warna |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `greg` | Greg | Lead / Orchestrator | Claude Code (sesi utama) | biaya tinggi, beban tinggi | ungu `#6d4fd8` |
| `betty` | Betty | Asisten administratif (Google Drive) | Claude Code (subagent tipe `betty`) | biaya tinggi, beban rendah | merah muda `#d6457a` |
| `alex` | Alex | Task Force — level teknis | agy | biaya rendah, beban tinggi | biru `#2f6fd6` |
| `windry` | Windry | Task Force — level taktis | agy | biaya rendah, beban tinggi | oranye `#e07a2f` |
| — | (Director) | Penggerak perilaku santai | DeepSeek | biaya rendah, beban rendah | tidak tampil sebagai karakter |

Konfigurasi persona ada di `config/personas.json`, bukan di kode.

## 3. Arsitektur

```
Claude Code hooks ──┐
transcript scanner ─┤                       ┌─ SSE /api/stream ──► Browser (Three.js 3D + panel)
tools/kantor-agy.sh ┼─► kantor-api (Node 24) ┤
Director (DeepSeek) ┘   node:sqlite          └─ GET /api/state, /api/history, /api/usage
```

- **kantor-api**: Node.js 24, `node:http`, `node:sqlite` (tanpa framework). Satu proses melayani API, SSE, dan file statis `public/`.
- **Status otoritatif ada di server.** Browser hanya menggambar status + animasi.
- **Dependensi yang boleh:** `three` (frontend, disajikan dari `node_modules/three` lewat `/vendor/three/…` + importmap). Tanpa bundler, tanpa build step. Tes memakai `node:test`.

## 4. Model data (SQLite, `data/kantor.db`)

| Tabel | Isi |
| :-- | :-- |
| `events` | id (ulid/autoinc), ts, source, persona, type, task_id, title, level, model, payload_json |
| `tasks` | task_id, persona, title, level, source, started_at, ended_at, status (`running`/`done`/`failed`) |
| `usage` | id, ts, persona, source, model, message_id (UNIQUE bila ada), input, output, cache_read, cache_write, thinking, cost_usd (nullable) |
| `scan_offsets` | file_path, byte_offset, updated_at (untuk scanner transcript) |
| `director_runs` | id, ts, model, input_tokens, output_tokens, cost_usd, ok, error |
| `persona_memory` | id, ts, persona, note (≤200 karakter; memori bertahap dari Director) |

## 5. Event ingest

`POST /api/events` dengan header `Authorization: Bearer <ingest token>`. Token dibaca dari file
(`KANTOR_INGEST_TOKEN_FILE`), tidak pernah dari kode. Endpoint ini **hanya untuk localhost** dan diblok di Caddy.

```json
{ "source": "claude-hook|agy|director|manual", "persona": "greg|betty|alex|windry",
  "type": "task.start|task.end|task.fail|prompt|heartbeat|usage",
  "task_id": "opsional", "title": "opsional, ≤120 karakter", "level": "technical|tactical|null",
  "model": "opsional", "usage": { "input_tokens": 0, "output_tokens": 0, "cache_read_tokens": 0,
  "cache_write_tokens": 0, "thinking_tokens": 0 }, "cost_usd": null, "ts": "ISO-8601, opsional" }
```

Validasi ketat: persona dan type harus dari daftar, title dipotong 120 karakter, body maks 16 KB.

### 5.1 Sumber event

| Sumber | Cara | Persona |
| :-- | :-- | :-- |
| Claude Code hooks | `tools/claude-hook.sh` dipasang di `~/.claude/settings.json` untuk `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`. Membaca JSON dari stdin, kirim ke API, **selalu exit 0** dan timeout 2 detik (tidak boleh menghambat Claude). | sesi utama → `greg`; subagent `agent_type == "betty"` → `betty`; subagent lain → `greg` (dihitung sebagai delegasi) |
| Transcript scanner | Tiap 60 detik membaca `~/.claude/projects/**/*.jsonl` (mount read-only) secara inkremental (byte offset). Ambil `message.usage` dari baris `type:"assistant"`. **Dedupe per `message.id`** (satu pesan bisa tertulis di beberapa baris). File `*/subagents/agent-*.jsonl` memakai `agent-*.meta.json` → `agentType`. | sama seperti di atas |
| agy | `tools/kantor-agy.sh --persona alex|windry --title "..." -- <argumen agy>` kirim `task.start`, jalankan agy, baca `usage` dari output `--output-format json` bila ada, kirim `task.end`/`task.fail` + usage. | `alex` (teknis) / `windry` (taktis) |
| Director | Usage tiap panggilan DeepSeek dicatat sendiri. | — (tampil di tab Token sebagai "Director") |

### 5.2 Biaya

`config/pricing.json`: harga per 1 juta token per model (input, output, cache read, cache write).
Model yang tidak ada di tabel → `cost_usd = null`, tampil "—". agy berlangganan → token saja, biaya `null`.
Harga harus diverifikasi pemilik/Claude sebelum dipakai; jangan mengarang angka.

## 6. Mesin status karakter (server)

```
idle ──task.start──► walking_to_desk ──tiba──► working ──task.end (tak ada task lain)──► walking_to_lounge ──► idle
```

- Persona `working` bila punya ≥1 task `running`. Task yang tidak ditutup dalam 30 menit (Claude) / 60 menit (agy) → ditandai `stale` dan dianggap selesai.
- Saat `idle`, aktivitas diambil dari **jadwal adegan** (§7). Tanpa Director, pakai adegan bawaan acak dari `config/idle-lines.json`.
- Server mengirim snapshot via SSE: `{personas:[{id,state,spot,bubble,task}], stats:{...}}` tiap perubahan + heartbeat 15 detik.

## 7. Director (perilaku santai, DeepSeek)

- Dipanggil hanya bila **semua** persona idle, paling sering tiap 10 menit, maksimum `daily_calls` (default 60) dan `daily_budget_usd` (default 0.05). Lewat batas → adegan bawaan.
- API OpenAI-compatible (`base_url`, `model`, file kunci di config). Default DeepSeek langsung; alternatif OpenRouter.
- **Privasi:** yang dikirim ke Director hanya profil persona, status, jumlah task hari ini per persona, level (teknis/taktis), dan 10 `persona_memory` terakhir. **Tidak pernah judul task, prompt, atau isi transcript** (bisa INTERNAL).
- Keluaran wajib JSON tervalidasi skema: `{scenes:[{actor, action: walk|sit|say|chat|coffee|watch_tv|look_window, spot?, with?, line? (≤80 karakter), duration_s (5–120)}], memory_notes:[{persona, note}]}`. Spot harus dari `config/office.json`. Gagal validasi → buang, pakai bawaan.
- **Bertahap:** `memory_notes` disimpan ke `persona_memory` dan diberikan lagi ke panggilan berikutnya, sehingga obrolan dan kebiasaan berkembang (lelucon internal, kebiasaan ngopi, dsb.).
- **Hermes Agent** (Nous Research) adalah opsi tahap berikutnya untuk Director (memori/skill bawaan). Tidak dipakai di v0.1 karena membawa tool terminal yang tidak perlu untuk tugas ini; antarmuka Director dibuat sebagai adapter agar bisa diganti.

## 8. Frontend (3D penuh)

- Three.js, kamera ortografis isometrik, bisa digeser/zoom (OrbitControls terbatas). Mobile-first (target layar HP seperti contoh), tetap rapi di desktop.
- Ruangan low-poly prosedural (tanpa file model eksternal): lantai kayu, dinding, 2 jendela, 4 meja + monitor (layar menyala warna persona saat bekerja), 2 whiteboard (CanvasTexture: "Delegasi terbaru" dan "Tugas Greg"), lounge (sofa, meja kopi, TV), pantry kopi, tanaman.
- Karakter: badan kapsul + kepala bola + rambut sederhana, warna persona, animasi jalan (ayun), duduk. Label nama + peran dan bubble pakai `CSS2DRenderer`.
- Jalur jalan: graf waypoint dari `config/office.json` (jalur terpendek, tanpa menembus meja).
- Panel HTML (Bahasa Indonesia): header "Kantor Weiwu · Tim AI", kartu stat (Status Live + jam, Delegasi hari ini, Aktif sekarang, Token hari ini / biaya), kartu persona yang bisa digeser horizontal, tab **Riwayat · Tugas Greg · Aktivitas · Token**.
- Fallback bila WebGL tidak ada: panel saja.

## 9. Deploy

- Compose project `kantor`, satu service `kantor-api` (`node:24-alpine`), `127.0.0.1:8790:8790`, `mem_limit: 256m`.
- Volume: `./data` (rw), `~/.claude/projects` → `/claude-projects` (**ro**), file token ingest dan kunci Director (ro).
- Caddy (dilakukan pemilik, Tier 3): blok `kantor.weiwu.my.id` dengan basicauth yang sama seperti `ea`/`orc`, `respond /api/events 403`, `reverse_proxy 127.0.0.1:8790 { flush_interval -1 }` (SSE).
- DNS (pemilik): A record `kantor.weiwu.my.id` → IP server.

## 10. Paket kerja (masing-masing ukuran S, < 15 menit agy)

| PLAN | Isi | Implementer |
| :-- | :-- | :-- |
| 001 | Kerangka kantor-api: config persona, SQLite, `POST /api/events`, mesin status, `GET /api/state`, SSE, statis, tes | agy (Alex) |
| 002 | Sumber event: `claude-hook.sh`, transcript scanner + dedupe, `kantor-agy.sh`, pricing, `GET /api/usage`, tes | agy |
| 003 | Frontend 3D statis: ruangan, karakter, jalan antar spot, adegan santai bawaan (tanpa server) | agy |
| 004 | Frontend live: SSE → karakter, monitor/whiteboard, panel & tab, token | agy |
| 005 | Director DeepSeek: adapter, batas biaya, skema, memori bertahap, fallback | agy |
| 006 | Dockerfile, compose, runbook deploy (Caddy + DNS) | agy; deploy oleh Claude + pemilik |
| 007 | Persona Betty: `~/.claude/agents/betty.md` + pemasangan hooks | Claude (menyentuh `~/.claude`) |

## 11. Keputusan terbuka

| ID | Pertanyaan | Default sementara |
| :-- | :-- | :-- |
| OD-01 | Saldo DeepSeek $0 (dicek 2026-11-08). Top-up DeepSeek atau pakai OpenRouter? | Director mati → adegan bawaan |
| OD-02 | Judul task tampil di halaman (di balik basicauth)? | Ya, dipotong 120 karakter |
| OD-03 | Harga per model untuk biaya Claude | Diisi Claude di PLAN-002 setelah verifikasi |
