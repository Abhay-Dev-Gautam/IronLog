import { memo, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ExerciseImage } from '../../components/ExerciseImage'
import { Icon } from '../../components/Icon'
import { isSetComplete, type PreviousPerformance } from '../../services/sessionStats'
import { fieldsFor } from '../../services/setValidation'
import { addSetTo, editExerciseNotes, removeSetFrom } from '../../services/workoutActions'
import type { SetField } from '../../services/setValidation'
import type { WorkoutSessionExercise } from '../../types/domain'
import { formatClock, formatRange, formatTarget } from '../../utils/format'
import cardStyles from './ExerciseCard.module.css'
import styles from './ExerciseLogCard.module.css'
import { ExerciseHeading, PreviousSets } from './ExerciseParts'
import { SetRow } from './SetRow'
import { setGridColumns } from './workoutLayout'

const COLUMN_TITLES: Record<SetField, string> = { weight: 'kg', reps: 'Reps', duration: 'Sec', rir: 'RIR' }

interface ExerciseLogCardProps {
  exercise: WorkoutSessionExercise
  position: number
  previous: PreviousPerformance | null
  /** Coaching note from the plan, e.g. "Reps are per leg." */
  planNote: string | null
  /** The exercise the user is working on now. */
  isCurrent: boolean
}

function targetLine(exercise: WorkoutSessionExercise): string {
  const parts = [`${exercise.sets.length} × ${formatTarget(exercise.tracking, exercise.target)}`]
  if (exercise.targetRir) parts.push(`RIR ${formatRange(exercise.targetRir)}`)
  parts.push(`${formatClock(exercise.restSeconds)} rest`)
  return parts.join(' · ')
}

export const ExerciseLogCard = memo(function ExerciseLogCard({
  exercise,
  position,
  previous,
  planNote,
  isCurrent,
}: ExerciseLogCardProps) {
  const [notesOpen, setNotesOpen] = useState(exercise.notes !== '')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const done = exercise.sets.length > 0 && exercise.sets.every(isSetComplete)
  const nextSetId = isCurrent ? exercise.sets.find((set) => !isSetComplete(set))?.id : undefined
  const lastSet = exercise.sets.at(-1)
  const titleId = `exercise-title-${exercise.id}`
  const notesId = `exercise-notes-${exercise.id}`
  const rirApplies = exercise.targetRir !== null

  function handleRemove() {
    if (!lastSet) return
    if (isSetComplete(lastSet)) setConfirmRemove(true)
    else removeSetFrom(exercise.id, lastSet.id)
  }

  const cardClass = [cardStyles.card, styles.card, isCurrent && styles.current].filter(Boolean).join(' ')

  return (
    <article id={`exercise-${exercise.id}`} className={cardClass} aria-labelledby={titleId}>
      <ExerciseHeading
        titleId={titleId}
        position={position}
        name={exercise.exerciseName}
        subtitle={targetLine(exercise)}
        done={done}
        media={<ExerciseImage exerciseId={exercise.exerciseId} variant="card" />}
      />

      <PreviousSets previous={previous} tracking={exercise.tracking} />
      {planNote && <p className={cardStyles.notes}>{planNote}</p>}

      <div className={styles.sets}>
        <div
          className={styles.columns}
          style={{ gridTemplateColumns: setGridColumns(exercise.tracking, rirApplies) }}
          aria-hidden="true"
        >
          <span>Set</span>
          {fieldsFor(exercise.tracking, rirApplies).map((field) => (
            <span key={field}>{COLUMN_TITLES[field]}</span>
          ))}
          <span />
        </div>
        <ol className={styles.setList} aria-label={`${exercise.exerciseName} sets`}>
          {exercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              exerciseId={exercise.id}
              exerciseName={exercise.exerciseName}
              set={set}
              number={index + 1}
              tracking={exercise.tracking}
              target={exercise.target}
              targetRir={exercise.targetRir}
              restSeconds={exercise.restSeconds}
              previousSet={previous?.sets[index] ?? null}
              isNext={set.id === nextSetId}
            />
          ))}
        </ol>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.action} onClick={() => addSetTo(exercise.id)}>
          <Icon name="plus" size={18} strokeWidth={2.4} />
          Add set
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={handleRemove}
          disabled={exercise.sets.length <= 1}
          aria-label={`Remove set ${exercise.sets.length}`}
        >
          <Icon name="minus" size={18} strokeWidth={2.4} />
          Remove
        </button>
        <button
          type="button"
          className={`${styles.action} ${exercise.notes ? styles.hasNote : ''}`}
          onClick={() => setNotesOpen((open) => !open)}
          aria-expanded={notesOpen}
          aria-controls={notesId}
        >
          <Icon name="note" size={18} strokeWidth={2.2} />
          Note
        </button>
      </div>

      {notesOpen && (
        <div id={notesId} className={styles.noteField}>
          <label className="visually-hidden" htmlFor={`${notesId}-input`}>
            Note for {exercise.exerciseName}
          </label>
          <textarea
            id={`${notesId}-input`}
            className={styles.textarea}
            rows={2}
            maxLength={500}
            placeholder="e.g. Used machine instead of dumbbells"
            value={exercise.notes}
            onChange={(event) => editExerciseNotes(exercise.id, event.target.value)}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title={`Remove set ${exercise.sets.length}?`}
        confirmLabel="Remove set"
        cancelLabel="Keep set"
        tone="danger"
        onConfirm={() => {
          if (lastSet) removeSetFrom(exercise.id, lastSet.id)
          setConfirmRemove(false)
        }}
        onCancel={() => setConfirmRemove(false)}
      >
        This set is already logged. Removing it deletes its data from this workout.
      </ConfirmDialog>
    </article>
  )
})
