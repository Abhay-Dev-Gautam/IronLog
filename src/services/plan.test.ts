import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Exercise, WorkoutPlan } from '../types/domain'
import { resolvePrescription, resolveWorkoutDay, validatePlan, type ExerciseLibrary } from './plan'

const press: Exercise = { id: 'press', name: 'Press', muscles: ['chest'], tracking: 'weight-reps', supportsEstimated1RM: true }
const plank: Exercise = { id: 'plank', name: 'Plank', muscles: ['core'], tracking: 'duration', supportsEstimated1RM: false }
const library: ExerciseLibrary = new Map([
  [press.id, press],
  [plank.id, plank],
])

function makePlan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  return {
    id: 'test',
    name: 'Test plan',
    defaults: { sets: 2, rir: { min: 2, max: 4 }, restSeconds: 120 },
    days: [
      {
        id: 'day-1',
        weekday: 'monday',
        name: 'Day 1',
        focus: ['Chest'],
        exercises: [
          { id: 'p1', exerciseId: 'press', target: { min: 8, max: 12 } },
          { id: 'p2', exerciseId: 'plank', target: { min: 30, max: 60 }, rir: null, sets: 3, restSeconds: 60 },
        ],
      },
    ],
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolvePrescription', () => {
  it('applies plan defaults when the prescription does not override them', () => {
    const plan = makePlan()
    const resolved = resolvePrescription({ id: 'x', exerciseId: 'press', target: { min: 8, max: 12 } }, plan.defaults, library)
    expect(resolved).toMatchObject({ sets: 2, rir: { min: 2, max: 4 }, restSeconds: 120, notes: null })
  })

  it('respects overrides, including RIR explicitly disabled with null', () => {
    const plan = makePlan()
    const resolved = resolvePrescription(
      { id: 'x', exerciseId: 'plank', target: { min: 30, max: 60 }, rir: null, sets: 3, restSeconds: 60, notes: 'Brace' },
      plan.defaults,
      library,
    )
    expect(resolved).toMatchObject({ sets: 3, rir: null, restSeconds: 60, notes: 'Brace' })
  })

  it('returns null for an exercise missing from the library', () => {
    const plan = makePlan()
    expect(resolvePrescription({ id: 'x', exerciseId: 'ghost', target: { min: 1, max: 2 } }, plan.defaults, library)).toBeNull()
  })
})

describe('resolveWorkoutDay', () => {
  it('totals sets and spans RIR only over exercises that use it', () => {
    const plan = makePlan()
    const day = resolveWorkoutDay(plan, plan.days[0]!, library)
    expect(day.totalSets).toBe(5)
    expect(day.rirSpan).toEqual({ min: 2, max: 4 })
  })

  it('skips unknown exercises instead of failing the whole day', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plan = makePlan()
    plan.days[0]!.exercises.push({ id: 'p3', exerciseId: 'ghost', target: { min: 5, max: 5 } })
    const day = resolveWorkoutDay(plan, plan.days[0]!, library)
    expect(day.exercises.map((e) => e.exercise.id)).toEqual(['press', 'plank'])
    expect(console.warn).toHaveBeenCalledOnce()
  })

  it('reports no RIR span when no exercise uses RIR', () => {
    const plan = makePlan()
    const onlyPlank = { ...plan.days[0]!, exercises: [plan.days[0]!.exercises[1]!] }
    expect(resolveWorkoutDay(plan, onlyPlank, library).rirSpan).toBeNull()
  })
})

describe('validatePlan', () => {
  it('accepts a well-formed plan', () => {
    expect(validatePlan(makePlan(), library)).toEqual([])
  })

  it('flags unknown exercises, duplicate IDs, clashing weekdays and bad ranges', () => {
    const plan = makePlan()
    const day = plan.days[0]!
    plan.days.push({
      ...day,
      exercises: [
        { id: 'p1', exerciseId: 'ghost', target: { min: 12, max: 8 } },
        { id: 'p4', exerciseId: 'press', target: { min: 8, max: 12 }, sets: 0, rir: { min: -1, max: 2 } },
      ],
    })

    const problems = validatePlan(plan, library)
    expect(problems).toEqual(
      expect.arrayContaining([
        'Duplicate workout day id "day-1".',
        'More than one workout is scheduled on monday.',
        'Duplicate prescription id "p1".',
        'Day 1 → p1: unknown exercise "ghost".',
        'Day 1 → p1: target range is invalid.',
        'Day 1 → p4: sets must be a whole number of at least 1.',
        'Day 1 → p4: RIR range is invalid.',
      ]),
    )
  })

  it('flags an empty plan and invalid defaults', () => {
    const problems = validatePlan(
      makePlan({ days: [], defaults: { sets: 0, rir: { min: 4, max: 2 }, restSeconds: -5 } }),
      library,
    )
    expect(problems).toEqual([
      'Plan has no workout days.',
      'Default sets must be a whole number of at least 1.',
      'Default RIR range is invalid.',
      'Default rest must be 0 seconds or more.',
    ])
  })
})
