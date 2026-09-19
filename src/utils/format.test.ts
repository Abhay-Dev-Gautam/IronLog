import { describe, expect, it } from 'vitest'
import type { ExerciseSet } from '../types/domain'
import { formatClock, formatCompactKg, formatDuration, formatKg, formatRange, formatSetResult, formatTarget, pluralize } from './format'

const set = (overrides: Partial<ExerciseSet>): ExerciseSet => ({
  id: 's',
  weightKg: null,
  reps: null,
  durationSeconds: null,
  rir: null,
  completedAt: null,
  ...overrides,
})

describe('format', () => {
  it('formats ranges with an en dash, collapsing equal bounds', () => {
    expect(formatRange({ min: 8, max: 12 })).toBe('8–12')
    expect(formatRange({ min: 10, max: 10 })).toBe('10')
  })

  it('formats rest clocks', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(90)).toBe('1:30')
    expect(formatClock(120)).toBe('2:00')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(-4)).toBe('0:00')
    expect(formatClock(59.9)).toBe('0:59')
  })

  it('formats targets by tracking mode', () => {
    expect(formatTarget('weight-reps', { min: 8, max: 12 })).toBe('8–12 reps')
    expect(formatTarget('duration', { min: 30, max: 60 })).toBe('30–60 s')
  })

  it('formats workout durations', () => {
    expect(formatDuration(52 * 60_000)).toBe('52 min')
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min')
    expect(formatDuration(-1)).toBe('0 min')
  })

  it('formats weights with grouping and at most one decimal', () => {
    expect(formatKg(4280, 'en-US')).toBe('4,280 kg')
    expect(formatKg(52.5, 'en-US')).toBe('52.5 kg')
  })

  it('keeps large totals compact', () => {
    expect(formatCompactKg(9860, 'en-US')).toBe('9,860 kg')
    expect(formatCompactKg(48_210, 'en-US')).toBe('48.2K kg')
    expect(formatCompactKg(1_250_000, 'en-US')).toBe('1.3M kg')
  })

  it('formats logged sets', () => {
    expect(formatSetResult(set({ weightKg: 60, reps: 10 }), 'weight-reps', 'en-US')).toBe('60 kg × 10')
    expect(formatSetResult(set({ weightKg: null, reps: 15 }), 'weight-reps')).toBe('BW × 15')
    expect(formatSetResult(set({ durationSeconds: 45 }), 'duration')).toBe('45 s')
    expect(formatSetResult(set({ weightKg: 10, durationSeconds: 40 }), 'duration', 'en-US')).toBe('10 kg × 40 s')
  })

  it('pluralizes', () => {
    expect(pluralize(1, 'exercise')).toBe('1 exercise')
    expect(pluralize(7, 'exercise')).toBe('7 exercises')
  })
})
