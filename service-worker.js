/*
 * IronLog service worker — template.
 *
 * The build fills in the cache name and asset list below (see the
 * ironlogServiceWorker plugin in vite.config.ts) and emits this as
 * dist/sw.js. It is deliberately
 * small and caches only IronLog's own files: no third-party requests, no
 * analytics, no network calls the app does not already make.
 *
 * Workout data lives in IndexedDB and is never touched here.
 */

const CACHE = '__CACHE_NAME__'
const ASSETS = __ASSETS__

/*
 * ignoreVary: static hosts often answer with `Vary: Origin`, and Vite's
 * module script and stylesheet tags carry `crossorigin`, so the browser
 * sends an Origin header that the precache request did not. Strict matching
 * would then miss every asset and the app would not start offline.
 */
const MATCH = { ignoreVary: true }

self.addEventListener('install', (event) => {
  // Precache the whole shell so the first offline launch works even if the
  // user never visited every screen.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

// The app asks to apply an update when the user taps Reload.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // never cache anything third-party

  // Navigations: try the network so a deployed update is picked up, and fall
  // back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch (error) {
          const cache = await caches.open(CACHE)
          const shell = (await cache.match('/index.html', MATCH)) ?? (await cache.match('/', MATCH))
          if (shell) return shell
          throw error
        }
      })(),
    )
    return
  }

  // Everything else is a build asset with a hashed name or a stable local
  // file: serve from cache first, and fill the cache on a miss.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const hit = await cache.match(request, MATCH)
      if (hit) return hit
      const response = await fetch(request)
      if (response.ok && response.type === 'basic') cache.put(request, response.clone())
      return response
    })(),
  )
})
