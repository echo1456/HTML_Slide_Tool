/* HTML Slide Tool — Offline-First PWA Service Worker (Auto-versioned by build.py) */
const CACHE_NAME = 'html-slide-tool-v5.3.7';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/tailwind.built.css',
  './css/base.css',
  './css/slides.css',
  './css/editor.css',
  './css/studio.css',
  './css/print.css',
  './js/state.js',
  './js/history.js',
  './js/storage.js',
  './js/navigation.js',
  './js/text-editor.js',
  './js/selection.js',
  './js/media.js',
  './js/charts.js',
  './js/theme.js',
  './js/effects.js',
  './js/floating-cards.js',
  './js/widgets.js',
  './js/bundle-data.js',
  './js/export.js',
  './js/pwa-fs.js',
  './js/studio.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('html-slide-tool-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!req || req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Same-origin app shell: Network-First so local/web code edits apply immediately, with instant offline cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // External fonts/stylesheets: Cache-First with network update so installed PWA renders offline fonts cleanly
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const netFetch = fetch(req).then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return resp;
        }).catch(() => cached);
        return cached || netFetch;
      })
    );
  }
});
