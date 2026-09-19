/**
 * Rest timer state. The source of truth is a target timestamp, never a
 * decrementing counter: `remaining = endsAt - now`. Throttled or suspended
 * intervals (screen locked, app backgrounded) therefore cannot cause drift.
 * All times are epoch milliseconds and every function takes `now` explicitly.
 */

export type RestTimer =
  | { status: 'idle'; durationMs: number }
  | { status: 'running'; durationMs: number; endsAt: number; label: string | null }
  | { status: 'paused'; durationMs: number; remainingMs: number; label: string | null }

export const REST_PRESETS_SECONDS = [60, 90, 120, 180] as const
export const MIN_REST_SECONDS = 5
export const MAX_REST_SECONDS = 3600

export function idleTimer(durationMs: number): RestTimer {
  return { status: 'idle', durationMs }
}

export function startTimer(durationMs: number, now: number, label: string | null = null): RestTimer {
  return { status: 'running', durationMs, endsAt: now + durationMs, label }
}

export function pauseTimer(timer: RestTimer, now: number): RestTimer {
  if (timer.status !== 'running') return timer
  return { status: 'paused', durationMs: timer.durationMs, remainingMs: Math.max(0, timer.endsAt - now), label: timer.label }
}

export function resumeTimer(timer: RestTimer, now: number): RestTimer {
  if (timer.status !== 'paused') return timer
  return { status: 'running', durationMs: timer.durationMs, endsAt: now + timer.remainingMs, label: timer.label }
}

/** Stops the timer and returns it to its full duration. */
export function resetTimer(timer: RestTimer): RestTimer {
  return idleTimer(timer.durationMs)
}

/** Milliseconds left. Negative once a running timer has passed its end (overtime). */
export function getRemainingMs(timer: RestTimer, now: number): number {
  switch (timer.status) {
    case 'idle':
      return timer.durationMs
    case 'paused':
      return timer.remainingMs
    case 'running':
      return timer.endsAt - now
  }
}

export function isExpired(timer: RestTimer, now: number): boolean {
  return timer.status === 'running' && now >= timer.endsAt
}

/** Fraction of the rest completed, 0–1. */
export function getProgress(timer: RestTimer, now: number): number {
  if (timer.durationMs <= 0) return 1
  const elapsed = timer.durationMs - getRemainingMs(timer, now)
  return Math.min(1, Math.max(0, elapsed / timer.durationMs))
}

/** Whole seconds for display, counting up during overtime: 90500 ms → 91, -1200 ms → 1. */
export function toDisplaySeconds(remainingMs: number): number {
  return remainingMs >= 0 ? Math.ceil(remainingMs / 1000) : Math.floor(-remainingMs / 1000)
}

/** Overtime beyond this is a forgotten timer, not a rest. */
export const STALE_AFTER_MS = 15 * 60_000

/**
 * A restored timer that ran out long ago (e.g. the app was closed overnight)
 * comes back idle instead of showing hours of overtime.
 */
export function discardIfStale(timer: RestTimer, now: number): RestTimer {
  return timer.status === 'running' && now - timer.endsAt > STALE_AFTER_MS ? resetTimer(timer) : timer
}

/** Parses stored/imported timer state, rejecting anything malformed. */
export function parseRestTimer(value: unknown): RestTimer | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const durationMs = record.durationMs
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) return null
  const label = typeof record.label === 'string' ? record.label : null
  if (record.status === 'idle') return idleTimer(durationMs)
  if (record.status === 'running' && typeof record.endsAt === 'number' && Number.isFinite(record.endsAt)) {
    return { status: 'running', durationMs, endsAt: record.endsAt, label }
  }
  if (record.status === 'paused' && typeof record.remainingMs === 'number' && record.remainingMs >= 0) {
    return { status: 'paused', durationMs, remainingMs: record.remainingMs, label }
  }
  return null
}
