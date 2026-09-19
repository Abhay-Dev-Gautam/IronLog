import type { CSSProperties, ReactNode } from 'react'
import styles from './StatGroup.module.css'

export interface Stat {
  label: string
  value: ReactNode
}

interface StatGroupProps {
  stats: Stat[]
  /** Defaults to one row with a column per stat. */
  columns?: number
  className?: string
}

/** Label/value pairs, rendered as a description list (value shown above label). */
export function StatGroup({ stats, columns = stats.length, className }: StatGroupProps) {
  return (
    <dl className={`${styles.stats} ${className ?? ''}`} style={{ '--columns': columns } as CSSProperties}>
      {stats.map((stat) => (
        <div key={stat.label} className={styles.stat}>
          <dt className={styles.label}>{stat.label}</dt>
          <dd className={styles.value}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
