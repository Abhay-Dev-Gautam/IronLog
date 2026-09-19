import type { ReactNode } from 'react'
import styles from './ProgressRing.module.css'

interface ProgressRingProps {
  /** 0–100 */
  percent: number
  label: string
  size?: number
  strokeWidth?: number
  children?: ReactNode
}

/** Circular progress. The ring is visual only; a native <progress> carries the value for assistive tech. */
export function ProgressRing({ percent, label, size = 64, strokeWidth = 6, children }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg className={styles.svg} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className={styles.track} cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} />
        <circle
          className={styles.value}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          opacity={clamped === 0 ? 0 : 1}
        />
      </svg>
      <span className={styles.label} aria-hidden="true">
        {children ?? `${clamped}%`}
      </span>
      <progress className="visually-hidden" value={clamped} max={100} aria-label={label}>
        {clamped}%
      </progress>
    </div>
  )
}
