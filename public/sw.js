// Service Worker untuk Kantor Weiwu PWA
const CACHE_NAME = 'kantor-v1';

// Install: aktivasi worker baru tanpa menunggu
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: hapus cache versi terdahulu
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler:
// 1. Cache-first untuk aset statis versi tetap (/vendor/three/..., /landing/icons/...)
// 2. Network-first untuk halaman HTML
// 3. JANGAN PERNAH meng-cache atau mencegat /api/* (termasuk SSE /api/stream)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Lewatkan request non-GET dan cross-origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Penting: JANGAN PERNAH mencegat atau meng-cache endpoint /api/*
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first untuk dokumen HTML
  const isHtml = event.request.mode === 'navigate' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname === '/' ||
                 url.pathname === '/office';

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first untuk aset statis versi tetap
  const isStaticFixed = url.pathname.startsWith('/vendor/three/') ||
                        url.pathname.startsWith('/landing/icons/') ||
                        url.pathname === '/landing/manifest.webmanifest';

  if (isStaticFixed) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
