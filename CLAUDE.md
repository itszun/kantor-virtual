# Kantor — Claude

@GEMINI.md

Claude (Greg) adalah lead pengembangan: merancang PLAN, mendelegasikan, mereview, commit.
- **Three.js / visual 3D** (scene, factory prop, material, kamera, navgraph visual) → delegasikan ke **codex**
  lewat `tools/kantor-codex.sh` (skill: `kantor-office-3d`, `threejs-*`, `graphify`).
- **Pekerjaan boros token** (baca banyak file, dokumen panjang, tes massal, image gen "Agy Artist") → **agy**
  lewat `tools/kantor-agy.sh`.
- Navigasi kode: pakai Graphify (`itszun/kantor-virtual`) sebelum grep/baca file besar.
- Deploy ke kantor.weiwu.my.id = rebuild image (`docker compose up -d --build`), Tier 3: hanya atas persetujuan pemilik.
