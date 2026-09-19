import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  /** `danger` for destructive actions such as discarding data. */
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation built on the native <dialog>, which provides focus
 * trapping, Escape to cancel and an inert background. Actions are stacked
 * full-width at the bottom of the screen, within thumb reach. The safe
 * choice (cancel) sits nearest the thumb and gets focus. Tapping the
 * backdrop does nothing: these guard destructive actions, so an explicit
 * choice is required.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Start on the safe choice so Enter never confirms something destructive by accident.
      dialog.querySelector<HTMLButtonElement>('[data-cancel]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        // Escape key: route through our state instead of letting the dialog close itself.
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div id={messageId} className={styles.message}>
        {children}
      </div>
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="large"
          block
          className={tone === 'danger' ? styles.danger : undefined}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" size="large" block onClick={onCancel} data-cancel>
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  )
}
