import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  id?: string
  title: string
  trailing?: ReactNode
}

export function SectionHeader({ id, title, trailing }: SectionHeaderProps) {
  return (
    <div className={styles.section}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  )
}
