import { Icon } from '../../components/Icon'
import type { WeekOverview, WeekOverviewDay } from '../../services/trainingStats'
import { WEEKDAY_LABELS } from '../../utils/date'
import styles from './WeekStrip.module.css'

type DayState = 'done' | 'today' | 'open' | 'upcoming' | 'rest'

function stateOf(day: WeekOverviewDay): DayState {
  if (!day.workout) return 'rest'
  if (day.completedBy) return 'done'
  if (day.isToday) return 'today'
  return day.isPast ? 'open' : 'upcoming'
}

const DESCRIPTIONS: Record<DayState, string> = {
  done: 'done',
  today: 'scheduled today',
  open: 'not logged',
  upcoming: 'scheduled',
  rest: 'rest day',
}

/**
 * Mon–Sun at a glance. Completion comes only from finished sessions; a day
 * that passed without one is shown neutrally, never as a failure.
 */
export function WeekStrip({ overview }: { overview: WeekOverview }) {
  return (
    <div className={styles.week}>
      <ol className={styles.strip} aria-label="This week">
        {overview.days.map((day) => {
          const state = stateOf(day)
          const name = WEEKDAY_LABELS[day.weekday]
          return (
            <li key={day.dateKey} className={`${styles.day} ${styles[state]}`}>
              <span className="visually-hidden">
                {name}
                {day.workout ? `, ${day.workout.name}` : ''}: {DESCRIPTIONS[state]}
              </span>
              <span className={styles.dow} aria-hidden="true">
                {name.slice(0, 3)}
              </span>
              <span className={styles.mark} aria-hidden="true">
                {state === 'done' && <Icon name="check" size={16} strokeWidth={3} />}
                {state === 'rest' && <Icon name="moon" size={15} />}
                {state === 'open' && '—'}
              </span>
            </li>
          )
        })}
      </ol>
      <p className={styles.caption}>
        {overview.completed} of {overview.planned} planned workouts done this week
      </p>
    </div>
  )
}
