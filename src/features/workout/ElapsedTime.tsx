import { useEffect, useState } from 'react'
import { now as clockNow } from '../../utils/clock'
import { formatDuration } from '../../utils/format'

const TICK_MS = 15_000

/** "Started 18:02 · 34 min", refreshed on its own so the rest of the screen doesn't re-render. */
export function ElapsedTime({ since }: { since: string }) {
  const [now, setNow] = useState(() => clockNow().getTime())

  useEffect(() => {
    const refresh = () => setNow(clockNow().getTime())
    const interval = window.setInterval(refresh, TICK_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const started = new Date(since)
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(started)
  return (
    <>
      Started {time} · {formatDuration(now - started.getTime())}
    </>
  )
}
