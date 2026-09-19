import type {
  ExerciseId,
  ExerciseSet,
  LocalDateKey,
  SessionId,
  WorkoutDayId,
  WorkoutSession,
} from '../types/domain'
import { toLocalDateKey } from '../utils/date'

export interface SessionSummary {
  /** `null` while the session is still in progress. */
  durationMs: number | null
  completedSets: number
  totalSets: number
  totalExercises: number
  /** Exercises with at least one completed set. */
  exercisesTrained: number
  /** Exercises whose sets are all completed. */
  exercisesCompleted: number
  volumeKg: number
}

export interface WorkoutProgress {
  completedSets: number
  totalSets: number
  /** 0–100, rounded. */
  percent: number
}

export type DayWorkoutStatus =
  | { state: 'not-started'; progress: WorkoutProgress }
  | { state: 'in-progress'; session: WorkoutSession; progress: WorkoutProgress }
  | { state: 'complete'; session: WorkoutSession; progress: WorkoutProgress; summary: SessionSummary }

export function isSetComplete(set: ExerciseSet): boolean {
  return set.completedAt !== null
}

/** Load × reps for a completed weighted set; timed and unloaded sets add no volume. */
export function setVolumeKg(set: ExerciseSet): number {
  if (!isSetComplete(set) || set.weightKg === null || set.reps === null) return 0
  return Math.max(0, set.weightKg) * Math.max(0, set.reps)
}

export function getSessionDateKey(session: WorkoutSession): LocalDateKey {
  return toLocalDateKey(new Date(session.startedAt))
}

export function summarizeSession(session: WorkoutSession): SessionSummary {
  let completedSets = 0
  let totalSets = 0
  let exercisesTrained = 0
  let exercisesCompleted = 0
  let volumeKg = 0

  for (const exercise of session.exercises) {
    let done = 0
    for (const set of exercise.sets) {
      totalSets += 1
      if (isSetComplete(set)) {
        done += 1
        volumeKg += setVolumeKg(set)
      }
    }
    completedSets += done
    if (done > 0) exercisesTrained += 1
    if (done > 0 && done === exercise.sets.length) exercisesCompleted += 1
  }

  const durationMs =
    session.finishedAt === null
      ? null
      : Math.max(0, Date.parse(session.finishedAt) - Date.parse(session.startedAt))

  return {
    durationMs,
    completedSets,
    totalSets,
    totalExercises: session.exercises.length,
    exercisesTrained,
    exercisesCompleted,
    volumeKg,
  }
}

function toProgress(completedSets: number, totalSets: number): WorkoutProgress {
  const percent = totalSets > 0 ? Math.round((Math.min(completedSets, totalSets) / totalSets) * 100) : 0
  return { completedSets, totalSets, percent }
}

function byStartedAtDesc(a: WorkoutSession, b: WorkoutSession): number {
  return Date.parse(b.startedAt) - Date.parse(a.startedAt)
}

/**
 * Status of a specific workout on a specific calendar day. `plannedSets` is
 * used until a session exists, after which the session's own set list (which
 * may include added or removed sets) is the source of truth.
 */
export function getWorkoutStatusForDate(
  sessions: readonly WorkoutSession[],
  workoutDayId: WorkoutDayId,
  dateKey: LocalDateKey,
  plannedSets: number,
): DayWorkoutStatus {
  const session = sessions
    .filter((candidate) => candidate.workoutDayId === workoutDayId && getSessionDateKey(candidate) === dateKey)
    .sort(byStartedAtDesc)[0]

  if (!session) return { state: 'not-started', progress: toProgress(0, plannedSets) }

  const summary = summarizeSession(session)
  const progress = toProgress(summary.completedSets, summary.totalSets)
  return session.finishedAt === null
    ? { state: 'in-progress', session, progress }
    : { state: 'complete', session, progress, summary }
}

export function getLastFinishedSession(sessions: readonly WorkoutSession[]): WorkoutSession | null {
  return getCompletedSessions(sessions)[0] ?? null
}

/** Finished sessions, most recent first. */
export function getCompletedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => session.finishedAt !== null).sort(byStartedAtDesc)
}

/** The unfinished session to resume, if any (the newest one if several exist). */
export function getActiveSession(sessions: readonly WorkoutSession[]): WorkoutSession | null {
  return sessions.filter((session) => session.finishedAt === null).sort(byStartedAtDesc)[0] ?? null
}

export interface PreviousPerformance {
  sessionId: SessionId
  startedAt: string
  sets: ExerciseSet[]
}

/**
 * The most recent finished session in which this exercise had completed sets.
 * Matching is by exercise ID, so history carries across days that share an
 * exercise (e.g. Lat Pulldown on Monday and Thursday).
 */
export function getPreviousPerformance(
  sessions: readonly WorkoutSession[],
  exerciseId: ExerciseId,
  excludeSessionId?: SessionId,
): PreviousPerformance | null {
  const ordered = sessions
    .filter((session) => session.finishedAt !== null && session.id !== excludeSessionId)
    .sort(byStartedAtDesc)

  for (const session of ordered) {
    const sets = session.exercises
      .filter((exercise) => exercise.exerciseId === exerciseId)
      .flatMap((exercise) => exercise.sets.filter(isSetComplete))
    if (sets.length > 0) return { sessionId: session.id, startedAt: session.startedAt, sets }
  }
  return null
}
