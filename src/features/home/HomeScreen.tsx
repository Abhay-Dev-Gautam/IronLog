import { navigate } from '../../app/router'
import { paths } from '../../app/routes'
import { BottomAction } from '../../components/BottomAction'
import { Button, ButtonLink } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { LogoMark } from '../../components/LogoMark'
import { ScreenHeader } from '../../components/ScreenHeader'
import { useCurrentDate } from '../../hooks/useCurrentDate'
import { useActiveSession, usePlan, useSessions } from '../../hooks/useProgram'
import { resolveWorkoutDay } from '../../services/plan'
import { getNextWorkout, getWorkoutForDate } from '../../services/schedule'
import { getLastFinishedSession, getSessionDateKey, getWorkoutStatusForDate } from '../../services/sessionStats'
import { getWeekOverview } from '../../services/trainingStats'
import { startWorkout } from '../../services/workoutActions'
import { getGreeting, getWeekday, toLocalDateKey } from '../../utils/date'
import { formatLongDate } from '../../utils/format'
import { ActiveWorkoutCard } from './ActiveWorkoutCard'
import { LastWorkoutCard } from './LastWorkoutCard'
import { RestDayCard, TodayCard } from './TodayCard'
import { WeekList } from './WeekList'

const arrow = <Icon name="arrow-right" size={22} strokeWidth={2.4} />

export function HomeScreen() {
  const plan = usePlan()
  const sessions = useSessions()
  const active = useActiveSession()
  const today = useCurrentDate()

  const todayKey = toLocalDateKey(today)
  const todayDay = getWorkoutForDate(plan, today)
  const workout = todayDay ? resolveWorkoutDay(plan, todayDay) : null
  const status = workout ? getWorkoutStatusForDate(sessions, workout.id, todayKey, workout.totalSets) : null
  // The in-progress card already covers today's workout if that's what is being trained.
  const activeIsToday = active !== null && active.workoutDayId === workout?.id && getSessionDateKey(active) === todayKey

  function handleStart() {
    if (!workout) return
    const session = startWorkout(plan, workout.id)
    if (session) navigate(paths.workout(session.workoutDayId))
  }

  let action = null
  if (active) {
    action = (
      <ButtonLink to={paths.workout(active.workoutDayId)} size="large" block>
        Resume Workout {arrow}
      </ButtonLink>
    )
  } else if (status?.state === 'complete') {
    action = (
      <ButtonLink to={paths.session(status.session.id)} variant="secondary" size="large" block>
        Review Workout {arrow}
      </ButtonLink>
    )
  } else if (workout) {
    action = (
      <Button size="large" block onClick={handleStart}>
        Start Workout {arrow}
      </Button>
    )
  }

  return (
    <>
      <ScreenHeader eyebrow={formatLongDate(today)} title={getGreeting(today)} trailing={<LogoMark size={40} />} />

      {active && <ActiveWorkoutCard session={active} today={today} />}
      {!activeIsToday &&
        (workout && status ? (
          <TodayCard workout={workout} status={status} />
        ) : (
          <RestDayCard weekday={getWeekday(today)} next={getNextWorkout(plan, today)} />
        ))}

      <WeekList overview={getWeekOverview(plan, sessions, today)} />
      <LastWorkoutCard session={getLastFinishedSession(sessions)} />

      {action && <BottomAction>{action}</BottomAction>}
    </>
  )
}
