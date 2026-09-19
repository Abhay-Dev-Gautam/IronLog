import { paths } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { SectionHeader } from '../../components/SectionHeader'
import { StatGroup } from '../../components/StatGroup'
import { summarizeSession } from '../../services/sessionStats'
import type { WorkoutSession } from '../../types/domain'
import { formatDuration, formatKg, formatShortDate } from '../../utils/format'
import styles from './LastWorkoutCard.module.css'

export function LastWorkoutCard({ session }: { session: WorkoutSession | null }) {
  return (
    <section aria-labelledby="last-workout-title">
      <SectionHeader id="last-workout-title" title="Last workout" />
      {session ? (
        <Link to={paths.session(session.id)} className={`${styles.card} ${styles.link}`}>
          <LastWorkoutSummary session={session} />
        </Link>
      ) : (
        <div className={styles.card}>
          <p className={styles.empty}>No workouts logged yet. Your most recent session will show up here.</p>
        </div>
      )}
    </section>
  )
}

function LastWorkoutSummary({ session }: { session: WorkoutSession }) {
  const summary = summarizeSession(session)
  return (
    <>
      <span className={styles.head}>
        <span className={styles.name}>{session.workoutName}</span>
        <time className={styles.date} dateTime={session.startedAt}>
          {formatShortDate(new Date(session.startedAt))}
        </time>
        <Icon name="chevron-right" size={20} className={styles.chevron} />
      </span>
      <StatGroup
        className={styles.stats}
        stats={[
          { label: 'Duration', value: summary.durationMs === null ? '—' : formatDuration(summary.durationMs) },
          { label: 'Sets', value: summary.completedSets },
          { label: 'Volume', value: formatKg(summary.volumeKg) },
        ]}
      />
    </>
  )
}
