// Service Worker for Lyrics & Chords Performance Viewer
// Provides offline functionality while always serving fresh app code when online.
//
// Strategy:
//   - HTML / navigation  → NETWORK-FIRST (always get the latest index.html when
//     online; fall back to cache offline). This guarantees edits/fixes show up
//     immediately on every device instead of one load late.
//   - Other assets       → CACHE-FIRST with background revalidation (fast + offline).

const CACHE_VERSION = 'v94';
const CACHE_NAME = `lyrics-app-${CACHE_VERSION}`;

// Files that make up the app shell.
// All paths relative so it works on any host (GitHub Pages, Netlify, custom domain).
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  // Firebase SDK bundled locally so the app shell stays 100% offline-capable.
  // (Sync itself needs the network, but the app must still boot & work offline.)
  './vendor/firebase-app-compat.js',
  './vendor/firebase-auth-compat.js',
  './vendor/firebase-firestore-compat.js',
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

// ===== ACTIVATE =====
// Clean up old caches when a new SW takes over.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function offlineFallback() {
  return new Response(
    '<html><body style="font-family:system-ui;padding:40px;text-align:center;background:#08080c;color:#fff;"><h1>Offline</h1><p>Diese Seite ist nicht im Cache verfügbar.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html' } }
  );
}

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Skip cross-origin requests (e.g., CDNs we don't want to cache)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Is this the app HTML (navigation or an .html / root request)?
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' ||
    accept.includes('text/html') ||
    url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isHTML) {
    // NETWORK-FIRST: always try the network so the newest app loads immediately.
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone).catch(() => {}));
        }
        return response;
      }).catch(() =>
        caches.match(req)
          .then((c) => c || caches.match('./index.html'))
          .then((c) => c || offlineFallback())
      )
    );
    return;
  }

  // OTHER ASSETS: cache-first with background revalidation.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone).catch(() => {});
          });
        }
        return response;
      }).catch(() => null);

      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }
      return networkFetch.then((response) => response || offlineFallback());
    })
  );
});

// ===== MESSAGE =====
// Allow the page to trigger an immediate update via postMessage.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
