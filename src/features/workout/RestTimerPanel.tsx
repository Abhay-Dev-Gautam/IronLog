import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { useRestTimer } from '../../hooks/useRestTimer'
import {
  getProgress,
  getRemainingMs,
  isExpired,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
  REST_PRESETS_SECONDS,
  toDisplaySeconds,
} from '../../services/restTimer'
import { pauseRest, resetRest, resumeRest, startRest } from '../../services/restTimerStore'
import { formatClock } from '../../utils/format'
import styles from './WorkoutDock.module.css'

/** Expanded rest timer controls. Non-modal: the workout stays editable behind it. */
export function RestTimerPanel({ onClose }: { onClose: () => void }) {
  const { timer, now } = useRestTimer()
  const [custom, setCustom] = useState('')
  const [customError, setCustomError] = useState<string | null>(null)
  const customId = useId()

  const expired = isExpired(timer, now)
  const seconds = toDisplaySeconds(getRemainingMs(timer, now))
  const label = timer.status === 'idle' ? null : timer.label
  const durationSeconds = Math.round(timer.durationMs / 1000)

  function startCustom(event: FormEvent) {
    event.preventDefault()
    const value = Number(custom)
    if (!Number.isInteger(value) || value < MIN_REST_SECONDS || value > MAX_REST_SECONDS) {
      setCustomError(`Enter ${MIN_REST_SECONDS}–${MAX_REST_SECONDS} seconds`)
      return
    }
    setCustomError(null)
    setCustom('')
    startRest(value, label)
  }

  return (
    <section className={styles.panel} aria-label="Rest timer">
      <div className={styles.panelHead}>
        <p className={styles.panelLabel}>{expired ? 'Rest complete' : (label ?? 'Rest timer')}</p>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Hide timer controls">
          <Icon name="chevron-down" size={22} />
        </button>
      </div>

      <p className={`${styles.clock} ${expired ? styles.clockExpired : ''}`} role="timer">
        {expired ? `+${formatClock(seconds)}` : formatClock(seconds)}
      </p>
      <div className={styles.bar} aria-hidden="true">
        <div className={styles.barValue} style={{ transform: `scaleX(${getProgress(timer, now)})` }} />
      </div>

      <div className={styles.controls}>
        {timer.status === 'idle' && (
          <Button size="large" block onClick={() => startRest(durationSeconds)}>
            <Icon name="play" size={20} /> Start {formatClock(durationSeconds)}
          </Button>
        )}
        {timer.status === 'running' && !expired && (
          <Button size="large" variant="secondary" block onClick={pauseRest}>
            <Icon name="pause" size={20} /> Pause
          </Button>
        )}
        {timer.status === 'paused' && (
          <Button size="large" block onClick={resumeRest}>
            <Icon name="play" size={20} /> Resume
          </Button>
        )}
        {timer.status !== 'idle' && (
          <Button size="large" variant="secondary" block onClick={resetRest}>
            <Icon name="reset" size={20} /> {expired ? 'Done' : 'Reset'}
          </Button>
        )}
      </div>

      <fieldset className={styles.presets}>
        <legend className="visually-hidden">Start rest for</legend>
        {REST_PRESETS_SECONDS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={styles.preset}
            aria-pressed={timer.status !== 'idle' && timer.durationMs === preset * 1000}
            onClick={() => startRest(preset, label)}
          >
            {formatClock(preset)}
          </button>
        ))}
      </fieldset>

      <form className={styles.custom} onSubmit={startCustom} noValidate>
        <label htmlFor={customId} className={styles.customLabel}>
          Custom
        </label>
        <input
          id={customId}
          className={styles.customInput}
          type="text"
          inputMode="numeric"
          enterKeyHint="go"
          autoComplete="off"
          maxLength={4}
          placeholder="sec"
          value={custom}
          aria-invalid={customError ? true : undefined}
          onChange={(event) => setCustom(event.target.value.trim())}
        />
        <Button type="submit" variant="secondary">
          Start
        </Button>
      </form>
      {customError && (
        <p className={styles.customError} role="alert">
          {customError}
        </p>
      )}
    </section>
  )
}
