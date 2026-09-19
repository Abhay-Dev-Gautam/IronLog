import type { ExerciseSet, Range, TrackingMode, WorkoutSession, WorkoutSessionExercise } from '../types/domain'

/**
 * Runtime validation for session records read from storage (and, later,
 * imported backups). Anything that does not match the domain model exactly
 * is rejected rather than half-trusted.
 */

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null
const isString = (value: unknown): value is string => typeof value === 'string'
const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value))
const isTimestamp = (value: unknown): value is string => isString(value) && !Number.isNaN(Date.parse(value))
const isTracking = (value: unknown): value is TrackingMode => value === 'weight-reps' || value === 'duration'

function isRange(value: unknown): value is Range {
  return isRecord(value) && typeof value.min === 'number' && typeof value.max === 'number'
}

function parseSet(value: unknown): ExerciseSet | null {
  if (!isRecord(value)) return null
  const { id, weightKg, reps, durationSeconds, rir, completedAt } = value
  if (!isString(id) || !isNumberOrNull(weightKg) || !isNumberOrNull(reps) || !isNumberOrNull(durationSeconds)) return null
  if (!isNumberOrNull(rir) || !(completedAt === null || isTimestamp(completedAt))) return null
  return { id, weightKg, reps, durationSeconds, rir, completedAt }
}

function parseExercise(value: unknown): WorkoutSessionExercise | null {
  if (!isRecord(value)) return null
  const { id, prescriptionId, exerciseId, exerciseName, tracking, target, targetRir, restSeconds, sets, notes } = value
  if (!isString(id) || !isString(prescriptionId) || !isString(exerciseId) || !isString(exerciseName)) return null
  if (!isTracking(tracking) || !isRange(target) || !(targetRir === null || isRange(targetRir))) return null
  if (typeof restSeconds !== 'number' || !Array.isArray(sets) || !isString(notes)) return null

  const parsedSets = sets.map(parseSet)
  if (parsedSets.some((set) => set === null)) return null
  return {
    id,
    prescriptionId,
    exerciseId,
    exerciseName,
    tracking,
    target: { min: target.min, max: target.max },
    targetRir: targetRir ? { min: targetRir.min, max: targetRir.max } : null,
    restSeconds,
    sets: parsedSets as ExerciseSet[],
    notes,
  }
}

export function parseWorkoutSession(value: unknown): WorkoutSession | null {
  if (!isRecord(value)) return null
  const { id, planId, workoutDayId, workoutName, startedAt, finishedAt, exercises, notes } = value
  if (!isString(id) || !isString(planId) || !isString(workoutDayId) || !isString(workoutName)) return null
  if (!isTimestamp(startedAt) || !(finishedAt === null || isTimestamp(finishedAt))) return null
  if (!Array.isArray(exercises) || !isString(notes)) return null

  const parsedExercises = exercises.map(parseExercise)
  if (parsedExercises.some((exercise) => exercise === null)) return null
  return {
    id,
    planId,
    workoutDayId,
    workoutName,
    startedAt,
    finishedAt,
    exercises: parsedExercises as WorkoutSessionExercise[],
    notes,
  }
}
