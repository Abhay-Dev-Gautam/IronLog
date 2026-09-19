import { useState } from 'react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ProgressRing } from '../../components/ProgressRing'
import { StatGroup } from '../../components/StatGroup'
import { summarizeSession } from '../../services/sessionStats'
import { discardWorkout } from '../../services/workoutActions'
import type { WorkoutSession } from '../../types/domain'
import { toLocalDateKey } from '../../utils/date'
import { formatKg, formatShortDate, pluralize } from '../../utils/format'
import styles from './TodayCard.module.css'

interface ActiveWorkoutCardProps {
  session: WorkoutSession
  today: Date
}

/**
 * Shown whenever a workout is unfinished, e.g. after closing the app
 * mid-session. Resuming is the sticky primary action; discarding is
 * explicit and confirmed. Nothing is ever discarded automatically.
 */
export function ActiveWorkoutCard({ session, today }: ActiveWorkoutCardProps) {
  const [confirming, setConfirming] = useState(false)
  const summary = summarizeSession(session)
  const percent = summary.totalSets > 0 ? Math.round((summary.completedSets / summary.totalSets) * 100) : 0
  const started = new Date(session.startedAt)
  const startedToday = toLocalDateKey(started) === toLocalDateKey(today)
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(started)

  return (
    <section className={styles.card} aria-labelledby="active-title">
      <div className={styles.top}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{startedToday ? 'In progress' : 'Unfinished workout'}</p>
          <h2 id="active-title" className={styles.title}>
            {session.workoutName}
          </h2>
          <p className={styles.focus}>
            {startedToday ? `Started ${time}` : `Started ${formatShortDate(started)} · resume to finish it, or discard it`}
          </p>
        </div>
        <ProgressRing percent={percent} label="Workout completion" />
      </div>
      <StatGroup
        className={styles.stats}
        stats={[
          { label: 'Sets', value: `${summary.completedSets}/${summary.totalSets}` },
          { label: 'Exercises', value: `${summary.exercisesCompleted}/${summary.totalExercises}` },
          { label: 'Volume', value: formatKg(summary.volumeKg) },
        ]}
      />
      <div className={styles.cardActions}>
        <Button variant="ghost" className={styles.discard} onClick={() => setConfirming(true)}>
          Discard workout
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Discard this workout?"
        confirmLabel="Discard workout"
        cancelLabel="Keep workout"
        tone="danger"
        onConfirm={() => {
          setConfirming(false)
          discardWorkout()
        }}
        onCancel={() => setConfirming(false)}
      >
        {summary.completedSets > 0
          ? `The ${pluralize(summary.completedSets, 'logged set')} from ${session.workoutName} will be deleted. This can’t be undone.`
          : `${session.workoutName} will be deleted. This can’t be undone.`}
      </ConfirmDialog>
    </section>
  )
}
