import { paths } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { ProgressRing } from '../../components/ProgressRing'
import { StatGroup, type Stat } from '../../components/StatGroup'
import type { ResolvedWorkoutDay } from '../../services/plan'
import type { DayWorkoutStatus } from '../../services/sessionStats'
import type { Weekday, WorkoutDay } from '../../types/domain'
import { WEEKDAY_LABELS } from '../../utils/date'
import { formatDuration, formatKg, formatRange, joinFocus } from '../../utils/format'
import styles from './TodayCard.module.css'

interface TodayCardProps {
  workout: ResolvedWorkoutDay
  status: DayWorkoutStatus
}

function statsFor(workout: ResolvedWorkoutDay, status: DayWorkoutStatus): Stat[] {
  if (status.state === 'complete') {
    const { summary } = status
    return [
      { label: 'Duration', value: summary.durationMs === null ? '—' : formatDuration(summary.durationMs) },
      { label: 'Sets', value: summary.completedSets },
      { label: 'Volume', value: formatKg(summary.volumeKg) },
    ]
  }
  const { completedSets, totalSets } = status.progress
  return [
    { label: 'Exercises', value: workout.exercises.length },
    { label: 'Sets', value: status.state === 'in-progress' ? `${completedSets}/${totalSets}` : totalSets },
    { label: 'Target RIR', value: workout.rirSpan ? formatRange(workout.rirSpan) : '—' },
  ]
}

export function TodayCard({ workout, status }: TodayCardProps) {
  return (
    <section className={styles.card} aria-labelledby="today-title">
      <div className={styles.top}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Today · {WEEKDAY_LABELS[workout.weekday]}</p>
          <h2 id="today-title" className={styles.title}>
            {workout.name}
          </h2>
          <p className={styles.focus}>{joinFocus(workout.focus)}</p>
          {status.state === 'complete' && (
            <p className={styles.complete}>
              <Icon name="check" size={18} strokeWidth={2.6} />
              Workout Complete
            </p>
          )}
        </div>
        <ProgressRing percent={status.progress.percent} label="Today's workout completion" />
      </div>
      <StatGroup className={styles.stats} stats={statsFor(workout, status)} />
    </section>
  )
}

interface RestDayCardProps {
  weekday: Weekday
  next: { date: Date; workout: WorkoutDay } | null
}

export function RestDayCard({ weekday, next }: RestDayCardProps) {
  return (
    <section className={`${styles.card} ${styles.rest}`} aria-labelledby="today-title">
      <div className={styles.top}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Today · {WEEKDAY_LABELS[weekday]}</p>
          <h2 id="today-title" className={styles.title}>
            Rest Day
          </h2>
          <p className={styles.restText}>No session scheduled. Recovery is part of the program.</p>
        </div>
        <div className={styles.restIcon}>
          <Icon name="moon" size={26} />
        </div>
      </div>
      {next && (
        <Link to={paths.workout(next.workout.id)} className={styles.next}>
          <span className={styles.nextText}>
            <span className={styles.nextLabel}>Next up · {WEEKDAY_LABELS[next.workout.weekday]}</span>
            <span className={styles.nextName}>{next.workout.name}</span>
            <span className={styles.nextFocus}>{joinFocus(next.workout.focus)}</span>
          </span>
          <Icon name="chevron-right" className={styles.chevron} />
        </Link>
      )}
    </section>
  )
}
