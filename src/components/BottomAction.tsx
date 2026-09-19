import type { ReactNode } from 'react'
import styles from './BottomAction.module.css'

/** Primary action pinned within thumb reach, above the tab bar when it is shown. */
export function BottomAction({ children }: { children: ReactNode }) {
  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <div className={styles.bar}>{children}</div>
    </>
  )
}
