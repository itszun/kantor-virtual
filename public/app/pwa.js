// Registrasi PWA Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch((err) => {
        // Penanganan error secara senyap
        if (typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug('ServiceWorker registration ignored/failed:', err);
        }
      });
  });
}
