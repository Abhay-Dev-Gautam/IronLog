import { useId } from 'react'
import styles from './Switch.module.css'

interface SwitchProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * On/off control built on a plain native checkbox (no `role="switch"`, so the
 * browser keeps reporting the checked state itself), which means keyboard,
 * screen-reader and iOS behaviour come for free. The whole row is the label, which makes it a
 * large touch target.
 */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  const descriptionId = useId()
  return (
    <label className={styles.row}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </label>
  )
}
