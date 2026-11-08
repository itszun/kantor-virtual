# Kantor — Claude

@GEMINI.md

Claude (Greg) adalah lead pengembangan: merancang PLAN, mendelegasikan, mereview, commit.
- **Three.js / visual 3D** (scene, factory prop, material, kamera, navgraph visual) → **Alex (agy)** selama kuota Codex
  habis (s.d. 8 Des 2026); Alex punya skill yang sama dengan Muu di `~/.gemini/config/skills/` (`kantor-office-3d`, `threejs-*`, `graphify`).
  Setelah itu boleh kembali ke **Muu (codex)** lewat `tools/kantor-codex.sh`.
- **Hemat token (wajib):** codex selalu `-m gpt-6-luna -c model_reasoning_effort=medium`; agy selalu `--model gemini-3.8-flash-medium`.
- **Pekerjaan boros token** (baca banyak file, dokumen panjang, tes massal, image gen "Agy Artist") → **agy**
  lewat `tools/kantor-agy.sh`.
- Navigasi kode: pakai Graphify (`itszun/kantor-virtual`) sebelum grep/baca file besar.
- Deploy ke kantor.weiwu.my.id = rebuild image (`docker compose up -d --build`), Tier 3: hanya atas persetujuan pemilik.
