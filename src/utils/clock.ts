import { parseLocalDateKey } from './date'

/**
 * Development only: `?today=YYYY-MM-DD` shifts the app clock to that day
 * (keeping the real time of day), so weekday screens and session dates can be
 * checked on any day. Production builds always use the real clock.
 */
function readDevOffsetMs(): number {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 0
  const key = new URLSearchParams(window.location.search).get('today')
  const target = key ? parseLocalDateKey(key) : null
  if (!target) return 0
  const real = new Date()
  target.setHours(real.getHours(), real.getMinutes(), real.getSeconds(), real.getMilliseconds())
  return target.getTime() - real.getTime()
}

const offsetMs = readDevOffsetMs()

/** The current date for calendar and session timestamps. */
export function now(): Date {
  return new Date(Date.now() + offsetMs)
}
