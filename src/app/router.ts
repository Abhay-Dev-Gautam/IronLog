import { useSyncExternalStore } from 'react'

/**
 * Minimal hash router. Hash URLs need no server rewrites, so the built app
 * works from any static host and from the Home Screen.
 *
 * Every entry we push records its depth in `history.state`, which lets
 * `goBack` tell whether there is an in-app screen to return to (a standalone
 * PWA has no browser back button).
 */

interface RouterState {
  ironlogDepth: number
}

function isRouterState(value: unknown): value is RouterState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<RouterState>).ironlogDepth === 'number'
  )
}

function readDepth(): number {
  const state: unknown = window.history.state
  return isRouterState(state) ? state.ironlogDepth : 0
}

export function normalizePath(hash: string): string {
  const path = hash.replace(/^#/, '')
  return path.startsWith('/') ? path : '/'
}

function getPath(): string {
  return normalizePath(window.location.hash)
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  window.addEventListener('hashchange', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
    window.removeEventListener('hashchange', listener)
  }
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, getPath)
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (to === getPath()) return
  const url = `#${to}`
  if (options.replace) {
    window.history.replaceState({ ironlogDepth: readDepth() } satisfies RouterState, '', url)
  } else {
    window.history.pushState({ ironlogDepth: readDepth() + 1 } satisfies RouterState, '', url)
  }
  listeners.forEach((listener) => listener())
}

/** Pops back if we navigated here in-app, otherwise replaces with `fallback`. */
export function goBack(fallback: string): void {
  if (readDepth() > 0) {
    window.history.back()
  } else {
    navigate(fallback, { replace: true })
  }
}
