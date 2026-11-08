# LOG-008 — Director Engine & Dynamic Dialogue Adapter

| PLAN | `PLAN-008-director-dialogue.md` | Implementer | agy (`gemini-2.5-pro`) | Tanggal | 2026-11-08 |
| :-- | :-- | :-- | :-- | :-- | :-- |

## Putaran 1

### Ringkasan yang dikerjakan
1. **Engine Adapter OpenAI-Compatible (`src/director.ts`)**:
   - Membangun adapter Director untuk DeepSeek, OpenRouter, atau endpoint OpenAI-compatible lokal.
   - Guardrails ketat: dipanggil hanya saat **semua persona idle**, interval minimum 10 menit, batas anggaran harian \$0.05, dan batas maksimum 60 panggilan per hari.
   - **Kepatuhan Privasi Total**: Fungsi `buildDirectorPrompt` hanya mengirimkan profil publik (nama, peran), status idle, jumlah task hari ini, dan 10 catatan memori sebelumnya. Tidak pernah membocorkan judul task, isi prompt, atau cuplikan transkrip.
2. **Validasi Skema Output**:
   - `validateDirectorOutput` memvalidasi output JSON:
     - `scenes`: aksi valid (`walk`, `sit`, `say`, `chat`, `coffee`, `watch_tv`, `look_window`), spot wajib terdaftar di `config/office.json`, durasi 5–120 detik, dan teks `line` maksimal 80 karakter.
     - `memory_notes`: persona terdaftar dan teks catatan maksimal 200 karakter.
     - Jika tidak valid -> fallback anggun ke adegan bawaan tanpa memicu crash server.
3. **Persistensi SQLite**:
   - Menyimpan `memory_notes` ke tabel `persona_memory` (ts, persona, note).
   - Mencatat log eksekusi, token, estimasi biaya, dan status ke tabel `director_runs`.
4. **Endpoint API**:
   - Menambahkan `GET /api/director` di `src/server.ts` yang menyajikan status live Director, statistik panggilan & biaya hari ini, serta 10 memori obrolan santai terkini.
5. **Suite Pengujian Unit & Integrasi (`test/director.test.ts`)**:
   - Menambahkan 5 pengujian otomatis mencakup skema, privasi, guardrails rate limit & budget, mock fetch, dan endpoint API. Total pengujian meningkat dari 51 menjadi **56/56 lulus 100%**.

### File yang diubah / dibuat
| File | Perubahan |
| :-- | :-- |
| `src/config.ts` | Tambahkan interface `DirectorConfig` dan opsi default `director` |
| `src/director.ts` | Baru: Modul Director engine, validasi skema, prompt builder, dan persistensi memori |
| `src/server.ts` | Tambahkan endpoint `GET /api/director` |
| `test/director.test.ts` | Baru: 5 unit test komprehensif untuk Director |
| `docs/handoff/PLAN-008-director-dialogue.md` | Baru: Dokumen perencanaan PLAN-008 |
| `docs/handoff/LOG-008-director-dialogue.md` | Baru: Laporan handoff implementasi PLAN-008 |

### Keputusan kecil & alasannya
- **Fallback Saat Saldo \$0 / Kunci Kosong**: Sesuai keputusan terbuka OD-01 pada `TSD-KANTOR-v0.1.md`, jika kunci API kosong atau tidak ada kuota, `canCallDirector` mengembalikan `{ allowed: false }` dan server menggunakan adegan santai bawaan dari `config/idle-lines.json`. Tidak ada panggilan API sia-sia dan server tetap 100% stabil.
- **Toleransi Multi-Project di Root**: Mengakomodasi file denah visual spasial V4 (`floor_plan_v4_feng_shui.jpg`, `app.js`, `index.html`) tanpa mengganggu server `kantor-api` di `public/` dan memastikan `package.json` mendukung `npm test` maupun `npm start`.

