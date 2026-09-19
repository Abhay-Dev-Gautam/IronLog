import { useState } from 'react'
import { BottomAction } from '../../components/BottomAction'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { useRestTimer } from '../../hooks/useRestTimer'
import { getProgress, getRemainingMs, isExpired, toDisplaySeconds } from '../../services/restTimer'
import { formatClock } from '../../utils/format'
import { RestTimerPanel } from './RestTimerPanel'
import styles from './WorkoutDock.module.css'

/** Thumb-zone controls for an active workout: the rest timer and Finish. */
export function WorkoutDock({ onFinish }: { onFinish: () => void }) {
  const [timerOpen, setTimerOpen] = useState(false)

  return (
    <BottomAction>
      <div className={styles.dock}>
        {timerOpen && <RestTimerPanel onClose={() => setTimerOpen(false)} />}
        <div className={styles.row}>
          <RestTimerPill expanded={timerOpen} onToggle={() => setTimerOpen((open) => !open)} />
          <Button size="large" className={styles.finish} onClick={onFinish}>
            Finish
          </Button>
        </div>
      </div>
    </BottomAction>
  )
}

function RestTimerPill({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { timer, now } = useRestTimer()
  const remaining = getRemainingMs(timer, now)
  const expired = isExpired(timer, now)
  const seconds = toDisplaySeconds(remaining)

  let text = 'Rest'
  let description = 'Rest timer'
  if (timer.status === 'running' && !expired) {
    text = formatClock(seconds)
    description = `Resting, ${formatClock(seconds)} left`
  } else if (timer.status === 'paused') {
    text = formatClock(seconds)
    description = `Rest timer paused at ${formatClock(seconds)}`
  } else if (expired) {
    text = `+${formatClock(seconds)}`
    description = `Rest over by ${formatClock(seconds)}`
  }

  const stateClass = expired ? styles.expired : timer.status === 'running' ? styles.running : ''
  return (
    <button
      type="button"
      className={`${styles.pill} ${stateClass}`}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${description}. ${expanded ? 'Hide' : 'Show'} timer controls`}
    >
      <Icon name={timer.status === 'paused' ? 'pause' : 'timer'} size={22} strokeWidth={2.2} />
      <span className={styles.pillText}>{text}</span>
      <Icon name="chevron-down" size={18} className={expanded ? styles.chevronOpen : styles.chevron} />
      {timer.status === 'running' && !expired && (
        <span className={styles.pillProgress} style={{ transform: `scaleX(${getProgress(timer, now)})` }} aria-hidden="true" />
      )}
      <span className="visually-hidden" aria-live="polite">
        {expired ? 'Rest complete' : ''}
      </span>
    </button>
  )
}
