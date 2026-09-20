import { memo, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '../../components/Icon'
import { startRest } from '../../services/restTimerStore'
import { settingsStore } from '../../services/settingsStore'
import {
  FIELD_KEYS,
  fieldsFor,
  parseField,
  requiredFieldsFor,
  toInputText,
  validateSetForCompletion,
  type SetField,
} from '../../services/setValidation'
import { editSet, markSetComplete, reopenSet } from '../../services/workoutActions'
import type { ExerciseSet, Range, TrackingMode } from '../../types/domain'
import { formatRange } from '../../utils/format'
import styles from './SetRow.module.css'
import { setGridColumns } from './workoutLayout'

const FIELD_LABELS: Record<SetField, string> = {
  weight: 'weight in kg',
  reps: 'reps',
  duration: 'time in seconds',
  rir: 'reps in reserve',
}

const INPUT_MODES: Record<SetField, 'decimal' | 'numeric'> = {
  weight: 'decimal',
  reps: 'numeric',
  duration: 'numeric',
  rir: 'numeric',
}

interface SetRowProps {
  exerciseId: string
  exerciseName: string
  set: ExerciseSet
  number: number
  tracking: TrackingMode
  target: Range
  targetRir: Range | null
  restSeconds: number
  /** The matching set from last time, used as placeholder guidance only. */
  previousSet: ExerciseSet | null
  /** The set the user should do next. */
  isNext: boolean
}

type Drafts = Partial<Record<SetField, string>>

/**
 * One working set: weight / reps / RIR inputs and a ✓ toggle. Inputs keep
 * the raw text while editing (so "52." is not lost) and auto-save every
 * valid keystroke; nothing needs a manual save.
 */
export const SetRow = memo(function SetRow({
  exerciseId,
  exerciseName,
  set,
  number,
  tracking,
  target,
  targetRir,
  restSeconds,
  previousSet,
  isNext,
}: SetRowProps) {
  const rirApplies = targetRir !== null
  const fields = fieldsFor(tracking, rirApplies)
  const required = requiredFieldsFor(tracking)
  const done = set.completedAt !== null
  const [drafts, setDrafts] = useState<Drafts>({})
  const [errors, setErrors] = useState<Partial<Record<SetField, string>>>({})
  const inputs = useRef<Partial<Record<SetField, HTMLInputElement | null>>>({})
  const rowRef = useRef<HTMLDivElement>(null)
  const errorId = useId()

  const storedText = (field: SetField) => toInputText(set[FIELD_KEYS[field]])
  const displayed = (field: SetField) => drafts[field] ?? storedText(field)

  const placeholders: Record<SetField, string> = {
    weight: previousSet?.weightKg != null ? String(previousSet.weightKg) : '',
    reps: previousSet?.reps != null ? String(previousSet.reps) : formatRange(target),
    duration: previousSet?.durationSeconds != null ? String(previousSet.durationSeconds) : formatRange(target),
    rir: previousSet?.rir != null ? String(previousSet.rir) : targetRir ? formatRange(targetRir) : '',
  }

  function handleChange(field: SetField, text: string) {
    setDrafts((current) => ({ ...current, [field]: text }))
    const parsed = parseField(field, text)
    if (!parsed.ok) return
    // A completed set must stay valid: don't save a cleared required field.
    if (done && parsed.value === null && required.includes(field)) return
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    if (parsed.value !== set[FIELD_KEYS[field]]) editSet(exerciseId, set.id, { [FIELD_KEYS[field]]: parsed.value })
  }

  function handleBlur(field: SetField) {
    const text = drafts[field]
    if (text === undefined) return
    const parsed = parseField(field, text)
    const clearedWhileDone = parsed.ok && done && parsed.value === null && required.includes(field)
    if (parsed.ok && !clearedWhileDone) {
      // Show the saved, normalised value ("60," → "60").
      setDrafts(({ [field]: _removed, ...rest }) => rest)
    } else {
      setErrors((current) => ({ ...current, [field]: parsed.ok ? 'This set is logged — enter a value' : parsed.error }))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, field: SetField) {
    if (event.key !== 'Enter') return
    // Enter moves along the row; it never completes a set by accident.
    event.preventDefault()
    const next = fields[fields.indexOf(field) + 1]
    if (next) inputs.current[next]?.focus()
    else event.currentTarget.blur()
  }

  function handleToggle() {
    if (done) {
      reopenSet(exerciseId, set.id)
      return
    }
    const result = validateSetForCompletion(
      Object.fromEntries(fields.map((field) => [field, displayed(field)])),
      tracking,
      rirApplies,
    )
    if (!result.ok) {
      setErrors(result.errors)
      const firstInvalid = fields.find((field) => result.errors[field])
      if (firstInvalid) inputs.current[firstInvalid]?.focus()
      return
    }
    markSetComplete(exerciseId, set.id, result.values)
    setDrafts({})
    setErrors({})
    // Put the keyboard away: the next thing is resting, not typing.
    if (rowRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
    // The set is always saved; only the countdown is optional.
    if (settingsStore.getSettings().restTimer.autoStart) startRest(restSeconds, `${exerciseName} · Set ${number}`)
  }

  const messages = fields.flatMap((field) => (errors[field] ? [errors[field]] : []))
  const rowClass = [styles.row, done && styles.done, isNext && styles.next].filter(Boolean).join(' ')

  return (
    <li>
      <div ref={rowRef} className={rowClass} style={{ gridTemplateColumns: setGridColumns(tracking, rirApplies) }}>
        <span className={styles.number} aria-hidden="true">
          {number}
        </span>
        {fields.map((field, index) => (
          <input
            key={field}
            ref={(element) => {
              inputs.current[field] = element
            }}
            className={styles.input}
            type="text"
            inputMode={INPUT_MODES[field]}
            enterKeyHint={index === fields.length - 1 ? 'done' : 'next'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={6}
            aria-label={`Set ${number} ${FIELD_LABELS[field]}`}
            aria-invalid={errors[field] ? true : undefined}
            aria-describedby={errors[field] ? errorId : undefined}
            placeholder={placeholders[field]}
            value={displayed(field)}
            onChange={(event) => handleChange(field, event.target.value)}
            onBlur={() => handleBlur(field)}
            onKeyDown={(event) => handleKeyDown(event, field)}
          />
        ))}
        <button
          type="button"
          className={styles.check}
          aria-pressed={done}
          aria-label={`Set ${number} done`}
          onClick={handleToggle}
        >
          <Icon name="check" size={22} strokeWidth={3} />
        </button>
      </div>
      {messages.length > 0 && (
        <p id={errorId} className={styles.error} role="alert">
          {messages.join(' · ')}
        </p>
      )}
    </li>
  )
})