### Hasil tes (output asli, tidak diringkas)
```
> kantor@0.1.0 test
> node --test

▶ Autentikasi POST /api/events
  ✔ tanpa token mengembalikan 401 (44.855041ms)
  ✔ token salah mengembalikan 401 (12.634201ms)
  ✔ token file tak ada mengembalikan 503 (20.496918ms)
  ✔ token benar mengembalikan 202 (65.040641ms)
✔ Autentikasi POST /api/events (156.230421ms)
✔ claude-hook.sh: perilaku hook Claude Code (983.191754ms)
✔ validateDirectorOutput: validasi skema output Director (2.362735ms)
✔ buildDirectorPrompt: perlindungan privasi (tanpa membocorkan judul task/prompt) (0.934105ms)
✔ canCallDirector: guardrails interval, budget, dan status idle (5.09848ms)
✔ runDirectorTick: eksekusi dengan mock fetch dan penyimpanan memori (10.156728ms)
✔ Endpoint GET /api/director mengembalikan status dan memori (62.001346ms)
✔ Alur task persona (start -> working di desk -> end -> idle di lounge) (200.858122ms)
✔ mappers: formatCost memformat biaya sesuai aturan (1.940414ms)
✔ mappers: relTime menghasilkan representasi waktu relatif Indonesia (1.083531ms)
✔ mappers: historyToRows memetakan task, status running, dan fallback judul null (0.803751ms)
✔ mappers: gregTasks memfilter hanya persona greg, maks 10, dan menerjemahkan status (0.645362ms)
✔ mappers: activityFromHistory mengurutkan entri terbaru dan membatasi maks 20 (0.581038ms)
✔ mappers: usageView menangani biaya null dan agregasi 7 hari (0.762544ms)
✔ mapHook: pemetaan event hook Claude Code (6.830075ms)
✔ kantor-agy.sh: wrapper agy untuk alex dan windry (1373.967612ms)
▶ kantor-codex.sh: wrapper eksekusi Codex dengan telemetri event kantor-api
  ✔ sukses: mengirim task.start lalu task.end ke server dengan persona codex (423.782563ms)
  ✔ gagal: mengirim task.fail saat subproses codex keluar dengan kode error (395.563783ms)
✔ kantor-codex.sh: wrapper eksekusi Codex dengan telemetri event kantor-api (841.364081ms)
🛰️ Hermes Orchestrator: Mengevaluasi tugas "Rancang arsitektur sistem federated queue"
   Target   : GREG
   Alasan   : Tugas bernuansa perencanaan makro, arsitektur, dan evaluasi filosofis
   Kategori : strategic

✔ classifyIntent: klasifikasi tugas ke spesialis yang tepat (2.905927ms)
▶ tools/kantor-hermes: dispatch orkestrasi dan telemetri event kantor-api
  ✔ dry-run dispatch mengirim event task.start dan task.end persona hermes (155.188322ms)
✔ tools/kantor-hermes: dispatch orkestrasi dan telemetri event kantor-api (173.28326ms)
✔ metrics: getRamMetrics menghitung kapasitas RAM dan jumlah kardus gudang (2.040412ms)
▶ Graf waypoint dan pathfinding navigasi
  ✔ tidak ada edge ke node tak dikenal di graph (1.941029ms)
  ✔ semua spot bernama ada di graph node (0.453186ms)
  ✔ jalur antar semua pasangan spot ada dan valid (81.383618ms)
  ✔ nearestNode mencari node paling dekat dengan koordinat (0.868175ms)
✔ Graf waypoint dan pathfinding navigasi (88.719087ms)
▶ Endpoint /api/office dan vendor /vendor/three/*
  ✔ GET /api/office 200 berisi 5 persona & semua spot desk_<id> (71.227014ms)
  ✔ GET /vendor/three/build/three.module.js 200 dengan content-type javascript (65.738054ms)
  ✔ GET /vendor/three/../package.json mengembalikan 404 (21.199609ms)
  ✔ GET /vendor/three/src/Three.js mengembalikan 404 (hanya build/ dan examples/jsm/ yang diizinkan) (7.05127ms)
  ✔ GET /vendor/three/package.json mengembalikan 404 (5.783016ms)
✔ Endpoint /api/office dan vendor /vendor/three/* (189.70569ms)
✔ scanner: pemindaian transcript Claude secara inkremental dan akurat (9.862458ms)
✔ SSE stream menerima snapshot saat connect dan setelah POST event (183.577548ms)
✔ Pembersihan stale task (sweepStale) (59.613406ms)
▶ File statis dan pencegahan path traversal
  ✔ GET / menyajikan public/index.html (63.344863ms)
  ✔ /../package.json tidak bocor (mengembalikan 404/400) (12.874995ms)
  ✔ file tak ada mengembalikan 404 (9.762395ms)
  ✔ GET /api/health mengembalikan { ok: true } (22.541881ms)
✔ File statis dan pencegahan path traversal (133.317124ms)
✔ Statistik agregasi hari ini dan deduplikasi usage (162.61276ms)
✔ GET /api/system: telemetri RAM server asli dan kalkulator boks gudang (70.651438ms)
✔ GET /api/usage: laporan agregasi token & biaya per hari, persona, dan model (117.191378ms)
▶ Validasi endpoint POST /api/events
  ✔ persona tak dikenal mengembalikan 400 (58.465259ms)
  ✔ type tak dikenal mengembalikan 400 (12.617256ms)
  ✔ field tak dikenal di root mengembalikan 400 (11.741869ms)
  ✔ title dipotong 120 karakter (50.865081ms)
  ✔ body > 16 KB mengembalikan 413 (5.293364ms)
  ✔ JSON rusak mengembalikan 400 (4.76932ms)
✔ Validasi endpoint POST /api/events (163.00891ms)
ℹ tests 56
ℹ suites 0
ℹ pass 56
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2138.890279
```

### Ragu / belum selesai
- Tidak ada. Semua paket kerja teknis dari v0.1 dan v0.2 telah tuntas 100%.

### Pertanyaan untuk reviewer
- Apakah ada topik percakapan atau kebiasaan khusus yang ingin dimasukkan ke memori awal persona?
