import { useMemo } from 'react'
import { goBack } from '../../app/router'
import { paths } from '../../app/routes'
import { BottomAction } from '../../components/BottomAction'
import { Button, ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { SetText } from '../../components/SetText'
import { StatGroup } from '../../components/StatGroup'
import { TopBar } from '../../components/TopBar'
import { useSessionState } from '../../hooks/useProgram'
import { findSessionRecords } from '../../services/personalRecords'
import { isSetComplete, summarizeSession } from '../../services/sessionStats'
import { editWorkoutNotes, wasJustFinished } from '../../services/workoutActions'
import type { WorkoutSession } from '../../types/domain'
import { formatDuration, formatKg, formatLongDate, pluralize } from '../../utils/format'
import { describeRecord } from '../progress/describeRecord'
import styles from './SessionSummaryScreen.module.css'

function timeRange(session: WorkoutSession): string {
  const format = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
  const start = format.format(new Date(session.startedAt))
  return session.finishedAt ? `${start} – ${format.format(new Date(session.finishedAt))}` : start
}

export function SessionSummaryScreen({ sessionId }: { sessionId: string }) {
  const { all, history } = useSessionState()
  const session = all.find((candidate) => candidate.id === sessionId)
  const records = useMemo(() => (session ? findSessionRecords(session, history) : []), [session, history])

  if (!session || session.finishedAt === null) {
    return (
      <>
        <TopBar backLabel="History" fallback={paths.history} />
        <ScreenHeader title="Workout" />
        <EmptyState
          icon="alert"
          title={session ? 'Still in progress' : 'Workout not found'}
          action={
            <ButtonLink
              to={session ? paths.workout(session.workoutDayId) : paths.history}
              replace
              variant="secondary"
            >
              {session ? 'Resume workout' : 'Go to History'}
            </ButtonLink>
          }
        >
          {session ? 'This workout hasn’t been finished yet.' : 'It may have been deleted.'}
        </EmptyState>
      </>
    )
  }

  const celebrate = wasJustFinished(session.id)
  const summary = summarizeSession(session)
  const exerciseNames = new Map(session.exercises.map((exercise) => [exercise.exerciseId, exercise.exerciseName]))
  const started = new Date(session.startedAt)

  return (
    <>
      {celebrate ? (
        <div className={styles.badge} aria-hidden="true">
          <Icon name="check" size={34} strokeWidth={3} />
        </div>
      ) : (
        <TopBar backLabel="History" fallback={paths.history} />
      )}
      <ScreenHeader
        eyebrow={celebrate ? 'Workout complete' : formatLongDate(started)}
        accentEyebrow={celebrate}
        title={session.workoutName}
        subtitle={celebrate ? `${formatLongDate(started)} · ${timeRange(session)}` : timeRange(session)}
      />

      <StatGroup
        className={styles.stats}
        columns={2}
        stats={[
          { label: 'Duration', value: summary.durationMs === null ? '—' : formatDuration(summary.durationMs) },
          {
            label: 'Exercises',
            value:
              summary.exercisesTrained === summary.totalExercises
                ? summary.exercisesTrained
                : `${summary.exercisesTrained}/${summary.totalExercises}`,
          },
          {
            label: 'Sets',
            value: summary.completedSets === summary.totalSets ? summary.completedSets : `${summary.completedSets}/${summary.totalSets}`,
          },
          { label: 'Total volume', value: formatKg(summary.volumeKg) },
        ]}
      />

      {records.length > 0 && (
        <section aria-labelledby="records-title">
          <SectionHeader id="records-title" title="Personal records" trailing={records.length} />
          <ul className={styles.card}>
            {records.map((record) => {
              const { title, value, estimate } = describeRecord(record)
              return (
                <li key={`${record.exerciseId}-${record.kind}`} className={styles.record}>
                  <span className={styles.recordIcon} aria-hidden="true">
                    <Icon name="trophy" size={20} />
                  </span>
                  <span className={styles.recordText}>
                    <span className={styles.recordExercise}>{exerciseNames.get(record.exerciseId)}</span>
                    <span className={styles.recordTitle}>
                      {title}
                      {estimate && <span className={styles.estimateTag}>Estimate</span>}
                    </span>
                    {estimate && <span className={styles.recordNote}>{estimate}</span>}
                  </span>
                  <span className={styles.recordValue}>{value}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="exercises-title">
        <SectionHeader id="exercises-title" title="Exercises" />
        <ul className={styles.card}>
          {session.exercises.map((exercise) => {
            const done = exercise.sets.filter(isSetComplete)
            const skipped = exercise.sets.length - done.length
            return (
              <li key={exercise.id} className={styles.exercise}>
                <Link to={paths.exercise(exercise.exerciseId)} className={styles.exerciseLink}>
                  <span className={styles.exerciseName}>{exercise.exerciseName}</span>
                  <Icon name="chevron-right" size={18} className={styles.chevron} />
                </Link>
                {done.length > 0 ? (
                  <ul className={styles.sets}>
                    {done.map((set) => (
                      <li key={set.id}>
                        <SetText set={set} tracking={exercise.tracking} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>Not done</p>
                )}
                {done.length > 0 && skipped > 0 && (
                  <p className={styles.muted}>{pluralize(skipped, 'set')} not done</p>
                )}
                {exercise.notes && <p className={styles.note}>{exercise.notes}</p>}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="workout-note-title">
        <SectionHeader id="workout-note-title" title="Workout note" />
        <textarea
          aria-labelledby="workout-note-title"
          className={styles.textarea}
          rows={3}
          maxLength={1000}
          placeholder="How did it go? Anything to change next time?"
          value={session.notes}
          onChange={(event) => editWorkoutNotes(session.id, event.target.value)}
        />
      </section>

      {celebrate && (
        <BottomAction>
          <Button size="large" block onClick={() => goBack(paths.home)}>
            Done
          </Button>
        </BottomAction>
      )}
    </>
  )
}
