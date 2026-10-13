/* UCD Sketch3D — service worker
   Strategy: the whole app is precached on install, so it opens offline.
   Bump CACHE whenever any precached file changes; the old cache is dropped
   on activate and every open tab picks the new version up on next load. */

const CACHE = 'ucd-sketch3d-v3.1.0';

const SHELL = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'vendor/three.min.js',
  'vendor/pdf.min.js',
  'vendor/pdf.worker.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigations: serve the app shell so a deep link or a cold offline start works.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html', { ignoreSearch: true })
        .then(r => r || caches.match('.')))
    );
    return;
  }

  // Same-origin assets: cache first, they are versioned by CACHE above.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Cross-origin (the web fonts): network first, fall back to whatever was cached.
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.status === 200 || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
