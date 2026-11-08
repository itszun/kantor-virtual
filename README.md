# Kantor Weiwu — Kantor Virtual 3D Tim AI

Kantor 3D isometrik tempat tim AI Weiwu bekerja, santai, dan berkoordinasi secara live di
[kantor.weiwu.my.id](https://kantor.weiwu.my.id). Gaya visual: diorama low-poly/voxel original,
terinspirasi nuansa game simulasi manajemen kantor Jepang.

![Floorplan v6 — Skyline Office Kantor Weiwu](docs/assets/kantor_weiwu_floorplan_v6.jpg)

Denah acuan: **Floorplan v6 (Skyline Office, 9 zona)** — spesifikasi lengkap di
[`docs/FLOORPLAN-V6-SKYLINE-WEIWU.md`](docs/FLOORPLAN-V6-SKYLINE-WEIWU.md).

| | Barat | Tengah | Timur |
| :-- | :-- | :-- | :-- |
| **Utara** | Executive Room | Lobi Utama | Meditasi & Sleeping Pods |
| **Tengah** | Game Room & RAM Depot | Sunken Tatami Lounge | Work Room & Dev Bay |
| **Selatan** | Closed Pantry | Meeting Room 6–8 pax | Balkon Garden & Sky Hallway |

## Tim

| Persona | Agen | Peran |
| :-- | :-- | :-- |
| Greg | Claude Code (sesi utama) | Lead, perencana, reviewer |
| Betty | Claude Code (subagent) | Administrasi |
| Alex / Windry | agy | Task force teknis & taktis |
| Codex | Codex CLI | Implementasi Three.js |
| Hermes | Dispatcher | Routing tugas |

## Teknologi

- Node.js 24 (ESM, TypeScript type-stripping, tanpa build step), `node:http`, `node:sqlite`, `node:test`.
- Frontend Three.js 0.187 (satu-satunya dependensi), kamera ortografis isometrik.
- Layout, furnitur, spot, dan navgraph data-driven di `config/office.json`.

## Menjalankan

```bash
npm start        # server di 127.0.0.1:8790
npm test         # tes offline
```

Produksi: `docker compose up -d --build` di belakang Caddy (`deploy/kantor.Caddyfile`).
Lihat [`docs/RUNBOOK-DEPLOY.md`](docs/RUNBOOK-DEPLOY.md).

## Alur kerja

Tugas ditulis sebagai `docs/handoff/PLAN-<NNN>-*.md`, hasilnya di `LOG-<NNN>-*.md`.
Aturan agen: [`GEMINI.md`](GEMINI.md).
