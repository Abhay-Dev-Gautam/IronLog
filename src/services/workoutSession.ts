import type { ExerciseSet, WorkoutPlan, WorkoutSession, WorkoutSessionExercise } from '../types/domain'
import type { ResolvedWorkoutDay } from './plan'
import type { SetValues } from './setValidation'

/**
 * Pure, immutable operations on a workout session. Every function returns a
 * new session and leaves its input (and the plan it came from) untouched, so
 * unchanged exercises keep their identity and memoized UI can skip them.
 */

export type SessionStatus = 'in-progress' | 'completed'

export function getSessionStatus(session: WorkoutSession): SessionStatus {
  return session.finishedAt === null ? 'in-progress' : 'completed'
}

function emptySet(id: string, weightKg: number | null = null): ExerciseSet {
  return { id, weightKg, reps: null, durationSeconds: null, rir: null, completedAt: null }
}

interface CreateSessionOptions {
  plan: WorkoutPlan
  workout: ResolvedWorkoutDay
  now: Date
  createId: () => string
}

/** A new in-progress session with the planned number of empty sets per exercise. */
export function createSession({ plan, workout, now, createId }: CreateSessionOptions): WorkoutSession {
  return {
    id: createId(),
    planId: plan.id,
    workoutDayId: workout.id,
    workoutName: workout.name,
    startedAt: now.toISOString(),
    finishedAt: null,
    exercises: workout.exercises.map((item) => ({
      id: createId(),
      prescriptionId: item.prescriptionId,
      exerciseId: item.exercise.id,
      exerciseName: item.exercise.name,
      tracking: item.exercise.tracking,
      target: { ...item.target },
      targetRir: item.rir ? { ...item.rir } : null,
      restSeconds: item.restSeconds,
      sets: Array.from({ length: item.sets }, () => emptySet(createId())),
      notes: '',
    })),
    notes: '',
  }
}

function mapExercise(
  session: WorkoutSession,
  exerciseId: string,
  update: (exercise: WorkoutSessionExercise) => WorkoutSessionExercise,
): WorkoutSession {
  let changed = false
  const exercises = session.exercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise
    const next = update(exercise)
    changed ||= next !== exercise
    return next
  })
  return changed ? { ...session, exercises } : session
}

function mapSet(
  exercise: WorkoutSessionExercise,
  setId: string,
  update: (set: ExerciseSet) => ExerciseSet,
): WorkoutSessionExercise {
  let changed = false
  const sets = exercise.sets.map((set) => {
    if (set.id !== setId) return set
    const next = update(set)
    changed ||= next !== set
    return next
  })
  return changed ? { ...exercise, sets } : exercise
}

/** Edits values of one set (completed or not). */
export function updateSetValues(
  session: WorkoutSession,
  exerciseId: string,
  setId: string,
  patch: Partial<SetValues>,
): WorkoutSession {
  return mapExercise(session, exerciseId, (exercise) => mapSet(exercise, setId, (set) => ({ ...set, ...patch })))
}

/**
 * Marks a set complete with validated values. The weight carries forward to
 * the next set if that set has no weight yet — the common case is the same
 * load for every working set, and it saves typing between sets.
 */
export function completeSet(
  session: WorkoutSession,
  exerciseId: string,
  setId: string,
  values: SetValues,
  now: Date,
): WorkoutSession {
  return mapExercise(session, exerciseId, (exercise) => {
    const index = exercise.sets.findIndex((set) => set.id === setId)
    if (index === -1) return exercise
    const sets = exercise.sets.map((set, i) => {
      if (i === index) return { ...set, ...values, completedAt: now.toISOString() }
      if (i === index + 1 && set.completedAt === null && set.weightKg === null && values.weightKg !== null) {
        return { ...set, weightKg: values.weightKg }
      }
      return set
    })
    return { ...exercise, sets }
  })
}

/** Re-opens a completed set, keeping its values for editing. */
export function uncompleteSet(session: WorkoutSession, exerciseId: string, setId: string): WorkoutSession {
  return mapExercise(session, exerciseId, (exercise) =>
    mapSet(exercise, setId, (set) => (set.completedAt === null ? set : { ...set, completedAt: null })),
  )
}

/** Appends a set, pre-filled with the previous set's weight. Only this session changes, never the plan. */
export function addSet(session: WorkoutSession, exerciseId: string, setId: string): WorkoutSession {
  return mapExercise(session, exerciseId, (exercise) => {
    const lastWeight = exercise.sets.at(-1)?.weightKg ?? null
    return { ...exercise, sets: [...exercise.sets, emptySet(setId, lastWeight)] }
  })
}

export function removeSet(session: WorkoutSession, exerciseId: string, setId: string): WorkoutSession {
  return mapExercise(session, exerciseId, (exercise) => {
    const sets = exercise.sets.filter((set) => set.id !== setId)
    return sets.length === exercise.sets.length ? exercise : { ...exercise, sets }
  })
}

export function setExerciseNotes(session: WorkoutSession, exerciseId: string, notes: string): WorkoutSession {
  return mapExercise(session, exerciseId, (exercise) => (exercise.notes === notes ? exercise : { ...exercise, notes }))
}

export function setSessionNotes(session: WorkoutSession, notes: string): WorkoutSession {
  return session.notes === notes ? session : { ...session, notes }
}

/** Completes the session. Incomplete sets are kept as they are, never dropped. */
export function finishSession(session: WorkoutSession, now: Date): WorkoutSession {
  if (session.finishedAt !== null) return session
  const startedAt = Date.parse(session.startedAt)
  const finishedAt = new Date(Math.max(now.getTime(), startedAt)).toISOString()
  return { ...session, finishedAt }
}

/** Index of the first exercise with an incomplete set, or -1 when everything is done. */
export function getCurrentExerciseIndex(session: WorkoutSession): number {
  return session.exercises.findIndex((exercise) => exercise.sets.some((set) => set.completedAt === null))
}
