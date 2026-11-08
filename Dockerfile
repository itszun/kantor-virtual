# syntax=docker/dockerfile:1
FROM node:24-alpine AS base

WORKDIR /app

# Konfigurasi user non-root dengan UID:GID 1001 agar selaras dengan clouduser host
ARG UID=1001
ARG GID=1001
RUN if ! getent group ${GID} >/dev/null 2>&1 ; then addgroup -g ${GID} kantor ; fi && \
    if ! getent passwd ${UID} >/dev/null 2>&1 ; then adduser -D -u ${UID} -G $(getent group ${GID} | cut -d: -f1) kantor ; fi

ENV NODE_ENV=production

# Salin definisi paket dan pasang pustaka produksi (Three.js)
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Salin konfigurasi, antarmuka publik 3D, dan kode sumber server
COPY config/ ./config/
COPY public/ ./public/
COPY src/ ./src/

# Siapkan direktori data untuk SQLite database
RUN mkdir -p /app/data && chown -R ${UID}:${GID} /app

# Jalankan sebagai user non-root
USER ${UID}:${GID}

EXPOSE 8790

ENV KANTOR_PORT=8790 \
    KANTOR_DB=/app/data/kantor.db

# Health check mandiri via endpoint /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8790/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/server.ts"]
