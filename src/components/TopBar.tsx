import type { ReactNode } from 'react'
import { goBack } from '../app/router'
import { Icon } from './Icon'
import styles from './TopBar.module.css'

interface TopBarProps {
  /** Title of the screen we return to, e.g. "Settings". Omit when it can vary. */
  backLabel?: string
  /** Where to go if this screen was opened directly (no in-app history). */
  fallback: string
  /** Compact status shown on the right, e.g. "6/14 sets". */
  trailing?: ReactNode
  /** 0–100: draws a slim progress line along the bottom edge. */
  progress?: number
}

export function TopBar({ backLabel, fallback, trailing, progress }: TopBarProps) {
  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.back}
        onClick={() => goBack(fallback)}
        aria-label={backLabel ? `Back to ${backLabel}` : 'Back'}
      >
        <Icon name="chevron-left" size={26} strokeWidth={2.4} />
        <span>{backLabel ?? 'Back'}</span>
      </button>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
      {progress !== undefined && (
        <div className={styles.progress} aria-hidden="true">
          <div className={styles.progressValue} style={{ transform: `scaleX(${Math.min(100, Math.max(0, progress)) / 100})` }} />
        </div>
      )}
    </div>
  )
}
