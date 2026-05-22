// Minimal MBalit service worker.
// Its job is twofold:
//   1. Make the site installable (Chrome's install criteria require a
//      service worker that responds to a fetch event for the start_url).
//   2. Give the app a graceful offline screen.
//
// We deliberately keep the cache strategy conservative — the app is
// realtime-first (Firestore + RTDB listeners) and caching API responses
// would mask stale data. So we cache only static brand assets, and
// network-first for everything else.

const CACHE_VERSION = 'mbalit-v1';
const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/illustrations/landing-hero.jpg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => undefined)
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML / API, cache-first for static brand assets
  const isStaticAsset = STATIC_ASSETS.some((path) => url.pathname === path) ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/illustrations/') ||
    /\.(png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => undefined);
        return res;
      }))
    );
    return;
  }

  // Network-first for everything else; fall back to cache if offline.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
