/**
 * Service worker registration and update handling.
 *
 * Updates are never applied silently: a new version waits until the user taps
 * Reload, so a deploy can't swap the app out mid-workout.
 */

let updateReady = false
let waiting: ServiceWorker | null = null
const listeners = new Set<() => void>()

function announce(worker: ServiceWorker) {
  waiting = worker
  updateReady = true
  listeners.forEach((listener) => listener())
}

export function subscribeToUpdates(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isUpdateReady(): boolean {
  return updateReady
}

/** Registers the worker. Production builds only; the dev server serves fresh files anyway. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Already waiting from a previous visit.
        if (registration.waiting && navigator.serviceWorker.controller) announce(registration.waiting)

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // "installed" with a controller present means this is an update,
            // not the very first install.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) announce(installing)
          })
        })
      })
      .catch((error: unknown) => {
        // Offline support is a bonus; the app works regardless.
        console.warn('[IronLog] Service worker registration failed', error)
      })
  })
}

/** Applies the waiting update and reloads once it has taken over. */
export function applyUpdate(): void {
  if (!waiting) {
    window.location.reload()
    return
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  waiting.postMessage('SKIP_WAITING')
}
