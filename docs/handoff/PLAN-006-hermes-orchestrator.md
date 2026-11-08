# PLAN-006 — Hermes Orchestrator & Multi-Agent Dispatcher Daemon

| Ukuran | M (target < 20 menit) | Branch | `feat/006-hermes-orchestrator` | Status | Siap Dikerjakan |
| :-- | :-- | :-- | :-- | :-- | :-- |

---

## 1. Tujuan

Mewujudkan pilar pertama dari studio 4-agen sesuai [`docs/ASPIRASI-DAN-PERENCANAAN-KANTOR-AI.md`](../ASPIRASI-DAN-PERENCANAAN-KANTOR-AI.md):
1. Menjadikan **Hermes** sebagai persona operator resmi (`id: "hermes"`) dengan meja kerja di *Hermes Command Desk* (`desk_hermes`).
2. Membangun daemon dispatcher `tools/kantor-hermes.ts` dan executable `tools/kantor-hermes.sh`:
   - Menerima tugas masuk (prompt baris perintah / webhook payload).
   - Mengklasifikasikan tugas secara deterministik:
     - *Strategic / Planning / Architectural* ➔ Claude Code (`greg`).
     - *Visual / Artwork / 3D Asset / Creative* ➔ AGY (`alex`, sub-peran Agy Artist).
     - *Review / Second Opinion / Text Analysis* ➔ Codex (`codex`).
     - *Technical / Engineering / TDD / AST* ➔ AGY (`alex`).
   - Mengirimkan event telemetri orkestrasi (`hermes` `task.start`) ke `/api/events`.
   - Menjalankan subproses agen yang dituju dan mengirimkan event penyelesaian (`task.end`).
3. Memperbarui visual Three.js di `public/app/scene.js` untuk merender modul konsol heksagonal retro-cyber *Hermes Command Console* lengkap dengan monitor CRT ganda menyala.
4. Memperbarui `test/office.test.ts` dan membuat tes otomatis `test/kantor-hermes.test.ts`.

---

## 2. Batas Scope

**Boleh diubah/dibuat:**
- `config/personas.json` (tambahkan persona `hermes`).
- `config/office.json` (tambahkan spot `desk_hermes` dan konsol heksagonal Hermes).
- `config/idle-lines.json` (tambahkan dialog operator Hermes).
- `tools/kantor-hermes.sh` & `tools/kantor-hermes.ts` (baru).
- `public/app/scene.js`, `public/app/characters.js`, `public/app/idle.js`, `public/app/ui.js` (aset & visual Hermes).
- `test/office.test.ts` (update ekspektasi 6 persona) & `test/kantor-hermes.test.ts` (baru).
- `docs/handoff/LOG-006-hermes-orchestrator.md`.

**Tidak boleh disentuh:**
- `~/.claude/**`, kredensial produksi `~/.config/dare/*` atau `~/.config/kantor/*`.
- Caddy, firewall, atau konfigurasi sistem produksi.

---

## 3. Rincian Langkah Implementasi

1. **Registrasi Persona `hermes`**:
   - `id: "hermes"`, `name: "Hermes"`, `role: "Orchestrator & Dispatcher"`, `engine: "Hermes Agent"`, `color: "#06b6d4"`, `desk_spot: "desk_hermes"`.
2. **Pembaruan Konsol 3D & Navigasi**:
   - Spot `desk_hermes` di `[-0.5, -1.8]` dengan konsol CRT heksagonal.
   - Hubungkan node `desk_hermes` ke `n_center` di `waypoints.edges`.
3. **Pembangunan `tools/kantor-hermes.ts`**:
   - Fungsi `classifyTask(prompt)` berbasis rule intent.
   - Integrasi telemetri event `task.start` dan `task.end`.
4. **Verifikasi Tes**:
   - Jalankan `npm test` (seluruh tes harus hijau 100%).
   - Tulis `LOG-006-hermes-orchestrator.md` dan pastikan hak akses berkas `clouduser:clouduser`.
