import { useEffect, useState } from 'react'
import { now } from '../utils/clock'
import { getGreeting, toLocalDateKey } from '../utils/date'

const CHECK_INTERVAL_MS = 30_000

/** Changes only when something the UI shows changes: the calendar day or the greeting. */
function snapshotKey(date: Date): string {
  return `${toLocalDateKey(date)}|${getGreeting(date)}`
}

/**
 * The current date, kept fresh for an app that may sit suspended on the
 * Home Screen for days. Re-checks on resume and periodically, and only
 * re-renders when the day or greeting period actually changes.
 */
export function useCurrentDate(): Date {
  const [date, setDate] = useState(now)

  useEffect(() => {
    const refresh = () => {
      const next = now()
      setDate((previous) => (snapshotKey(previous) === snapshotKey(next) ? previous : next))
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    const interval = window.setInterval(refresh, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return date
}
