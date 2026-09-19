import type { ExerciseSet, TrackingMode } from '../types/domain'

/**
 * Parsing and validation for set inputs. Inputs arrive as text so the iOS
 * keypad can be used and half-typed values ("52.") are not lost; these
 * functions turn that text into stored numbers or a short inline message.
 */

export type SetField = 'weight' | 'reps' | 'duration' | 'rir'

export type ParseResult = { ok: true; value: number | null } | { ok: false; error: string }

export const LIMITS = {
  maxWeightKg: 1000,
  maxReps: 100,
  maxDurationSeconds: 3600,
  maxRir: 10,
} as const

/** Which inputs a set row shows for an exercise. */
export function fieldsFor(tracking: TrackingMode, rirApplies: boolean): SetField[] {
  const base: SetField[] = tracking === 'duration' ? ['duration'] : ['weight', 'reps']
  return rirApplies ? [...base, 'rir'] : base
}

/** Fields that must be filled before a set can be completed. */
export function requiredFieldsFor(tracking: TrackingMode): SetField[] {
  return tracking === 'duration' ? ['duration'] : ['weight', 'reps']
}

const NUMBER_PATTERN = /^-?(\d+([.,]\d*)?|[.,]\d+)$/

function parseNumber(input: string): number | null | 'invalid' {
  const text = input.trim()
  if (text === '') return null
  if (!NUMBER_PATTERN.test(text)) return 'invalid'
  // iOS decimal keypads show a comma in many locales.
  return Number(text.replace(',', '.'))
}

export function parseWeight(input: string): ParseResult {
  const value = parseNumber(input)
  if (value === null) return { ok: true, value: null }
  if (value === 'invalid') return { ok: false, error: 'Weight must be a number, e.g. 42.5' }
  if (value < 0) return { ok: false, error: 'Weight can’t be negative' }
  if (value > LIMITS.maxWeightKg) return { ok: false, error: `Weight must be ${LIMITS.maxWeightKg} kg or less` }
  // Plates go down to 0.25 kg; keep two decimals at most.
  return { ok: true, value: Math.round(value * 100) / 100 }
}

function parseWholeNumber(input: string, min: number, max: number, label: string): ParseResult {
  const value = parseNumber(input)
  if (value === null) return { ok: true, value: null }
  if (value === 'invalid' || !Number.isInteger(value)) return { ok: false, error: `${label} must be a whole number` }
  if (value < min || value > max) return { ok: false, error: `${label} must be ${min}–${max}` }
  return { ok: true, value }
}

export function parseReps(input: string): ParseResult {
  return parseWholeNumber(input, 1, LIMITS.maxReps, 'Reps')
}

export function parseDuration(input: string): ParseResult {
  return parseWholeNumber(input, 1, LIMITS.maxDurationSeconds, 'Time')
}

export function parseRir(input: string): ParseResult {
  return parseWholeNumber(input, 0, LIMITS.maxRir, 'RIR')
}

export function parseField(field: SetField, input: string): ParseResult {
  switch (field) {
    case 'weight':
      return parseWeight(input)
    case 'reps':
      return parseReps(input)
    case 'duration':
      return parseDuration(input)
    case 'rir':
      return parseRir(input)
  }
}

/** The stored set property behind each input. */
export const FIELD_KEYS = {
  weight: 'weightKg',
  reps: 'reps',
  duration: 'durationSeconds',
  rir: 'rir',
} as const satisfies Record<SetField, keyof ExerciseSet>

export type SetValues = Pick<ExerciseSet, 'weightKg' | 'reps' | 'durationSeconds' | 'rir'>

const MISSING_MESSAGES: Record<SetField, string> = {
  weight: 'Enter the weight (0 for bodyweight)',
  reps: 'Enter reps',
  duration: 'Enter the time in seconds',
  rir: 'Enter RIR',
}

export type CompletionResult =
  | { ok: true; values: SetValues }
  | { ok: false; errors: Partial<Record<SetField, string>> }

/**
 * Validates a set's inputs for completion. Only the fields that describe the
 * set are required (weight + reps, or time); RIR is optional.
 */
export function validateSetForCompletion(
  inputs: Partial<Record<SetField, string>>,
  tracking: TrackingMode,
  rirApplies: boolean,
): CompletionResult {
  const values: SetValues = { weightKg: null, reps: null, durationSeconds: null, rir: null }
  const errors: Partial<Record<SetField, string>> = {}
  const required = requiredFieldsFor(tracking)

  for (const field of fieldsFor(tracking, rirApplies)) {
    const result = parseField(field, inputs[field] ?? '')
    if (!result.ok) {
      errors[field] = result.error
    } else if (result.value === null && required.includes(field)) {
      errors[field] = MISSING_MESSAGES[field]
    } else {
      values[FIELD_KEYS[field]] = result.value
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values }
}

/** Stored number → input text. */
export function toInputText(value: number | null): string {
  return value === null ? '' : String(value)
}
