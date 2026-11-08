# PLAN-004 — Frontend live: SSE → karakter, panel & tab dari data nyata

| Ukuran | S/M (target < 20 menit) | Branch | `feat/004-frontend-live` | Status | Siap dikerjakan |
| :-- | :-- | :-- | :-- | :-- | :-- |

## 1. Tujuan
Membuka `/` (tanpa parameter) menampilkan kantor yang **digerakkan data nyata** dari kantor-api: karakter ke meja saat
ada `task.start`, kembali santai saat `task.end`, kartu/stat/tab terisi dari `/api/state`, `/api/history`,
`/api/usage`, dan berubah otomatis lewat SSE `/api/stream`. Mode demo hanya bila `?demo=1`.

## 2. Konteks & rujukan
- Baca dulu: `GEMINI.md`, TSD §6–§8, LOG-003 (bagian "Review putaran 2": 3 poin bawaan), kode `public/app/*.js`, `src/state.ts`
  (`Snapshot`, `PersonaSnapshot`), `src/state.ts:getRecentTasks`, `src/usage.ts:getUsageReport`.
- Bentuk data server:
  - Snapshot (`/api/state`, event SSE `snapshot`): `{ts, personas:[{id,name,role,color,state,spot,task:{id,title,level,started_at}|null,last_active_at}], stats:{delegations_today,active_now,tokens_today,cost_today_usd|null}}`.
  - `/api/history?limit=N`: `[{task_id,persona,title,level,source,started_at,ended_at,status}]` (status `running|done|failed|stale`).
  - `/api/usage?days=7`: `{days:[{date,by_persona:{<id>:{tokens,cost_usd}}}], by_model:[{model,tokens,cost_usd}], totals:{tokens,cost_usd}}`.

## 3. Batas scope
**Boleh diubah/dibuat:** `public/**`, `test/frontend-map.test.ts` (baru), `docs/handoff/LOG-004-frontend-live.md`.
**Tidak boleh disentuh:** `src/**`, `tools/**`, `config/**` (kecuali `config/office.json` untuk kamera bila perlu), `~/.claude/**`, `docs/TSD-*`.

## 4. Langkah yang diharapkan
1. Kerangka LOG-004 dulu.
2. **Mode**: `main.js` — demo **hanya** bila `?demo=1`. Tanpa parameter → live.
3. **`public/app/mappers.js`** (baru, **tanpa import three/DOM**, supaya bisa dites di Node) — fungsi murni:
   - `relTime(iso, now)` → "baru saja" / "5m lalu" / "2j lalu" / "3h lalu" (Bahasa Indonesia).
   - `historyToRows(tasks, personas, now)` → `[{title, time, persona_color, status}]`; task tanpa judul → "Tugas tanpa judul"; status running → time "aktif sekarang".
   - `gregTasks(tasks)` → task persona `greg`, maks 10, status Indonesia: running→"berjalan", done→"selesai", failed→"gagal", stale→"terhenti".
   - `activityFromHistory(tasks, personas, now)` → baris aktivitas: start → "Alex mulai: <judul>" (💻), end → "Alex selesai: <judul>" (✅), failed (⚠️); urut terbaru, maks 20.
   - `usageView(report)` → per persona total token & biaya 7 hari, per model, total; biaya `null` → "—".
   - `formatCost(usd)` → "$0.06" (≥0.01: 2 desimal, <0.01: 4 desimal), `null` → "—".
4. **Live wiring** (`main.js`/`ui.js`):
   - Awal: `/api/state` + `/api/history?limit=40` + `/api/usage?days=7`.
   - SSE `snapshot` → `applyState` + `updateSnapshot`; lalu muat ulang history (debounce 2 s) dan usage (debounce 30 s).
   - SSE putus → `EventSource` reconnect bawaan; indikator header jadi abu-abu "Terputus" saat `onerror`, kembali hijau "Live · HH:MM" saat `open`/snapshot.
   - Kartu persona: badge dari `state`, teks "Sedang: <judul>" bila working; "aktif terakhir" dari `last_active_at` via `relTime`.
   - Stat Token: angka `tokens_today` dengan pemisah ribuan id-ID + baris kecil `formatCost(cost_today_usd)` + label **"estimasi setara API"**.
   - Tab **Token**: tabel 7 hari per persona & per model dari `usageView`, catatan kecil: "Biaya Claude = estimasi setara harga API, bukan tagihan langganan."
   - Whiteboard "Delegasi terbaru" & "Tugas Greg" di 3D: gambar ulang CanvasTexture dari 3 judul terakhir (potong 28 karakter) saat history berubah.
   - Data kosong (DB baru) → semua tab tampil pesan kosong yang ramah, tanpa error.
5. **Perbaikan bawaan dari review 003**:
   - Kamera HP (lebar < 520): seluruh 4 meja + lounge + pantry terlihat; meja Greg tidak terpotong di 430×932.
   - Monitor menyala harus jelas terlihat dari kamera (emissive lebih kuat / plane glow kecil warna persona).
6. **Keamanan teks**: judul tugas adalah data → selalu `textContent`, jangan `innerHTML` untuk data server.
7. Tes Node `test/frontend-map.test.ts` (import `../public/app/mappers.js`): relTime, historyToRows (judul null, running), gregTasks filter+status, activityFromHistory urutan, usageView null cost, formatCost.
8. **Bukti visual live**: server sementara port 8794 (DB & token temp), kirim event lewat `curl` dengan token temp:
   `task.start` greg + alex, ambil screenshot HP `004-live-working.png` (virtual-time 20000), kirim `task.end` alex,
   ambil `004-live-after.png`. Plus `004-desktop.png` (1440×900). Lihat sendiri hasilnya. Hentikan server via PID.
   Event contoh: `{"source":"claude-hook","persona":"greg","type":"task.start","task_id":"t1","title":"Uji live"}` (lihat `src/events.ts` untuk skema lengkap).

## 5. Kriteria selesai
- [ ] `npm test` lulus (37 lama + baru); output asli di LOG.
- [ ] 3 screenshot di `docs/handoff/shots/`, dengan Greg & Alex di meja (monitor menyala) di screenshot pertama dan Alex kembali santai di kedua.
- [ ] Tanpa `?demo=1` tidak ada data contoh tampil.
- [ ] Tidak ada error console (Chrome `--enable-logging=stderr --v=0`), tempel ringkasan di LOG.
- [ ] Tidak ada dependensi baru.

## 6. Larangan (selalu berlaku)
- Patuhi `GEMINI.md` §1. Jangan membaca `~/.config/kantor/*` atau DB produksi; pakai file temp.
- Hentikan proses yang kamu jalankan sendiri memakai PID; jangan `pkill -f`.

## 7. Keluaran
`docs/handoff/LOG-004-frontend-live.md` dari `_TEMPLATE_LOG.md`, plus screenshot.
