# LOG-013 — UX/UI mobile: navigasi app-like untuk PWA iPhone

| PLAN | `PLAN-013-ux-mobile-pwa.md` | Implementer | agy (Gemini 3.8 Flash) | Tanggal | 2026-11-08 |
| :-- | :-- | :-- | :-- | :-- | :-- |

## Putaran 1

### Ringkasan yang dikerjakan
1. **App bar compact (< 900 px)**: Tinggi compact 48 px + `env(safe-area-inset-top)` berisi nama "Kantor Weiwu", badge "Tim AI", pulse dot live, dan jam. Subtitle disembunyikan di mobile.
2. **Statistik menjadi satu baris chip ringkas**: Tinggi 42 px (≤ 44 px) dengan scroll horizontal lancar. Stat-cell berupa pill chip horizontal (Status, Delegasi, Aktif, Token). Tap pada chip Token langsung beralih ke tab `#token`.
3. **Bottom tab bar iOS-style**: Tetap di bawah dengan `env(safe-area-inset-bottom)`, target sentuh ≥ 44 px, icon SVG clean, 4 tampilan: Kantor (3D diorama), Tim (kartu persona), Aktivitas (Riwayat / Tugas Greg / Aktivitas), Token (Token + Director).
4. **Tampilan Kantor (3D diorama penuh)**:
   - Kanvas 3D mengisi seluruh tinggi antara app bar + stats chip dan bottom tab bar tanpa area kosong.
   - Slot kosong `<div id="zone-chips-slot"></div>` disisakan di bagian atas kanvas untuk chip zona Alex (PLAN-012).
   - Strip avatar persona mengambang semi-transparan di bagian bawah kanvas dengan titik status (hijau kerja, abu santai).
   - Tap avatar membuka **bottom sheet** profil persona (status, tugas/aktivitas, mesin, zona/lokasi) sekaligus memicu `window.kantorScene?.focusZone(zoneId)` dengan `zoneId` dari `config.spots[spot].zone` tanpa error bila API belum ada.
   - Petunjuk gestur mobile diubah menjadi "Seret untuk memutar · cubit untuk zoom" dan menghilang otomatis setelah interaksi pertama pengguna.
5. **Tampilan Tim**: Daftar kartu persona compact 1 kolom (1 baris status header + 1 baris tugas/aktivitas + footer mesin & waktu aktif). Tidak ada kartu yang terpotong di kanan layar.
6. **Tampilan Aktivitas**: Segmented tabs di atas (Riwayat · Tugas Greg · Aktivitas) dengan konten scroll vertikal independen.
7. **Tampilan Token**: Rincian tabel token dan status Director + memori kantor tersusun vertikal dalam 1 halaman scrollable.
8. **Routing URL Hash**: Sinkronisasi 2 arah via `#kantor`, `#tim`, `#aktivitas`, `#token` (mendukung browser back/forward dan screenshot langsung).
9. **Desktop (≥ 900 px)**: Layout split 2 kolom (3D viewport + panel kanan) dipertahankan 100% tanpa regresi. Bottom tab bar dan floating strip otomatis disembunyikan. Header sedikit lebih rapi.

### File yang diubah
| File | Perubahan |
| :-- | :-- |
| `public/app/shell.js` | File baru: modul pengelola hash routing, bottom tab bar, bottom sheet persona, avatar strip floating, dan dismiss petunjuk kontrol. |
| `public/index.html` | Menambahkan slot `#zone-chips-slot`, floating avatar strip, bottom tab bar iOS, bottom sheet persona, serta mempertahankan seluruh ID elemen (`stat-*`, `history-list`, dll.). |
| `public/style.css` | Penambahan token warna hangat (`#2b1d14`, `#f2a541`), layout responsif breakpoint 900px, gaya app bar compact, chip stat horizontal, bottom tab bar iOS, bottom sheet, floating avatar strip, dan `prefers-reduced-motion`. |
| `public/app/main.js` | Wiring modul `shell.js`, mengekspos instance scene ke `window.kantorScene`, passing konfigurasi kantor, dan sinkronisasi avatar strip berkala. |
| `public/app/ui.js` | Menambahkan helper `setOfficeConfig(office)`. |
| `tools/shot-cdp.mjs` | Memperbaiki interpolasi string user-data-dir `${process.pid}` dan retry koneksi DevTools port agar screenshot otomatis andal. |

