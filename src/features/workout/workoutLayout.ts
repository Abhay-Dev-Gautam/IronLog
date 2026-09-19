import { EXERCISES_BY_ID, MUSCLE_LABELS } from '../../data/exercises'
import { fieldsFor, type SetField } from '../../services/setValidation'
import type { ExerciseId, TrackingMode } from '../../types/domain'
import { joinFocus } from '../../utils/format'

const COLUMN_WIDTHS: Record<SetField, string> = {
  weight: 'minmax(0, 1.25fr)',
  reps: 'minmax(0, 1fr)',
  duration: 'minmax(0, 1.5fr)',
  rir: 'minmax(0, 0.85fr)',
}

/** Grid shared by the column header and every set row of an exercise. */
export function setGridColumns(tracking: TrackingMode, rirApplies: boolean): string {
  return ['30px', ...fieldsFor(tracking, rirApplies).map((field) => COLUMN_WIDTHS[field]), '48px'].join(' ')
}

export function muscleLabel(exerciseId: ExerciseId): string {
  const exercise = EXERCISES_BY_ID.get(exerciseId)
  return exercise ? joinFocus(exercise.muscles.map((muscle) => MUSCLE_LABELS[muscle])) : ''
}
