import { paths } from '../../app/routes'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { ScreenHeader } from '../../components/ScreenHeader'
import { useSessionHistory } from '../../hooks/useProgram'
import { getCompletedSessions, summarizeSession } from '../../services/sessionStats'
import { formatDuration, formatKg } from '../../utils/format'
import styles from './HistoryScreen.module.css'

export function HistoryScreen() {
  const sessions = getCompletedSessions(useSessionHistory())

  if (sessions.length === 0) {
    return (
      <>
        <ScreenHeader title="History" />
        <EmptyState
          icon="history"
          title="No workouts yet"
          action={
            <ButtonLink to={paths.home} replace variant="secondary">
              Go to today’s workout
            </ButtonLink>
          }
        >
          Finished sessions will appear here with their duration, sets and volume.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <ScreenHeader title="History" subtitle={`${sessions.length} ${sessions.length === 1 ? 'workout' : 'workouts'} logged`} />
      <ul className={styles.list}>
        {sessions.map((session) => {
          const summary = summarizeSession(session)
          const started = new Date(session.startedAt)
          const allDone = summary.completedSets === summary.totalSets
          const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(started)
          const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(started)
          return (
            <li key={session.id} className={styles.item}>
              <Link to={paths.session(session.id)} className={styles.row}>
                <span className={styles.date}>
                  <span className={styles.dow}>{weekday}</span>
                  <span className={styles.dom}>{started.getDate()}</span>
                </span>
                <span className={styles.info}>
                  <span className={styles.nameLine}>
                    <span className={styles.name}>{session.workoutName}</span>
                    <time className={styles.when} dateTime={session.startedAt}>
                      {date}
                    </time>
                  </span>
                  <span className={styles.meta}>
                    {summary.durationMs === null ? '—' : formatDuration(summary.durationMs)}
                    {' · '}
                    <span className={allDone ? undefined : styles.partial}>
                      {allDone ? `${summary.completedSets} sets` : `${summary.completedSets}/${summary.totalSets} sets`}
                    </span>
                    {' · '}
                    {formatKg(summary.volumeKg)}
                  </span>
                </span>
                <Icon name="chevron-right" size={20} className={styles.chevron} />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