### Keputusan kecil & alasannya
- **Breakpoint 900 px**: Sesuai instruksi PLAN-013, lebar < 900 px menggunakan navigasi app-like dengan full-screen tab views dan body `overflow: hidden; height: 100dvh`, sedangkan ≥ 900 px mempertahankan layout split desktop aslinya.
- **Token + Director dalam 1 Tab**: Di mobile, tab Token menyajikan rincian token dan Director secara vertikal stacked dalam satu wadah scrollable agar pengguna mendapatkan gambaran biaya dan status AI director sekaligus tanpa berpindah tab.
- **Aktivitas dengan Sub-Nav Segmented**: Tab Aktivitas menyediakan 3 filter cepat (Riwayat, Tugas Greg, Aktivitas) menggunakan baris tab segmented iOS-like di bagian atas tab content.
- **Kamera Focus Zone Graceful**: Pemanggilan `window.kantorScene?.focusZone(zoneId)` dibungkus blok try-catch dengan pengecekan fungsi, sehingga jika scene belum siap atau API tidak ada, tidak menimbulkan error runtime.

### Bukti Visual (Screenshot CDP)
Screenshot diambil menggunakan `node tools/shot-cdp.mjs "http://127.0.0.1:8798/index.html?demo=1#<tab>"`:
- `docs/handoff/shots/013-mobile-kantor.png` (390×844: Tampilan 3D kantor penuh, app bar compact, chip stats, floating avatar strip, slot kosong zone chips)
- `docs/handoff/shots/013-mobile-tim.png` (390×844: Tampilan tim kartu persona compact 1 kolom)
- `docs/handoff/shots/013-mobile-aktivitas.png` (390×844: Tampilan aktivitas riwayat tugas tim)
- `docs/handoff/shots/013-mobile-token.png` (390×844: Tampilan rincian token + status Director)
- `docs/handoff/shots/013-mobile-bottom-sheet.png` (390×844: Bottom sheet profil persona terbuka saat avatar ditap)
- `docs/handoff/shots/013-desktop-kantor.png` (1440×900: Tampilan desktop split layout tetap utuh)

