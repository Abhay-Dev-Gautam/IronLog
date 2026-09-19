/**
 * Core IronLog domain model.
 *
 * Conventions:
 * - Entities are referenced by stable string IDs, never by display name.
 * - Timestamps are ISO-8601 UTC strings (`new Date().toISOString()`).
 * - Calendar days are local `YYYY-MM-DD` keys (see utils/date).
 * - Weights are stored in kilograms.
 */

export type ISOTimestamp = string
export type LocalDateKey = string

export type ExerciseId = string
export type WorkoutDayId = string
export type WorkoutPlanId = string
export type PrescriptionId = string
export type SessionId = string

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'rear-delts'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'

/** Inclusive numeric range, e.g. 8–12 reps or RIR 2–4. */
export interface Range {
  min: number
  max: number
}

/**
 * How a set of this exercise is measured.
 * - `weight-reps`: load in kg × repetitions (most lifts)
 * - `duration`: held for time, e.g. plank
 */
export type TrackingMode = 'weight-reps' | 'duration'

export interface Exercise {
  id: ExerciseId
  name: string
  muscles: MuscleGroup[]
  tracking: TrackingMode
  /**
   * Whether an estimated 1RM is a meaningful number for this movement.
   * False for isolation, unilateral and ambiguous exercises where an e1RM
   * would be misleading.
   */
  supportsEstimated1RM: boolean
}

/** Plan-wide training parameters that individual exercises inherit. */
export interface PrescriptionDefaults {
  sets: number
  rir: Range
  restSeconds: number
}

/** One exercise slot within a workout day. */
export interface ExercisePrescription {
  id: PrescriptionId
  exerciseId: ExerciseId
  /** Reps for `weight-reps` exercises, seconds for `duration` exercises. */
  target: Range
  /** Overrides the plan default when set. */
  sets?: number
  /** Overrides the plan default when set; `null` means RIR does not apply. */
  rir?: Range | null
  /** Overrides the plan default when set. */
  restSeconds?: number
  notes?: string
}

export interface WorkoutDay {
  id: WorkoutDayId
  weekday: Weekday
  name: string
  /** Display labels for the day's primary focus, e.g. "Chest", "Arms". */
  focus: string[]
  exercises: ExercisePrescription[]
}

export interface WorkoutPlan {
  id: WorkoutPlanId
  name: string
  defaults: PrescriptionDefaults
  days: WorkoutDay[]
}

/* ------------------------------------------------------------------ */
/* Logged training data                                                */
/* ------------------------------------------------------------------ */

export interface ExerciseSet {
  id: string
  weightKg: number | null
  reps: number | null
  durationSeconds: number | null
  rir: number | null
  /** `null` while the set is planned but not yet completed. */
  completedAt: ISOTimestamp | null
}

export interface WorkoutSessionExercise {
  id: string
  prescriptionId: PrescriptionId
  exerciseId: ExerciseId
  /** Snapshot so history stays readable if the exercise is renamed or removed. */
  exerciseName: string
  tracking: TrackingMode
  /**
   * Prescription snapshot taken when the session starts. A session is an
   * instance of the plan: later plan edits must not rewrite what was trained.
   */
  target: Range
  targetRir: Range | null
  restSeconds: number
  sets: ExerciseSet[]
  notes: string
}

/**
 * Lifecycle: no session = not started; `finishedAt === null` = in progress;
 * `finishedAt` set = completed. Discarding deletes the session.
 */
export interface WorkoutSession {
  id: SessionId
  planId: WorkoutPlanId
  workoutDayId: WorkoutDayId
  /** Snapshot of the workout day name at the time of training. */
  workoutName: string
  startedAt: ISOTimestamp
  /** `null` while the workout is in progress. */
  finishedAt: ISOTimestamp | null
  exercises: WorkoutSessionExercise[]
  notes: string
}

/* ------------------------------------------------------------------ */
/* Personal records                                                    */
/* ------------------------------------------------------------------ */

interface PersonalRecordBase {
  exerciseId: ExerciseId
  sessionId: SessionId
  achievedAt: ISOTimestamp
}

/**
 * Actual lifts and estimates are distinct kinds so the UI can never present
 * an estimated value as something that was really lifted.
 */
export type PersonalRecord =
  | (PersonalRecordBase & { kind: 'heaviest-weight'; weightKg: number; reps: number })
  | (PersonalRecordBase & { kind: 'most-reps-at-weight'; weightKg: number; reps: number })
  | (PersonalRecordBase & { kind: 'longest-duration'; durationSeconds: number })
  | (PersonalRecordBase & { kind: 'most-volume'; volumeKg: number })
  | (PersonalRecordBase & {
      kind: 'estimated-1rm'
      estimatedKg: number
      basedOn: { weightKg: number; reps: number }
    })

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type WeightUnit = 'kg'
export type ThemePreference = 'dark' | 'light' | 'system'

export interface UserSettings {
  weightUnit: WeightUnit
  theme: ThemePreference
  restTimer: {
    /** Used when an exercise does not specify its own rest. */
    defaultSeconds: number
    /** Start the rest timer automatically when a set is completed. */
    autoStart: boolean
  }
}
