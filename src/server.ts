import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadConfig, type Config } from './config.ts';
import { initDatabase } from './db.ts';
import { validateEvent, ingest } from './events.ts';
import { getSnapshot, sweepStale, getRecentTasks } from './state.ts';
import { getUsageReport } from './usage.ts';
import { scanOnce } from './scanner.ts';
import { loadPricing } from './pricing.ts';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function timingSafeCheck(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length || bufA.length === 0) {
    const dummy = Buffer.alloc(16);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function getExpectedToken(tokenFilePath: string | null): string | null {
  if (!tokenFilePath) return null;
  try {
    if (!fs.existsSync(tokenFilePath)) return null;
    const content = fs.readFileSync(tokenFilePath, 'utf8').trim();
    return content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

export interface KantorServer extends http.Server {
  server: KantorServer;
  db: ReturnType<typeof initDatabase>;
  config: Config;
  broadcastSnapshot: () => void;
  closeAll: () => Promise<void>;
}

export function createServer(overrides: Partial<Config> = {}): KantorServer {
  const config = loadConfig(overrides);
  const db = initDatabase(config.dbPath);
  const personaIds = new Set(config.personas.map((p) => p.id));
  const sseClients = new Set<http.ServerResponse>();

  function broadcastSnapshot() {
    const snapshot = getSnapshot(db, config.personas);
    const data = `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(data);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Heartbeat timer (15s)
  const heartbeatInterval = setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(': heartbeat\n\n');
      } catch {
        sseClients.delete(client);
      }
    }
  }, 15000);
  heartbeatInterval.unref();

  // Stale sweep timer (60s)
  const staleInterval = setInterval(() => {
    try {
      const swept = sweepStale(db, config.staleMinClaude, config.staleMinAgy);
      if (swept > 0) {
        broadcastSnapshot();
      }
    } catch {
      // Ignore background sweep errors
    }
  }, 60000);
  staleInterval.unref();

  // Claude transcript scanner (bila KANTOR_CLAUDE_PROJECTS di-set)
  const scanInterval = config.claudeProjectsDir
    ? setInterval(() => {
        try {
          const pricing = loadPricing(config.pricingPath);
          const r = scanOnce(db, config.claudeProjectsDir!, pricing, new Date(), config.scanMaxAgeDays);
          if (r.newUsageRows > 0) broadcastSnapshot();
        } catch (err: unknown) {
          console.error('Peringatan: Gagal scan transcript Claude:', err);
        }
      }, config.scanIntervalS * 1000)
    : null;
  scanInterval?.unref();

  const server = http.createServer((req, res) => {
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method?.toUpperCase() || 'GET';

    // 1. GET /api/health
    if (pathname === '/api/health' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // 2. GET /api/state
    if (pathname === '/api/state' && method === 'GET') {
      const snapshot = getSnapshot(db, config.personas);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(snapshot));
      return;
    }

    // 3. GET /api/history
    if (pathname === '/api/history' && method === 'GET') {
      const limitParam = parseInt(parsedUrl.searchParams.get('limit') || '40', 10);
      const limit = isNaN(limitParam) ? 40 : limitParam;
      const history = getRecentTasks(db, limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(history));
      return;
    }

    // 3b. GET /api/usage
    if (pathname === '/api/usage' && method === 'GET') {
      const daysParam = parseInt(parsedUrl.searchParams.get('days') || '7', 10);
      const days = isNaN(daysParam) ? 7 : daysParam;
      const report = getUsageReport(db, config.personas, days);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(report));
      return;
    }

    // 4. GET /api/stream (SSE)
    if (pathname === '/api/stream' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });

      // Kirim initial snapshot langsung
      const snapshot = getSnapshot(db, config.personas);
      res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);

      sseClients.add(res);
      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // 5. POST /api/events
    if (pathname === '/api/events' && method === 'POST') {
      // Ingest token check
      const expectedToken = getExpectedToken(config.ingestTokenFile);
      if (!expectedToken) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Service Unavailable: token file not configured or not found' }));
        return;
      }

      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: missing bearer token' }));
        return;
      }

      const providedToken = authHeader.slice(7).trim();
      if (!timingSafeCheck(providedToken, expectedToken)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: invalid token' }));
        return;
      }

      // Max body check (16 KB)
      const MAX_BODY_BYTES = 16 * 1024;
      const contentLength = req.headers['content-length'];
      if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large' }));
        return;
      }

      let bodyData = '';
      let bytesReceived = 0;
      let bodyTooLarge = false;

      req.on('data', (chunk: Buffer) => {
        if (bodyTooLarge) return;
        bytesReceived += chunk.length;
        if (bytesReceived > MAX_BODY_BYTES) {
          bodyTooLarge = true;
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload Too Large' }));
          req.destroy();
          return;
        }
        bodyData += chunk.toString('utf8');
      });

      req.on('end', () => {
        if (bodyTooLarge) return;

        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(bodyData);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        const valResult = validateEvent(parsedBody, personaIds);
        if (!valResult.ok || !valResult.data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: valResult.error }));
          return;
        }

        try {
          ingest(db, valResult.data);
          broadcastSnapshot();
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Database error';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errMsg }));
        }
      });
      return;
    }

    // 6. Static files dari public/
    if (pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }

    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    let filePathName = decodeURIComponent(pathname);
    if (filePathName === '/' || filePathName === '') {
      filePathName = '/index.html';
    }

    const resolvedPublicDir = path.resolve(config.publicDir);
    const targetFilePath = path.resolve(resolvedPublicDir, '.' + filePathName);

    // Cegah path traversal
    if (!targetFilePath.startsWith(resolvedPublicDir + path.sep) && targetFilePath !== resolvedPublicDir) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    let stat: fs.Stats;
    let finalPath = targetFilePath;
    try {
      stat = fs.statSync(finalPath);
      if (stat.isDirectory()) {
        finalPath = path.join(finalPath, 'index.html');
        stat = fs.statSync(finalPath);
      }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    if (!stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
    });

    if (method === 'HEAD') {
      res.end();
    } else {
      const stream = fs.createReadStream(finalPath);
      stream.pipe(res);
    }
  }) as KantorServer;

  // Attach properties for convenience
  server.server = server;
  server.db = db;
  server.config = config;
  server.broadcastSnapshot = broadcastSnapshot;

  server.closeAll = async () => {
    clearInterval(heartbeatInterval);
    clearInterval(staleInterval);
    if (scanInterval) {
      clearInterval(scanInterval);
    }
    for (const client of sseClients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    sseClients.clear();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    try {
      db.close();
    } catch {
      // ignore
    }
  };

  server.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(staleInterval);
    if (scanInterval) {
      clearInterval(scanInterval);
    }
    for (const client of sseClients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    sseClients.clear();
    try {
      db.close();
    } catch {
      // ignore
    }
  });

  return server;
}

// Jalankan jika dieksekusi langsung
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const server = createServer();
  server.listen(server.config.port, () => {
    console.log(`Kantor API berjalan di port ${server.config.port}`);
  });
}