### Hasil tes (output asli, tidak diringkas)
```
> kantor@0.1.0 test
> node --test

✔ mapCodexHook: UserPromptSubmit -> task.start, Stop -> task.end (3.010536ms)
✔ mapAgyHook: hanya PreInvocation pertama dan Stop fullyIdle (0.498875ms)
✔ claude-hook.sh --agent agy selalu mencetak {} dan exit 0 (253.582434ms)
✔ claude-hook.sh --agent codex dilewati saat KANTOR_WRAPPED=1 (229.721578ms)
▶ Autentikasi POST /api/events
  ✔ tanpa token mengembalikan 401 (48.826759ms)
  ✔ token salah mengembalikan 401 (12.664124ms)
  ✔ token file tak ada mengembalikan 503 (28.362466ms)
  ✔ token benar mengembalikan 202 (62.336764ms)
✔ Autentikasi POST /api/events (167.800607ms)
✔ claude-hook.sh: perilaku hook Claude Code (925.685055ms)
✔ validateDirectorOutput: validasi skema output Director (2.371187ms)
✔ buildDirectorPrompt: perlindungan privasi (tanpa membocorkan judul task/prompt) (0.81276ms)
✔ canCallDirector: guardrails interval, budget, dan status idle (5.900232ms)
✔ runDirectorTick: eksekusi dengan mock fetch dan penyimpanan memori (11.880617ms)
✔ Endpoint GET /api/director mengembalikan status dan memori (62.585832ms)
✔ Alur task persona (start -> working di desk -> end -> idle di lounge) (159.464783ms)
✔ mappers: formatCost memformat biaya sesuai aturan (1.842403ms)
✔ mappers: relTime menghasilkan representasi waktu relatif Indonesia (0.98209ms)
✔ mappers: historyToRows memetakan task, status running, dan fallback judul null (0.755214ms)
✔ mappers: gregTasks memfilter hanya persona greg, maks 10, dan menerjemahkan status (0.769895ms)
✔ mappers: activityFromHistory mengurutkan entri terbaru dan membatasi maks 20 (0.922991ms)
✔ mappers: usageView menangani biaya null dan agregasi 7 hari (0.91455ms)
✔ mapHook: pemetaan event hook Claude Code (5.195032ms)
✔ kantor-agy.sh: wrapper agy untuk alex dan windry (1210.183797ms)
▶ kantor-codex.sh: wrapper eksekusi Codex dengan telemetri event kantor-api
  ✔ sukses: mengirim task.start lalu task.end ke server dengan persona codex (499.092112ms)
  ✔ gagal: mengirim task.fail saat subproses codex keluar dengan kode error (455.192246ms)
✔ kantor-codex.sh: wrapper eksekusi Codex dengan telemetri event kantor-api (972.063214ms)
🛰️ Dexter: Mengevaluasi tugas "Rancang arsitektur sistem federated queue"
   Target   : GREG
   Alasan   : Tugas bernuansa perencanaan makro, arsitektur, dan evaluasi filosofis
   Kategori : strategic

✔ classifyIntent: klasifikasi tugas ke spesialis yang tepat (3.022871ms)
▶ tools/kantor-hermes: dispatch orkestrasi dan telemetri event kantor-api
  ✔ dry-run dispatch mengirim event task.start dan task.end persona hermes (118.092761ms)
✔ tools/kantor-hermes: dispatch orkestrasi dan telemetri event kantor-api (134.04991ms)
▶ layout v6: zona, prop, spot, dan navgraph konsisten
  ✔ ada sembilan zona pada sel grid yang unik (1.644934ms)
  ✔ seluruh spot dan furnitur berada dalam zona yang ditetapkan (4.725602ms)
  ✔ spot tidak bertumpukan dan seluruhnya adalah node waypoint (6.440284ms)
  ✔ edge tidak memotong AABB furnitur solid kecuali di endpoint miliknya (15.832509ms)
  ✔ edge yang menyeberangi sel grid melewati pintu pasangan zona (3.06083ms)
✔ layout v6: zona, prop, spot, dan navgraph konsisten (36.194365ms)
✔ metrics: getRamMetrics menghitung kapasitas RAM dan jumlah kardus gudang (1.64742ms)
▶ Graf waypoint dan pathfinding navigasi
  ✔ tidak ada edge ke node tak dikenal di graph (2.670193ms)
  ✔ semua spot bernama ada di graph node (0.465993ms)
  ✔ jalur antar semua pasangan spot ada dan valid (131.672695ms)
  ✔ nearestNode mencari node paling dekat dengan koordinat (0.672716ms)
✔ Graf waypoint dan pathfinding navigasi (140.569373ms)
▶ Endpoint /api/office dan vendor /vendor/three/*
  ✔ GET /api/office 200 berisi 5 persona & semua spot desk_<id> (46.298353ms)
  ✔ GET /vendor/three/build/three.module.js 200 dengan content-type javascript (43.466421ms)
  ✔ GET /vendor/three/../package.json mengembalikan 404 (8.289523ms)
  ✔ GET /vendor/three/src/Three.js mengembalikan 404 (hanya build/ dan examples/jsm/ yang diizinkan) (5.817495ms)
  ✔ GET /vendor/three/package.json mengembalikan 404 (4.492379ms)
✔ Endpoint /api/office dan vendor /vendor/three/* (122.183746ms)
▶ PWA manifest, icons, and service worker
  ✔ Manifest dilayani dengan content-type yang benar dan JSON valid berisi field wajib (55.343145ms)
  ✔ Semua ikon di manifest ada dan berstatus 200 (37.735651ms)
  ✔ /sw.js berstatus 200 dan tidak memuat pola cache untuk /api/ (7.741928ms)
  ✔ Registrasi script pwa.js dapat diakses di /app/pwa.js (6.517249ms)
  ✔ HTML head memuat tag PWA dan safe-area viewport-fit (12.030977ms)
✔ PWA manifest, icons, and service worker (3137.113621ms)
✔ scanner: pemindaian transcript Claude secara inkremental dan akurat (12.353056ms)
✔ SSE stream menerima snapshot saat connect dan setelah POST event (176.733768ms)
✔ Pembersihan stale task (sweepStale) (55.208585ms)
▶ File statis dan pencegahan path traversal
  ✔ GET / menyajikan public/index.html (36.781376ms)
  ✔ /../package.json tidak bocor (mengembalikan 404/400) (7.34987ms)
  ✔ file tak ada mengembalikan 404 (8.274348ms)
  ✔ GET /api/health mengembalikan { ok: true } (7.416207ms)
✔ File statis dan pencegahan path traversal (72.785983ms)
✔ Statistik agregasi hari ini dan deduplikasi usage (128.11432ms)
✔ GET /api/system: telemetri RAM server asli dan kalkulator boks gudang (43.849753ms)
✔ GET /api/usage: laporan agregasi token & biaya per hari, persona, dan model (89.752372ms)
▶ Validasi endpoint POST /api/events
  ✔ persona tak dikenal mengembalikan 400 (38.133425ms)
  ✔ type tak dikenal mengembalikan 400 (7.763202ms)
  ✔ field tak dikenal di root mengembalikan 400 (6.108294ms)
  ✔ title dipotong 120 karakter (31.356221ms)
  ✔ body > 16 KB mengembalikan 413 (3.991918ms)
  ✔ JSON rusak mengembalikan 400 (3.309801ms)
✔ Validasi endpoint POST /api/events (102.069873ms)
ℹ tests 72
ℹ suites 0
ℹ pass 72
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4395.491215
```

### Ragu / belum selesai
- Tidak ada. Semua 6 butir kebutuhan mobile dan proteksi desktop terpenuhi, slot `#zone-chips-slot` tersedia untuk PLAN-012 Alex, dan 72 tes unit lulus 100%.

### Pertanyaan untuk reviewer
- Apakah susunan bottom tab bar (Kantor, Tim, Aktivitas, Token) sudah pas dengan workflow pemantauan kantor harian pemilik di iPhone?

---

## Review (diisi Claude)
**Putusan:** 

**Yang diperiksa:** 

**Catatan:**
