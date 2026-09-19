import { describe, expect, it } from 'vitest'
import { resolveWorkoutDay, validatePlan } from '../services/plan'
import { DEFAULT_PLAN } from './defaultPlan'
import { EXERCISES } from './exercises'

describe('default plan', () => {
  it('passes structural validation', () => {
    expect(validatePlan(DEFAULT_PLAN)).toEqual([])
  })

  it('schedules exactly one workout on each weekday, Monday to Friday', () => {
    expect(DEFAULT_PLAN.days.map((day) => [day.weekday, day.name])).toEqual([
      ['monday', 'Upper A'],
      ['tuesday', 'Lower A'],
      ['wednesday', 'Push'],
      ['thursday', 'Pull'],
      ['friday', 'Lower B + Core'],
    ])
  })

  it('contains the agreed exercises in order', () => {
    const names = Object.fromEntries(
      DEFAULT_PLAN.days.map((day) => [day.id, resolveWorkoutDay(DEFAULT_PLAN, day).exercises.map((e) => e.exercise.name)]),
    )
    expect(names).toEqual({
      'upper-a': [
        'Flat Chest Press Machine',
        'Lat Pulldown',
        'Chest-Supported Row',
        'Shoulder Press',
        'Cable / Dumbbell Lateral Raise',
        'Triceps Pushdown',
        'Dumbbell / Cable Biceps Curl',
      ],
      'lower-a': [
        'Leg Press',
        'Romanian Deadlift',
        'Leg Extension',
        'Seated / Lying Leg Curl',
        'Standing / Seated Calf Raise',
        'Plank',
      ],
      push: [
        'Incline Dumbbell Bench Press',
        'Pec Deck / Chest Fly',
        'Shoulder Press',
        'Cable Lateral Raise',
        'Rope Triceps Pushdown',
        'Overhead Cable Triceps Extension',
      ],
      pull: [
        'Lat Pulldown',
        'Chest-Supported Row',
        'Cable Row',
        'Reverse Pec Deck',
        'Dumbbell / Cable Biceps Curl',
        'Hammer Curl',
      ],
      'lower-b': [
        'Squat or Leg Press',
        'Romanian Deadlift',
        'Bulgarian Split Squat',
        'Leg Extension',
        'Seated / Lying Leg Curl',
        'Standing / Seated Calf Raise',
        'Cable Crunch / Ab Exercise',
      ],
    })
  })

  it('starts every exercise at 2 working sets, with RIR 2–4 except the plank', () => {
    for (const day of DEFAULT_PLAN.days) {
      for (const item of resolveWorkoutDay(DEFAULT_PLAN, day).exercises) {
        expect(item.sets).toBe(2)
        expect(item.rir).toEqual(item.exercise.id === 'plank' ? null : { min: 2, max: 4 })
      }
    }
  })

  it('shares exercise IDs across days so history carries over', () => {
    const daysUsing = (exerciseId: string) =>
      DEFAULT_PLAN.days.filter((day) => day.exercises.some((e) => e.exerciseId === exerciseId)).map((day) => day.id)

    expect(daysUsing('lat-pulldown')).toEqual(['upper-a', 'pull'])
    expect(daysUsing('shoulder-press')).toEqual(['upper-a', 'push'])
    expect(daysUsing('romanian-deadlift')).toEqual(['lower-a', 'lower-b'])
  })

  it('has unique exercise IDs in the library', () => {
    const ids = EXERCISES.map((exercise) => exercise.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tracks the plank by time rather than reps', () => {
    const plank = EXERCISES.find((exercise) => exercise.id === 'plank')
    expect(plank?.tracking).toBe('duration')
    expect(plank?.supportsEstimated1RM).toBe(false)
  })
})
