import { navigate } from '../../app/router'
import { paths } from '../../app/routes'
import { BottomAction } from '../../components/BottomAction'
import { Button, ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { ScreenHeader } from '../../components/ScreenHeader'
import { TopBar } from '../../components/TopBar'
import { useActiveSession, usePlan, useSessionHistory } from '../../hooks/useProgram'
import { findWorkoutDay, resolveWorkoutDay } from '../../services/plan'
import { getPreviousPerformance } from '../../services/sessionStats'
import { startWorkout } from '../../services/workoutActions'
import { WEEKDAY_LABELS } from '../../utils/date'
import { formatRange, joinFocus, pluralize } from '../../utils/format'
import { ActiveWorkout } from './ActiveWorkout'
import { ExerciseCard } from './ExerciseCard'
import styles from './WorkoutScreen.module.css'

export function WorkoutScreen({ dayId }: { dayId: string }) {
  const plan = usePlan()
  const history = useSessionHistory()
  const active = useActiveSession()
  const day = findWorkoutDay(plan, dayId)

  if (active?.workoutDayId === dayId) return <ActiveWorkout session={active} plan={plan} />

  if (!day) {
    return (
      <>
        <TopBar fallback={paths.home} />
        <ScreenHeader title="Workout" />
        <EmptyState
          icon="alert"
          title="Workout not found"
          action={
            <ButtonLink to={paths.home} replace variant="secondary">
              Back to Today
            </ButtonLink>
          }
        >
          This workout isn’t in your current plan. It may have been renamed or removed.
        </EmptyState>
      </>
    )
  }

  const workout = resolveWorkoutDay(plan, day)

  function handleStart() {
    // Starting only creates the session; opening this screen never does.
    if (startWorkout(plan, workout.id)) window.scrollTo(0, 0)
  }

  return (
    <>
      <TopBar fallback={paths.home} />
      <ScreenHeader
        eyebrow={WEEKDAY_LABELS[workout.weekday]}
        accentEyebrow
        title={workout.name}
        subtitle={joinFocus(workout.focus)}
      />
      <div className={styles.meta}>
        <span className={styles.chip}>{pluralize(workout.exercises.length, 'exercise')}</span>
        <span className={styles.chip}>{pluralize(workout.totalSets, 'working set')}</span>
        {workout.rirSpan && <span className={styles.chip}>RIR {formatRange(workout.rirSpan)}</span>}
      </div>
      {active && (
        <p className={styles.blocked}>
          <Icon name="alert" size={20} />
          <span>
            {active.workoutName} is still in progress. Finish or discard it before starting another workout.
          </span>
        </p>
      )}
      <ol className={styles.list} aria-label={`${workout.name} exercises`}>
        {workout.exercises.map((item, index) => (
          <li key={item.prescriptionId}>
            <ExerciseCard position={index + 1} item={item} previous={getPreviousPerformance(history, item.exercise.id)} />
          </li>
        ))}
      </ol>

      <BottomAction>
        {active ? (
          // One workout at a time: finish or discard the open one first.
          <Button size="large" block variant="secondary" onClick={() => navigate(paths.workout(active.workoutDayId), { replace: true })}>
            Resume {active.workoutName}
            <Icon name="arrow-right" size={22} strokeWidth={2.4} />
          </Button>
        ) : (
          <Button size="large" block onClick={handleStart}>
            Start Workout
            <Icon name="arrow-right" size={22} strokeWidth={2.4} />
          </Button>
        )}
      </BottomAction>
    </>
  )
}
