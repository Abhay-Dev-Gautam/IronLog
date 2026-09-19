import { EXERCISES_BY_ID } from '../data/exercises'
import type {
  Exercise,
  ExerciseId,
  ExercisePrescription,
  PrescriptionDefaults,
  PrescriptionId,
  Range,
  Weekday,
  WorkoutDay,
  WorkoutDayId,
  WorkoutPlan,
} from '../types/domain'

export type ExerciseLibrary = ReadonlyMap<ExerciseId, Exercise>

/** A prescription joined with its exercise and with plan defaults applied. */
export interface ResolvedExercise {
  prescriptionId: PrescriptionId
  exercise: Exercise
  sets: number
  target: Range
  rir: Range | null
  restSeconds: number
  notes: string | null
}

export interface ResolvedWorkoutDay {
  id: WorkoutDayId
  weekday: Weekday
  name: string
  focus: string[]
  exercises: ResolvedExercise[]
  totalSets: number
  /** Overall RIR span across exercises, or `null` if none use RIR. */
  rirSpan: Range | null
}

export function findWorkoutDay(plan: WorkoutPlan, dayId: WorkoutDayId): WorkoutDay | undefined {
  return plan.days.find((day) => day.id === dayId)
}

export function findWorkoutDayByWeekday(plan: WorkoutPlan, weekday: Weekday): WorkoutDay | undefined {
  return plan.days.find((day) => day.weekday === weekday)
}

export function resolvePrescription(
  prescription: ExercisePrescription,
  defaults: PrescriptionDefaults,
  library: ExerciseLibrary = EXERCISES_BY_ID,
): ResolvedExercise | null {
  const exercise = library.get(prescription.exerciseId)
  if (!exercise) return null
  return {
    prescriptionId: prescription.id,
    exercise,
    sets: prescription.sets ?? defaults.sets,
    target: prescription.target,
    rir: prescription.rir === undefined ? defaults.rir : prescription.rir,
    restSeconds: prescription.restSeconds ?? defaults.restSeconds,
    notes: prescription.notes ?? null,
  }
}

export function resolveWorkoutDay(
  plan: WorkoutPlan,
  day: WorkoutDay,
  library: ExerciseLibrary = EXERCISES_BY_ID,
): ResolvedWorkoutDay {
  const exercises: ResolvedExercise[] = []
  for (const prescription of day.exercises) {
    const resolved = resolvePrescription(prescription, plan.defaults, library)
    if (resolved) {
      exercises.push(resolved)
    } else {
      // A bad reference should not take the whole workout down with it.
      console.warn(`[IronLog] Skipping unknown exercise "${prescription.exerciseId}" in ${day.id}`)
    }
  }

  const rirRanges = exercises.flatMap((exercise) => (exercise.rir ? [exercise.rir] : []))
  const rirSpan =
    rirRanges.length > 0
      ? {
          min: Math.min(...rirRanges.map((range) => range.min)),
          max: Math.max(...rirRanges.map((range) => range.max)),
        }
      : null

  return {
    id: day.id,
    weekday: day.weekday,
    name: day.name,
    focus: day.focus,
    exercises,
    totalSets: exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
    rirSpan,
  }
}

function isValidRange(range: Range, minimum: number): boolean {
  return (
    Number.isFinite(range.min) &&
    Number.isFinite(range.max) &&
    range.min >= minimum &&
    range.min <= range.max
  )
}

/**
 * Structural checks for a plan. Returns human-readable problems; an empty
 * array means the plan is usable.
 */
export function validatePlan(plan: WorkoutPlan, library: ExerciseLibrary = EXERCISES_BY_ID): string[] {
  const problems: string[] = []

  if (plan.days.length === 0) problems.push('Plan has no workout days.')
  if (!Number.isInteger(plan.defaults.sets) || plan.defaults.sets < 1) {
    problems.push('Default sets must be a whole number of at least 1.')
  }
  if (!isValidRange(plan.defaults.rir, 0)) problems.push('Default RIR range is invalid.')
  if (!(plan.defaults.restSeconds >= 0)) problems.push('Default rest must be 0 seconds or more.')

  const dayIds = new Set<string>()
  const weekdays = new Set<Weekday>()
  const prescriptionIds = new Set<string>()

  for (const day of plan.days) {
    if (dayIds.has(day.id)) problems.push(`Duplicate workout day id "${day.id}".`)
    dayIds.add(day.id)

    if (weekdays.has(day.weekday)) problems.push(`More than one workout is scheduled on ${day.weekday}.`)
    weekdays.add(day.weekday)

    if (day.exercises.length === 0) problems.push(`${day.name} has no exercises.`)

    for (const prescription of day.exercises) {
      const where = `${day.name} → ${prescription.id}`
      if (prescriptionIds.has(prescription.id)) problems.push(`Duplicate prescription id "${prescription.id}".`)
      prescriptionIds.add(prescription.id)

      if (!library.has(prescription.exerciseId)) {
        problems.push(`${where}: unknown exercise "${prescription.exerciseId}".`)
      }
      if (!isValidRange(prescription.target, 1)) problems.push(`${where}: target range is invalid.`)
      if (prescription.sets !== undefined && (!Number.isInteger(prescription.sets) || prescription.sets < 1)) {
        problems.push(`${where}: sets must be a whole number of at least 1.`)
      }
      if (prescription.rir && !isValidRange(prescription.rir, 0)) problems.push(`${where}: RIR range is invalid.`)
      if (prescription.restSeconds !== undefined && !(prescription.restSeconds >= 0)) {
        problems.push(`${where}: rest must be 0 seconds or more.`)
      }
    }
  }

  return problems
}
