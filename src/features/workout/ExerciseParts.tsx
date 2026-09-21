import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { SetText } from '../../components/SetText'
import type { PreviousPerformance } from '../../services/sessionStats'
import type { TrackingMode } from '../../types/domain'
import { formatShortDate } from '../../utils/format'
import styles from './ExerciseCard.module.css'

interface ExerciseHeadingProps {
  titleId: string
  position: number
  name: string
  subtitle: string
  done?: boolean
  /** Optional illustration, shown at the end of the heading row. */
  media?: ReactNode
}

export function ExerciseHeading({ titleId, position, name, subtitle, done = false, media }: ExerciseHeadingProps) {
  return (
    <header className={styles.head}>
      <span className={`${styles.index} ${done ? styles.indexDone : ''}`} aria-hidden="true">
        {done ? <Icon name="check" size={18} strokeWidth={3} /> : position}
      </span>
      <div className={styles.titles}>
        <h2 id={titleId} className={styles.name}>
          {name}
          {done && <span className="visually-hidden"> (all sets done)</span>}
        </h2>
        {subtitle && <p className={styles.muscles}>{subtitle}</p>}
      </div>
      {media}
    </header>
  )
}

interface PreviousSetsProps {
  previous: PreviousPerformance | null
  tracking: TrackingMode
}

/** What was lifted last time, so progressive overload needs no memory. Never shows invented data. */
export function PreviousSets({ previous, tracking }: PreviousSetsProps) {
  if (!previous) {
    return (
      <div className={styles.previous}>
        <p className={styles.previousLabel}>First session</p>
        <p className={styles.previousEmpty}>No history yet. Today sets your baseline.</p>
      </div>
    )
  }
  return (
    <div className={styles.previous}>
      <p className={styles.previousLabel}>
        Last time · <time dateTime={previous.startedAt}>{formatShortDate(new Date(previous.startedAt))}</time>
      </p>
      <ul className={styles.previousSets}>
        {previous.sets.map((set) => (
          <li key={set.id}>
            <SetText set={set} tracking={tracking} />
          </li>
        ))}
      </ul>
    </div>
  )
}
