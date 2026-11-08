# RUNBOOK DEPLOYMENT — KANTOR AI (kantor-api)

Dokumen ini adalah panduan operasional deployment layanan **Kantor AI** ke domain produksi `kantor.weiwu.my.id` berbasis Docker Compose dan Caddy Reverse Proxy.

---

## 1. Prasyarat & Ketentuan Akses

Sesuai aturan keamanan (**Tier 3 Constraint**):
- Modifikasi `/etc/caddy/Caddyfile`, reload Caddy, dan manajemen DNS dilakukan secara terpisah oleh pemilik server / Claude Code.
- Layanan aplikasi `kantor-api` berjalan di user `clouduser` (port internal `127.0.0.1:8790`), terisolasi dalam kontainer non-root dengan memori dibatasi (`mem_limit: 256m`).

---

## 2. Langkah Persiapan Host

### A. Inisialisasi Token Ingest Keamanan
Buat token rahasia untuk autentikasi endpoint `POST /api/events` (digunakan oleh hook Claude Code, AGY, Codex, dan Hermes):
```bash
mkdir -p ~/.config/kantor
openssl rand -hex 32 > ~/.config/kantor/ingest_token
chmod 600 ~/.config/kantor/ingest_token
```

### B. Pastikan Folder Data Persisten Tersedia
```bash
cd ~/Projects/kantor
mkdir -p data
```

---

## 3. Build & Jalankan Kontainer (Docker Compose)

Di dalam repositori `~/Projects/kantor/`:

```bash
# 1. Build image Docker berbasis node:24-alpine
docker compose build

# 2. Jalankan service kantor-api di latar belakang
docker compose up -d

# 3. Periksa status dan healthcheck kontainer
docker compose ps
```

Output yang diharapkan:
```
NAME         IMAGE               COMMAND                  SERVICE      CREATED         STATUS                   PORTS
kantor-api   kantor-api:latest   "node src/server.ts"     kantor-api   5 seconds ago   Up 4 seconds (healthy)   127.0.0.1:8790->8790/tcp
```

---

## 4. Konfigurasi Caddy Reverse Proxy (Tier 3)

Tambahkan blok berikut pada berkas konfigurasi Caddy (misal `/etc/caddy/Caddyfile`):

```caddy
kantor.weiwu.my.id {
    # 1. Autentikasi Pengguna (gunakan kredensial hash yang sama dengan dashboard lain)
    basicauth {
        # Format: <username> <hashed_password_bcrypt_atau_base64>
    }

    # 2. Proteksi Ingestion Internal: Blokir publik dari menembak /api/events
    respond /api/events 403

    # 3. Reverse Proxy ke Kantor API dengan SSE Stream tanpa buffering
    reverse_proxy 127.0.0.1:8790 {
        flush_interval -1
    }
}
```

Setelah memperbarui `Caddyfile`, validasi dan muat ulang Caddy:
```bash
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 5. Konfigurasi DNS

Pastikan record DNS telah mengarah ke server:
| Tipe | Nama Host | Target |
| :--- | :--- | :--- |
| `A` | `kantor.weiwu.my.id` | `<IP_PUBLIK_SERVER>` |

---

## 6. Verifikasi & Pengujian Pasca-Deploy

Jalankan serangkaian verifikasi berikut dari terminal server:

### A. Tes Internal Host (Port 8790)
```bash
# Health check endpoint
curl -s http://127.0.0.1:8790/api/health
# Ekspektasi: {"ok":true}

# Status snapshot persona
curl -s http://127.0.0.1:8790/api/state | jq '.personas | length'
# Ekspektasi: 6

# Metrik RAM server & boks gudang
curl -s http://127.0.0.1:8790/api/system | jq .
# Ekspektasi: JSON berisi total_mb, used_mb, dan storage_boxes

# Uji Server-Sent Events (SSE) stream (ambil 5 baris pertama)
curl -N -s http://127.0.0.1:8790/api/events/stream | head -n 5
```

### B. Tes Publik Melalui Caddy
```bash
# Uji proteksi dasar (harus 401 Unauthorized bila tanpa basicauth)
curl -i https://kantor.weiwu.my.id/

# Uji akses publik dengan kredensial
curl -s -u <username>:<password> https://kantor.weiwu.my.id/api/health
# Ekspektasi: {"ok":true}

# Uji proteksi /api/events (harus 403 Forbidden dari luar)
curl -i https://kantor.weiwu.my.id/api/events
# Ekspektasi: HTTP/2 403 Forbidden
```

---

## 7. Pemantauan & Operasional Rutin

```bash
# Melihat log runtime secara realtime
docker compose logs -f kantor-api

# Melihat penggunaan CPU dan Memori (dibatasi 256 MB)
docker stats kantor-api --no-stream

# Memulai ulang layanan jika ada update berkas statis/kode
docker compose restart kantor-api
```
