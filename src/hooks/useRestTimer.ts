import { useEffect, useState, useSyncExternalStore } from 'react'
import type { RestTimer } from '../services/restTimer'
import { getRestTimerSnapshot, subscribeRestTimer } from '../services/restTimerStore'

const TICK_MS = 250

/**
 * The rest timer plus the current time. While the timer runs, a tick
 * re-renders a few times a second; the displayed value is always computed
 * from timestamps, so a throttled tick only delays a repaint, never the timer.
 */
export function useRestTimer(): { timer: RestTimer; now: number } {
  const { timer, changedAt } = useSyncExternalStore(subscribeRestTimer, getRestTimerSnapshot)
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    if (timer.status !== 'running') return
    const refresh = () => setTick(Date.now())
    const interval = window.setInterval(refresh, TICK_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [timer])

  // A timer that just (re)started is never shown against an older tick.
  return { timer, now: Math.max(tick, changedAt) }
}
