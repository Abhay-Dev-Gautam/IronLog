import { describe, expect, it } from 'vitest'
import { fieldsFor, parseDuration, parseReps, parseRir, parseWeight, validateSetForCompletion } from './setValidation'

describe('weight', () => {
  it('accepts whole numbers, decimals, comma decimals and zero (bodyweight)', () => {
    expect(parseWeight('60')).toEqual({ ok: true, value: 60 })
    expect(parseWeight('52.5')).toEqual({ ok: true, value: 52.5 })
    expect(parseWeight('52,5')).toEqual({ ok: true, value: 52.5 })
    expect(parseWeight('0')).toEqual({ ok: true, value: 0 })
    expect(parseWeight(' 42.25 ')).toEqual({ ok: true, value: 42.25 })
  })

  it('treats a half-typed decimal as its number and empty as no value', () => {
    expect(parseWeight('60.')).toEqual({ ok: true, value: 60 })
    expect(parseWeight('')).toEqual({ ok: true, value: null })
  })

  it('rejects negative, non-numeric and implausible weights with a message', () => {
    expect(parseWeight('-5')).toEqual({ ok: false, error: 'Weight can’t be negative' })
    expect(parseWeight('abc')).toMatchObject({ ok: false })
    expect(parseWeight('1.2.3')).toMatchObject({ ok: false })
    expect(parseWeight('1500')).toEqual({ ok: false, error: 'Weight must be 1000 kg or less' })
  })

  it('keeps at most two decimals', () => {
    expect(parseWeight('10.126')).toEqual({ ok: true, value: 10.13 })
  })
})

describe('reps', () => {
  it('accepts positive whole numbers', () => {
    expect(parseReps('10')).toEqual({ ok: true, value: 10 })
    expect(parseReps('1')).toEqual({ ok: true, value: 1 })
  })

  it('rejects zero, decimals, negatives and absurd values', () => {
    expect(parseReps('0')).toEqual({ ok: false, error: 'Reps must be 1–100' })
    expect(parseReps('8.5')).toEqual({ ok: false, error: 'Reps must be a whole number' })
    expect(parseReps('-3')).toEqual({ ok: false, error: 'Reps must be 1–100' })
    expect(parseReps('250')).toEqual({ ok: false, error: 'Reps must be 1–100' })
  })
})

describe('RIR', () => {
  it('accepts 0 through 10', () => {
    expect(parseRir('0')).toEqual({ ok: true, value: 0 })
    expect(parseRir('3')).toEqual({ ok: true, value: 3 })
    expect(parseRir('10')).toEqual({ ok: true, value: 10 })
    expect(parseRir('')).toEqual({ ok: true, value: null })
  })

  it('rejects out-of-range and fractional values', () => {
    expect(parseRir('-1')).toEqual({ ok: false, error: 'RIR must be 0–10' })
    expect(parseRir('11')).toEqual({ ok: false, error: 'RIR must be 0–10' })
    expect(parseRir('2.5')).toEqual({ ok: false, error: 'RIR must be a whole number' })
  })
})

describe('duration', () => {
  it('accepts whole seconds and rejects zero', () => {
    expect(parseDuration('45')).toEqual({ ok: true, value: 45 })
    expect(parseDuration('0')).toMatchObject({ ok: false })
  })
})

describe('validateSetForCompletion', () => {
  it('requires weight and reps for weighted sets, with RIR optional', () => {
    expect(validateSetForCompletion({ weight: '60', reps: '10' }, 'weight-reps', true)).toEqual({
      ok: true,
      values: { weightKg: 60, reps: 10, durationSeconds: null, rir: null },
    })
    expect(validateSetForCompletion({ weight: '60', reps: '10', rir: '3' }, 'weight-reps', true)).toMatchObject({
      ok: true,
      values: { rir: 3 },
    })
  })

  it('reports each missing or invalid field inline', () => {
    expect(validateSetForCompletion({ weight: '', reps: '', rir: '12' }, 'weight-reps', true)).toEqual({
      ok: false,
      errors: {
        weight: 'Enter the weight (0 for bodyweight)',
        reps: 'Enter reps',
        rir: 'RIR must be 0–10',
      },
    })
  })

  it('requires only the time for timed exercises', () => {
    expect(validateSetForCompletion({ duration: '45' }, 'duration', false)).toEqual({
      ok: true,
      values: { weightKg: null, reps: null, durationSeconds: 45, rir: null },
    })
    expect(validateSetForCompletion({}, 'duration', false)).toEqual({
      ok: false,
      errors: { duration: 'Enter the time in seconds' },
    })
  })

  it('ignores RIR entirely when the exercise does not use it', () => {
    expect(fieldsFor('duration', false)).toEqual(['duration'])
    expect(validateSetForCompletion({ duration: '30', rir: 'junk' }, 'duration', false)).toMatchObject({ ok: true })
  })
})
