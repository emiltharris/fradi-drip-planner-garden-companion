/**
 * FRADI Drip Planner — Service Worker
 *
 * Offline-first PWA: precache app shell + catalogs on install,
 * cache-first fetch strategy for app assets
 */

const CACHE_NAME = 'fradi-v1';
const PRECACHE_URLS = [
  '/app/index.html',
  '/app/engine.js',
  '/app/pdf-gardener.js',
  '/app/pdf-workshop.js',
  '/app/storage.js',
  '/data/crops-catalog.json',
  '/data/parts-catalog.json',
  '/data/extrusion-profiles.json',
  '/data/mould-catalog.json',
  '/manifest.json'
];

// Install: precache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('Precache partial (some assets may not be available yet):', err);
        // Don't fail install if some assets aren't ready yet
      });
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: cache-first strategy for app assets, network-first for data
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Data files: try network first, fall back to cache
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache fresh data
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(event.request, response.clone()));
          return response;
        })
        .catch(() => {
          // Fall back to cached version
          return caches.match(event.request);
        })
    );
    return;
  }

  // App assets: cache-first (app shell, JS, etc.)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(event.request, response.clone()));
          }
          return response;
        });
      })
      .catch(() => {
        // Offline fallback: if available, return a cached version
        return caches.match('/app/index.html');
      })
  );
});
