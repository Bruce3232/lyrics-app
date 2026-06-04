// Service Worker for Lyrics & Chords Performance Viewer
// Provides 100% offline functionality after first visit.
//
// Strategy: Cache-First with background update.
// On every fetch, we serve from cache instantly (offline-friendly),
// and in the background try to refresh the cache from the network.
// Next page load will pick up the new version automatically.

const CACHE_VERSION = 'v82';
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

// ===== FETCH =====
// Cache-first with background revalidation.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Skip cross-origin requests (e.g., CDNs we don't want to cache)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((response) => {
        // Only cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone).catch(() => {});
          });
        }
        return response;
      }).catch(() => null);

      // Return cached if available, else wait for network
      if (cached) {
        // Fire-and-forget background update
        networkFetch.catch(() => {});
        return cached;
      }
      return networkFetch.then((response) => {
        if (response) return response;
        // Truly offline and not in cache
        return new Response(
          '<html><body style="font-family:system-ui;padding:40px;text-align:center;background:#08080c;color:#fff;"><h1>Offline</h1><p>Diese Seite ist nicht im Cache verfügbar.</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
      });
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
