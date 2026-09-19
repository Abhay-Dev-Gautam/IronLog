import type { ReactNode } from 'react'
import styles from './ScreenHeader.module.css'

interface ScreenHeaderProps {
  title: string
  eyebrow?: ReactNode
  accentEyebrow?: boolean
  subtitle?: ReactNode
  trailing?: ReactNode
}

/** Large-title header. The `h1` takes focus on navigation so screen readers announce the new screen. */
export function ScreenHeader({ title, eyebrow, accentEyebrow, subtitle, trailing }: ScreenHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <p className={`${styles.eyebrow} ${accentEyebrow ? styles.accent : ''}`}>{eyebrow}</p>}
        <h1 className={styles.title} tabIndex={-1}>
          {title}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {trailing}
    </header>
  )
}
