# PLAN-008 — Director Engine & Dynamic Dialogue Adapter

| Ukuran | M (target < 20 menit) | Branch | `feat/005-kairosoft-v0.2` | Status | Siap Dikerjakan |
| :-- | :-- | :-- | :-- | :-- | :-- |

---

## 1. Tujuan

Mewujudkan pilar Director santai sesuai spesifikasi [`docs/TSD-KANTOR-v0.1.md`](../TSD-KANTOR-v0.1.md) §7:
1. **Engine Adapter OpenAI-Compatible (`src/director.ts`)**:
   - Mendukung DeepSeek, OpenRouter, atau endpoint lokal OpenAI-compatible lainnya.
   - Guardrails ketat: dipanggil hanya saat **semua persona idle**, interval minimum 10 menit, batas harian biaya (default \$0.05) dan panggilan (default 60).
   - **Kepatuhan Privasi Total**: Hanya mengirim metadata aman (nama persona, peran, jumlah tugas hari ini, status idle, dan 10 memori terakhir). **Tidak pernah** membocorkan judul tugas, isi prompt, atau cuplikan transkrip.
2. **Validasi Skema Output Ketat**:
   - Skema: `{ scenes: [{ actor, action, spot?, with?, line?, duration_s }], memory_notes: [{ persona, note }] }`.
   - Aksi yang sah: `walk | sit | say | chat | coffee | watch_tv | look_window`.
   - Spot wajib terdaftar di `config/office.json`.
   - Teks dialog (`line`) dibatasi maksimal 80 karakter.
   - Gagal validasi / error / kunci tidak ada -> fallback senyap ke adegan bawaan (`config/idle-lines.json`).
3. **Penyimpanan Memori Bertahap**:
   - Menyimpan `memory_notes` ke tabel SQLite `persona_memory`.
   - Mencatat audit log eksekusi ke tabel `director_runs` (token, biaya, status, pesan error bila gagal).
4. **Endpoint API**:
   - `GET /api/director`: Menampilkan status terkini Director (panggilan hari ini, estimasi biaya, log run terakhir, 10 catatan memori persona).
5. **Suite Pengujian Otomatis (`test/director.test.ts`)**:
   - Validasi skema, perlindungan privasi, pembatasan rate limit & budget, serta fallback tanpa kunci.

---

## 2. Batas Scope

**Boleh diubah/dibuat:**
- `src/director.ts` (baru)
- `src/config.ts` (tambahkan konfigurasi director)
- `src/server.ts` (tambahkan endpoint `GET /api/director`)
- `test/director.test.ts` (baru)
- `docs/handoff/PLAN-008-director-dialogue.md` & `LOG-008-director-dialogue.md` (baru)

**Tidak boleh disentuh:**
- Tidak memodifikasi kunci API produksi atau file di luar `~/Projects/kantor/`.
- Tidak melakukan commit langsung (disiapkan untuk review Claude).

---

## 3. Rincian Langkah Implementasi

1. **Konfigurasi Director di `src/config.ts`**:
   - `directorEnabled`, `directorApiKeyFile`, `directorBaseUrl`, `directorModel`, `directorMinIntervalMin`, `directorDailyBudgetUsd`, `directorMaxDailyCalls`.
2. **Implementasi `src/director.ts`**:
   - `getRecentMemories(db, limit)`
   - `checkDirectorEligibility(db, config, allPersonasIdle)`
   - `buildDirectorPayload(personas, todayTaskCounts, recentMemories, validSpots)`
   - `validateDirectorResponse(json, validPersonaIds, validSpots)`
   - `executeDirectorTick(db, config, personas, validSpots)`
3. **Integrasi Server di `src/server.ts`**:
   - Tambahkan route `GET /api/director`.
4. **Pengujian Menyeluruh (`test/director.test.ts`)**:
   - Tes 1: Validasi skema (lolos vs tolak spot fiktif vs tolak dialog > 80 karakter).
   - Tes 2: Penegakan privasi (memastikan payload tidak memuat field task).
   - Tes 3: Pembatasan waktu (tolak jika baru dipanggil < 10 menit).
   - Tes 4: Pembatasan kuota biaya harian.
   - Tes 5: Fallback anggun saat API key tidak ditemukan.
   - Tes 6: Mock panggilan sukses dan persistensi `persona_memory` & `director_runs`.
5. **Verifikasi Lintas Modul**:
   - Jalankan `npm test` untuk memastikan 100% tes hijau.
