import { useEffect, useMemo, useRef, useState } from 'react'
import { goBack, navigate } from '../../app/router'
import { paths } from '../../app/routes'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ScreenHeader } from '../../components/ScreenHeader'
import { TopBar } from '../../components/TopBar'
import { useSessionHistory } from '../../hooks/useProgram'
import { getPreviousPerformance, summarizeSession, type PreviousPerformance } from '../../services/sessionStats'
import { discardWorkout, finishWorkout } from '../../services/workoutActions'
import { getCurrentExerciseIndex } from '../../services/workoutSession'
import type { WorkoutPlan, WorkoutSession } from '../../types/domain'
import { pluralize } from '../../utils/format'
import { ElapsedTime } from './ElapsedTime'
import { ExerciseLogCard } from './ExerciseLogCard'
import { WorkoutDock } from './WorkoutDock'
import styles from './WorkoutScreen.module.css'

type Dialog = 'finish-incomplete' | 'finish-empty' | 'discard' | null

/** The live logging view for the in-progress session. */
export function ActiveWorkout({ session, plan }: { session: WorkoutSession; plan: WorkoutPlan }) {
  const history = useSessionHistory()
  const [dialog, setDialog] = useState<Dialog>(null)
  const summary = summarizeSession(session)
  const currentIndex = getCurrentExerciseIndex(session)
  const percent = summary.totalSets > 0 ? Math.round((summary.completedSets / summary.totalSets) * 100) : 0
  const remainingSets = summary.totalSets - summary.completedSets

  // Previous performance only changes when history does, not on every keystroke.
  const exerciseKey = session.exercises.map((exercise) => `${exercise.id}:${exercise.exerciseId}`).join('|')
  const previousByExercise = useMemo(() => {
    const map = new Map<string, PreviousPerformance | null>()
    for (const entry of exerciseKey.split('|')) {
      const [id = '', exerciseId = ''] = entry.split(':')
      map.set(id, getPreviousPerformance(history, exerciseId, session.id))
    }
    return map
  }, [history, exerciseKey, session.id])

  const planNotes = useMemo(
    () => new Map(plan.days.flatMap((day) => day.exercises).map((item) => [item.id, item.notes ?? null])),
    [plan],
  )

  // When resuming, land on the exercise in progress rather than the top.
  const scrolled = useRef(false)
  useEffect(() => {
    if (scrolled.current) return
    scrolled.current = true
    const current = session.exercises[currentIndex]
    if (currentIndex > 0 && current) document.getElementById(`exercise-${current.id}`)?.scrollIntoView({ block: 'start' })
  }, [currentIndex, session.exercises])

  function requestFinish() {
    if (summary.completedSets === 0) setDialog('finish-empty')
    else if (remainingSets > 0) setDialog('finish-incomplete')
    else finish()
  }

  function finish() {
    setDialog(null)
    const finished = finishWorkout()
    if (finished) navigate(paths.session(finished.id), { replace: true })
  }

  function discard() {
    setDialog(null)
    discardWorkout()
    goBack(paths.home)
  }

  return (
    <>
      <TopBar
        fallback={paths.home}
        trailing={
          <span aria-label={`${summary.completedSets} of ${summary.totalSets} sets done`}>
            {summary.completedSets}/{summary.totalSets} sets
          </span>
        }
        progress={percent}
      />
      <ScreenHeader
        eyebrow="In progress"
        accentEyebrow
        title={session.workoutName}
        subtitle={<ElapsedTime since={session.startedAt} />}
      />
      <div className={styles.progress}>
        <span className={`${styles.chip} ${summary.exercisesCompleted === summary.totalExercises ? styles.chipDone : ''}`}>
          {summary.exercisesCompleted}/{summary.totalExercises} exercises
        </span>
        <span className={`${styles.chip} ${remainingSets === 0 ? styles.chipDone : ''}`}>
          {summary.completedSets}/{summary.totalSets} sets
        </span>
      </div>

      <ol className={styles.list} aria-label={`${session.workoutName} exercises`}>
        {session.exercises.map((exercise, index) => (
          <li key={exercise.id}>
            <ExerciseLogCard
              exercise={exercise}
              position={index + 1}
              previous={previousByExercise.get(exercise.id) ?? null}
              planNote={planNotes.get(exercise.prescriptionId) ?? null}
              isCurrent={index === currentIndex}
            />
          </li>
        ))}
      </ol>

      <div className={styles.discard}>
        <Button variant="ghost" className={styles.discardButton} onClick={() => setDialog('discard')}>
          Discard workout
        </Button>
      </div>

      <WorkoutDock onFinish={requestFinish} />

      <ConfirmDialog
        open={dialog === 'finish-incomplete'}
        title="Finish workout?"
        confirmLabel="Finish anyway"
        cancelLabel="Continue workout"
        onConfirm={finish}
        onCancel={() => setDialog(null)}
      >
        You still have {pluralize(remainingSets, 'incomplete set')}. They’ll be saved as not done.
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'finish-empty'}
        title="No sets completed yet"
        confirmLabel="Discard workout"
        cancelLabel="Keep training"
        tone="danger"
        onConfirm={discard}
        onCancel={() => setDialog(null)}
      >
        There’s nothing to save yet. Tap ✓ on a set once you’ve done it, or discard this workout.
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'discard'}
        title="Discard this workout?"
        confirmLabel="Discard workout"
        cancelLabel="Keep workout"
        tone="danger"
        onConfirm={discard}
        onCancel={() => setDialog(null)}
      >
        {summary.completedSets > 0
          ? `The ${pluralize(summary.completedSets, 'logged set')} from this session will be deleted. This can’t be undone.`
          : 'This session will be deleted. This can’t be undone.'}
      </ConfirmDialog>
    </>
  )
}
