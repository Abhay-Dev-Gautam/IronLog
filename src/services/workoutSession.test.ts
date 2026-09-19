import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../data/defaultPlan'
import type { WorkoutSession } from '../types/domain'
import { findWorkoutDay, resolveWorkoutDay } from './plan'
import { summarizeSession } from './sessionStats'
import {
  addSet,
  completeSet,
  createSession,
  finishSession,
  getCurrentExerciseIndex,
  getSessionStatus,
  removeSet,
  setExerciseNotes,
  setSessionNotes,
  uncompleteSet,
  updateSetValues,
} from './workoutSession'

const START = new Date('2026-09-21T12:30:00.000Z')

function sequentialIds() {
  let n = 0
  return () => `id-${++n}`
}

function startUpperA(): WorkoutSession {
  const day = findWorkoutDay(DEFAULT_PLAN, 'upper-a')!
  return createSession({ plan: DEFAULT_PLAN, workout: resolveWorkoutDay(DEFAULT_PLAN, day), now: START, createId: sequentialIds() })
}

const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000)
const values = (weightKg: number, reps: number, rir: number | null = null) => ({ weightKg, reps, durationSeconds: null, rir })

describe('starting a session', () => {
  it('creates an in-progress instance of the planned workout', () => {
    const session = startUpperA()
    expect(getSessionStatus(session)).toBe('in-progress')
    expect(session).toMatchObject({ workoutDayId: 'upper-a', workoutName: 'Upper A', finishedAt: null, startedAt: START.toISOString() })
    expect(session.exercises).toHaveLength(7)
    expect(session.exercises.every((exercise) => exercise.sets.length === 2)).toBe(true)
    expect(summarizeSession(session)).toMatchObject({ completedSets: 0, totalSets: 14 })
  })

  it('snapshots each prescription so the session stands on its own', () => {
    const [first] = startUpperA().exercises
    expect(first).toMatchObject({
      exerciseId: 'flat-chest-press-machine',
      exerciseName: 'Flat Chest Press Machine',
      tracking: 'weight-reps',
      target: { min: 8, max: 12 },
      targetRir: { min: 2, max: 4 },
      restSeconds: 120,
    })
  })

  it('gives every exercise and set a unique ID', () => {
    const session = startUpperA()
    const ids = [session.id, ...session.exercises.flatMap((exercise) => [exercise.id, ...exercise.sets.map((set) => set.id)])]
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('logging sets', () => {
  it('edits set values without mutating the previous session or untouched exercises', () => {
    const before = startUpperA()
    const [press, pulldown] = before.exercises
    const after = updateSetValues(before, press!.id, press!.sets[0]!.id, { weightKg: 60 })

    expect(after.exercises[0]!.sets[0]!.weightKg).toBe(60)
    expect(before.exercises[0]!.sets[0]!.weightKg).toBeNull()
    expect(after.exercises[1]).toBe(pulldown) // unchanged exercises keep identity
  })

  it('completes a set, recording values and time, and carries the weight to the next set', () => {
    let session = startUpperA()
    const press = session.exercises[0]!
    session = completeSet(session, press.id, press.sets[0]!.id, values(60, 10, 3), at(5))

    const [first, second] = session.exercises[0]!.sets
    expect(first).toMatchObject({ weightKg: 60, reps: 10, rir: 3, completedAt: at(5).toISOString() })
    expect(second).toMatchObject({ weightKg: 60, reps: null, completedAt: null })
    expect(summarizeSession(session)).toMatchObject({ completedSets: 1, volumeKg: 600 })
  })

  it('does not overwrite a weight the user already entered on the next set', () => {
    let session = startUpperA()
    const press = session.exercises[0]!
    session = updateSetValues(session, press.id, press.sets[1]!.id, { weightKg: 55 })
    session = completeSet(session, press.id, press.sets[0]!.id, values(60, 10), at(5))
    expect(session.exercises[0]!.sets[1]!.weightKg).toBe(55)
  })

  it('reopens a completed set while keeping its values', () => {
    let session = startUpperA()
    const press = session.exercises[0]!
    session = completeSet(session, press.id, press.sets[0]!.id, values(60, 10), at(5))
    session = uncompleteSet(session, press.id, press.sets[0]!.id)
    expect(session.exercises[0]!.sets[0]).toMatchObject({ weightKg: 60, reps: 10, completedAt: null })
  })

  it('tracks the current exercise as sets are completed', () => {
    let session = startUpperA()
    expect(getCurrentExerciseIndex(session)).toBe(0)
    const press = session.exercises[0]!
    for (const set of press.sets) session = completeSet(session, press.id, set.id, values(60, 10), at(5))
    expect(getCurrentExerciseIndex(session)).toBe(1)
  })
})

describe('adding and removing sets', () => {
  it('adds a set to the session only, never to the plan', () => {
    const planBefore = structuredClone(DEFAULT_PLAN)
    let session = startUpperA()
    const press = session.exercises[0]!
    session = updateSetValues(session, press.id, press.sets[1]!.id, { weightKg: 62.5 })
    session = addSet(session, press.id, 'extra')

    expect(session.exercises[0]!.sets).toHaveLength(3)
    expect(session.exercises[0]!.sets[2]).toMatchObject({ id: 'extra', weightKg: 62.5, reps: null, completedAt: null })
    expect(DEFAULT_PLAN).toEqual(planBefore)
  })

  it('removes a specific set', () => {
    let session = startUpperA()
    const press = session.exercises[0]!
    session = removeSet(session, press.id, press.sets[1]!.id)
    expect(session.exercises[0]!.sets.map((set) => set.id)).toEqual([press.sets[0]!.id])
  })

  it('returns the same session for no-op changes', () => {
    const session = startUpperA()
    expect(removeSet(session, session.exercises[0]!.id, 'missing')).toBe(session)
    expect(setSessionNotes(session, '')).toBe(session)
  })
})

describe('notes', () => {
  it('stores exercise and workout notes on the session', () => {
    let session = startUpperA()
    session = setExerciseNotes(session, session.exercises[3]!.id, 'Left shoulder slightly uncomfortable')
    session = setSessionNotes(session, 'Felt strong today')
    expect(session.exercises[3]!.notes).toBe('Left shoulder slightly uncomfortable')
    expect(session.notes).toBe('Felt strong today')
  })
})

describe('finishing', () => {
  it('completes the session and keeps incomplete sets rather than dropping them', () => {
    let session = startUpperA()
    const press = session.exercises[0]!
    session = completeSet(session, press.id, press.sets[0]!.id, values(60, 10), at(5))
    session = finishSession(session, at(52))

    expect(getSessionStatus(session)).toBe('completed')
    expect(summarizeSession(session)).toMatchObject({ durationMs: 52 * 60_000, completedSets: 1, totalSets: 14 })
  })

  it('never records an end time before the start, and finishing twice is a no-op', () => {
    const finished = finishSession(startUpperA(), at(-10))
    expect(finished.finishedAt).toBe(START.toISOString())
    expect(finishSession(finished, at(90))).toBe(finished)
  })
})
