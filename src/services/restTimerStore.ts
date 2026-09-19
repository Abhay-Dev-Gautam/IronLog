import {
  discardIfStale,
  idleTimer,
  parseRestTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
  type RestTimer,
} from './restTimer'

/**
 * The app's single rest timer. Its timestamps are kept in localStorage so a
 * countdown survives a reload or iOS killing the backgrounded app mid-rest.
 * Storage is a convenience here: if it fails, the timer still works in memory.
 */

export interface RestTimerSnapshot {
  timer: RestTimer
  /** When the timer last changed (epoch ms), so views never render it against an older clock. */
  changedAt: number
}

const STORAGE_KEY = 'ironlog:rest-timer'
const DEFAULT_REST_MS = 120_000

function load(): RestTimer | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    const timer = raw ? parseRestTimer(JSON.parse(raw)) : null
    return timer && discardIfStale(timer, Date.now())
  } catch {
    return null
  }
}

function save(timer: RestTimer): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(timer))
  } catch {
    // Private mode or full storage: keep going in memory.
  }
}

let snapshot: RestTimerSnapshot = { timer: load() ?? idleTimer(DEFAULT_REST_MS), changedAt: Date.now() }
const listeners = new Set<() => void>()

function update(change: (timer: RestTimer, now: number) => RestTimer): void {
  const now = Date.now()
  const next = change(snapshot.timer, now)
  if (next === snapshot.timer) return
  snapshot = { timer: next, changedAt: now }
  save(next)
  listeners.forEach((listener) => listener())
}

export function getRestTimerSnapshot(): RestTimerSnapshot {
  return snapshot
}

export function subscribeRestTimer(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Starts (or restarts) the countdown. */
export function startRest(seconds: number, label: string | null = null): void {
  update((_, now) => startTimer(seconds * 1000, now, label))
}

export function pauseRest(): void {
  update(pauseTimer)
}

export function resumeRest(): void {
  update(resumeTimer)
}

export function resetRest(): void {
  update((timer) => (timer.status === 'idle' ? timer : resetTimer(timer)))
}
