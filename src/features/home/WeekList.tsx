import { paths } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { SectionHeader } from '../../components/SectionHeader'
import type { WeekOverview, WeekOverviewDay } from '../../services/trainingStats'
import type { WorkoutDay } from '../../types/domain'
import { WEEKDAY_LABELS } from '../../utils/date'
import { joinFocus } from '../../utils/format'
import styles from './WeekList.module.css'

type TrainingDay = WeekOverviewDay & { workout: WorkoutDay }

/** This week's scheduled workouts; a workout is done once a finished session for it exists this week. */
export function WeekList({ overview }: { overview: WeekOverview }) {
  const days = overview.days
    .filter((day): day is TrainingDay => day.workout !== null)
    .map((day) => ({ ...day, done: day.completedBy !== null }))

  return (
    <section aria-labelledby="week-title">
      <SectionHeader id="week-title" title="This week" trailing={`${overview.completed} of ${overview.planned} done`} />
      <ul className={styles.list}>
        {days.map((day) => {
          const label = WEEKDAY_LABELS[day.weekday]
          const rowClass = [styles.row, day.isToday && styles.today, day.isPast && !day.done && styles.past]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={day.dateKey} className={styles.item}>
              <Link
                to={paths.workout(day.workout.id)}
                className={rowClass}
                aria-current={day.isToday ? 'date' : undefined}
              >
                <span className={styles.date} aria-hidden="true">
                  <span className={styles.dow}>{label.slice(0, 3)}</span>
                  <span className={styles.dom}>{day.date.getDate()}</span>
                </span>
                <span className={styles.info}>
                  <span className="visually-hidden">{label}: </span>
                  <span className={styles.name}>{day.workout.name}</span>
                  <span className={styles.focus}>{joinFocus(day.workout.focus)}</span>
                </span>
                {day.done ? (
                  <span className={styles.done}>
                    <Icon name="check" size={16} strokeWidth={3} />
                    <span className="visually-hidden">, done</span>
                  </span>
                ) : (
                  day.isToday && <span className={styles.pill}>Today</span>
                )}
                <Icon name="chevron-right" size={20} className={styles.chevron} />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
