import { paths } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { TopBar } from '../../components/TopBar'
import { usePlan, useSettings } from '../../hooks/useProgram'
import { resolveWorkoutDay } from '../../services/plan'
import { WEEKDAY_LABELS } from '../../utils/date'
import { formatClock, formatRange, formatTarget, joinFocus, pluralize } from '../../utils/format'
import styles from './PlanScreen.module.css'

export function PlanScreen() {
  const plan = usePlan()
  const settings = useSettings()
  const { defaults } = plan
  const restSecondsDefault = settings.restTimer.defaultSeconds

  return (
    <>
      <TopBar backLabel="Settings" fallback={paths.settings} />
      <ScreenHeader
        eyebrow="Workout plan"
        title={plan.name}
        subtitle={`Defaults: ${pluralize(defaults.sets, 'working set')} · RIR ${formatRange(defaults.rir)} · ${formatClock(restSecondsDefault)} rest`}
      />

      {plan.days.map((day) => {
        const workout = resolveWorkoutDay(plan, day, undefined, { restSecondsDefault })
        const headingId = `plan-${day.id}`
        return (
          <section key={day.id} aria-labelledby={headingId}>
            <SectionHeader
              id={headingId}
              title={WEEKDAY_LABELS[day.weekday]}
              trailing={pluralize(workout.exercises.length, 'exercise')}
            />
            <div className={styles.card}>
              <Link to={paths.workout(day.id)} className={styles.dayLink}>
                <span className={styles.dayText}>
                  <span className={styles.dayName}>{workout.name}</span>
                  <span className={styles.dayFocus}>{joinFocus(workout.focus)}</span>
                </span>
                <Icon name="chevron-right" size={20} className={styles.chevron} />
              </Link>
              <ol className={styles.exercises}>
                {workout.exercises.map((item, index) => (
                  <li key={item.prescriptionId} className={styles.exercise}>
                    <span className={styles.number} aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className={styles.exerciseName}>{item.exercise.name}</span>
                    <span className={styles.dose}>
                      {item.sets} × {formatTarget(item.exercise.tracking, item.target)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )
      })}
    </>
  )
}
