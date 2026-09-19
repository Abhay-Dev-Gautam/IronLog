import type { ResolvedExercise } from '../../services/plan'
import type { PreviousPerformance } from '../../services/sessionStats'
import { formatClock, formatRange } from '../../utils/format'
import styles from './ExerciseCard.module.css'
import { ExerciseHeading, PreviousSets } from './ExerciseParts'
import { muscleLabel } from './workoutLayout'

interface ExerciseCardProps {
  position: number
  item: ResolvedExercise
  previous: PreviousPerformance | null
}

/** Read-only preview of a planned exercise, shown before a workout is started. */
export function ExerciseCard({ position, item, previous }: ExerciseCardProps) {
  const { exercise } = item
  const titleId = `exercise-${item.prescriptionId}`
  const isTimed = exercise.tracking === 'duration'

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <ExerciseHeading titleId={titleId} position={position} name={exercise.name} subtitle={muscleLabel(exercise.id)} />

      <dl className={styles.spec}>
        <div className={styles.specItem}>
          <dt className={styles.specLabel}>Sets</dt>
          <dd className={styles.specValue}>{item.sets}</dd>
        </div>
        <div className={styles.specItem}>
          <dt className={styles.specLabel}>{isTimed ? 'Time' : 'Reps'}</dt>
          <dd className={styles.specValue}>
            {formatRange(item.target)}
            {isTimed && ' s'}
          </dd>
        </div>
        <div className={styles.specItem}>
          <dt className={styles.specLabel}>RIR</dt>
          <dd className={styles.specValue}>
            {item.rir ? (
              formatRange(item.rir)
            ) : (
              <>
                <span aria-hidden="true">—</span>
                <span className="visually-hidden">Not applicable</span>
              </>
            )}
          </dd>
        </div>
        <div className={styles.specItem}>
          <dt className={styles.specLabel}>Rest</dt>
          <dd className={styles.specValue}>{formatClock(item.restSeconds)}</dd>
        </div>
      </dl>

      <PreviousSets previous={previous} tracking={exercise.tracking} />

      {item.notes && <p className={styles.notes}>{item.notes}</p>}
    </article>
  )
}
