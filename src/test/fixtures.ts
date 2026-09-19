import type { ExerciseSet, TrackingMode, WorkoutSession } from '../types/domain'

/** Compact builders for sessions in tests. */

export interface SetInput {
  kg?: number | null
  reps?: number | null
  seconds?: number | null
  rir?: number | null
  done?: boolean
}

export interface SessionInput {
  id: string
  dayId?: string
  start: Date
  /** Defaults to 50 minutes after `start`; `null` = still in progress. */
  end?: Date | null
  exercises: { exerciseId: string; tracking?: TrackingMode; sets: SetInput[]; notes?: string }[]
}

let counter = 0

export function makeSet({ kg = null, reps = null, seconds = null, rir = null, done = true }: SetInput): ExerciseSet {
  counter += 1
  return {
    id: `set-${counter}`,
    weightKg: kg,
    reps,
    durationSeconds: seconds,
    rir,
    completedAt: done ? '2026-09-21T12:00:00.000Z' : null,
  }
}

export function makeSession({ id, dayId = 'upper-a', start, end, exercises }: SessionInput): WorkoutSession {
  return {
    id,
    planId: 'ironlog-5-day',
    workoutDayId: dayId,
    workoutName: dayId,
    startedAt: start.toISOString(),
    finishedAt: end === undefined ? new Date(start.getTime() + 50 * 60_000).toISOString() : (end?.toISOString() ?? null),
    exercises: exercises.map((exercise, index) => ({
      id: `${id}-ex-${index}`,
      prescriptionId: `p-${index}`,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseId,
      tracking: exercise.tracking ?? 'weight-reps',
      target: { min: 8, max: 12 },
      targetRir: { min: 2, max: 4 },
      restSeconds: 120,
      sets: exercise.sets.map(makeSet),
      notes: exercise.notes ?? '',
    })),
    notes: '',
  }
}
