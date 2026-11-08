import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';

const PORT = 8855;

test('PWA manifest, icons, and service worker', async (t) => {
  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
  });

  let manifestData: any = null;

  await t.test('Manifest dilayani dengan content-type yang benar dan JSON valid berisi field wajib', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/landing/manifest.webmanifest`);
    assert.equal(res.status, 200, 'Manifest status must be 200');
    const contentType = res.headers.get('content-type') || '';
    assert.ok(
      contentType.includes('application/manifest+json'),
      `Content-Type should be application/manifest+json, got ${contentType}`
    );

    const body = await res.json();
    manifestData = body;

    assert.equal(body.name, 'Kantor Weiwu');
    assert.equal(body.short_name, 'Kantor');
    assert.equal(body.start_url, '/office');
    assert.equal(body.scope, '/');
    assert.equal(body.display, 'standalone');
    assert.equal(body.lang, 'id');
    assert.ok(body.background_color, 'background_color must exist');
    assert.ok(body.theme_color, 'theme_color must exist');
    assert.ok(Array.isArray(body.icons), 'icons must be an array');
    assert.ok(body.icons.length >= 3, 'manifest must have at least 3 icons');

    const has192 = body.icons.some((icon: any) => icon.sizes === '192x192');
    const has512 = body.icons.some((icon: any) => icon.sizes === '512x512');
    const hasMaskable = body.icons.some((icon: any) => icon.purpose && icon.purpose.includes('maskable'));

    assert.ok(has192, 'manifest must include 192x192 icon');
    assert.ok(has512, 'manifest must include 512x512 icon');
    assert.ok(hasMaskable, 'manifest must include maskable icon');
  });

  await t.test('Semua ikon di manifest ada dan berstatus 200', async () => {
    assert.ok(manifestData && Array.isArray(manifestData.icons), 'manifest data must be loaded');

    for (const icon of manifestData.icons) {
      const iconUrl = `http://127.0.0.1:${PORT}${icon.src}`;
      const res = await fetch(iconUrl);
      assert.equal(res.status, 200, `Icon at ${icon.src} should return status 200`);
      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('image/png'), `Icon at ${icon.src} should be image/png`);
      const buf = await res.arrayBuffer();
      assert.ok(buf.byteLength > 0, `Icon at ${icon.src} should not be empty`);
    }

    // Periksa juga apple-touch-icon.png
    const appleTouchRes = await fetch(`http://127.0.0.1:${PORT}/landing/icons/apple-touch-icon.png`);
    assert.equal(appleTouchRes.status, 200, 'apple-touch-icon.png should return status 200');
    assert.ok(
      (appleTouchRes.headers.get('content-type') || '').includes('image/png'),
      'apple-touch-icon.png should be image/png'
    );
  });

  await t.test('/sw.js berstatus 200 dan tidak memuat pola cache untuk /api/', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/sw.js`);
    assert.equal(res.status, 200, 'sw.js status must be 200');
    const cacheControl = res.headers.get('cache-control') || '';
    assert.ok(
      cacheControl.includes('no-cache'),
      `sw.js must be served with Cache-Control: no-cache, got: ${cacheControl}`
    );

    const swCode = await res.text();
    assert.ok(swCode.includes('/api/'), 'sw.js should reference /api/ to guard against caching it');

    // Pastikan tidak ada pola cache yang mencakup /api/
    assert.ok(
      swCode.includes("pathname.startsWith('/api/')"),
      'sw.js must explicitly bypass /api/'
    );

    // Pastikan /api/stream atau /api/ tidak disimpan ke dalam caches
    assert.doesNotMatch(
      swCode,
      /caches\.open[^{}]*\/api\//,
      'sw.js must never put /api/ endpoints into caches'
    );
  });

  await t.test('Registrasi script pwa.js dapat diakses di /app/pwa.js', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/app/pwa.js`);
    assert.equal(res.status, 200, 'pwa.js status must be 200');
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('javascript'), 'pwa.js must be javascript');
    const code = await res.text();
    assert.ok(code.includes('/sw.js'), 'pwa.js should register /sw.js');
  });

  await t.test('HTML head memuat tag PWA dan safe-area viewport-fit', async () => {
    // /index.html
    const indexRes = await fetch(`http://127.0.0.1:${PORT}/`);
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes('/landing/manifest.webmanifest'), 'index.html has manifest link');
    assert.ok(indexHtml.includes('/landing/icons/apple-touch-icon.png'), 'index.html has apple-touch-icon');
    assert.ok(indexHtml.includes('apple-mobile-web-app-capable'), 'index.html has apple-mobile-web-app-capable');
    assert.ok(indexHtml.includes('mobile-web-app-capable'), 'index.html has mobile-web-app-capable');
    assert.ok(indexHtml.includes('viewport-fit=cover'), 'index.html has viewport-fit=cover');
    assert.ok(indexHtml.includes('/app/pwa.js'), 'index.html has /app/pwa.js script');

    // /landing/
    const landingRes = await fetch(`http://127.0.0.1:${PORT}/landing/`);
    const landingHtml = await landingRes.text();
    assert.ok(landingHtml.includes('/landing/manifest.webmanifest'), 'landing index.html has manifest link');
    assert.ok(landingHtml.includes('/landing/icons/apple-touch-icon.png'), 'landing index.html has apple-touch-icon');
    assert.ok(landingHtml.includes('apple-mobile-web-app-capable'), 'landing index.html has apple-mobile-web-app-capable');
    assert.ok(!landingHtml.includes('/app/pwa.js'), 'landing index.html must not include /app/pwa.js');
  });
});
