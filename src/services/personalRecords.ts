import { EXERCISES_BY_ID } from '../data/exercises'
import type { ExerciseId, ExerciseSet, PersonalRecord, TrackingMode, WorkoutSession } from '../types/domain'
import type { ExerciseLibrary } from './plan'
import { isSetComplete } from './sessionStats'

/** Estimates above this many reps are too unreliable to report. */
export const MAX_REPS_FOR_ESTIMATE = 12

/** Epley estimate, rounded to 0.5 kg. Always presented as an estimate, never as a lift. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  const estimate = reps === 1 ? weightKg : weightKg * (1 + reps / 30)
  return Math.round(estimate * 2) / 2
}

interface LoggedSet {
  set: ExerciseSet
  weightKg: number
  reps: number
}

/** Completed sets with reps; a missing weight counts as bodyweight (0 kg). */
function weighted(sets: readonly ExerciseSet[]): LoggedSet[] {
  return sets.flatMap((set) => (set.reps === null ? [] : [{ set, weightKg: set.weightKg ?? 0, reps: set.reps }]))
}

function bestEstimate(sets: readonly LoggedSet[]): LoggedSet | null {
  let best: LoggedSet | null = null
  for (const entry of sets) {
    if (entry.weightKg <= 0 || entry.reps < 1 || entry.reps > MAX_REPS_FOR_ESTIMATE) continue
    if (!best || estimateOneRepMax(entry.weightKg, entry.reps) > estimateOneRepMax(best.weightKg, best.reps)) {
      best = entry
    }
  }
  return best
}

/** The set behind the best estimated 1RM among `sets`, or null if none qualifies. */
export function bestEstimatedSet(sets: readonly ExerciseSet[]): { estimatedKg: number; weightKg: number; reps: number } | null {
  const best = bestEstimate(weighted(sets))
  return best ? { estimatedKg: estimateOneRepMax(best.weightKg, best.reps), weightKg: best.weightKg, reps: best.reps } : null
}

/** Weight × reps over completed sets. Bodyweight (0 kg) and timed sets add nothing. */
export function volumeOf(sets: readonly ExerciseSet[]): number {
  return weighted(sets).reduce((sum, entry) => sum + Math.max(0, entry.weightKg) * Math.max(0, entry.reps), 0)
}

/** Completed sets per exercise in one session, merged if an exercise appears twice. */
export function completedByExercise(
  session: WorkoutSession,
): Map<ExerciseId, { sets: ExerciseSet[]; tracking: TrackingMode }> {
  const grouped = new Map<ExerciseId, { sets: ExerciseSet[]; tracking: TrackingMode }>()
  for (const exercise of session.exercises) {
    const done = exercise.sets.filter(isSetComplete)
    const entry = grouped.get(exercise.exerciseId)
    if (entry) entry.sets.push(...done)
    else grouped.set(exercise.exerciseId, { sets: done, tracking: exercise.tracking })
  }
  return grouped
}

/** Best performances for one exercise across the sessions absorbed so far. */
interface ExerciseBests {
  hasSets: boolean
  /** `null` until a set with reps has been logged. */
  maxWeightKg: number | null
  maxRepsAtWeight: Map<number, number>
  bestEstimateKg: number | null
  maxSessionVolumeKg: number
  maxDurationSeconds: number
}

function emptyBests(): ExerciseBests {
  return {
    hasSets: false,
    maxWeightKg: null,
    maxRepsAtWeight: new Map(),
    bestEstimateKg: null,
    maxSessionVolumeKg: 0,
    maxDurationSeconds: 0,
  }
}

/** Folds one session's completed sets for an exercise into its bests. */
function absorb(bests: ExerciseBests, sets: readonly ExerciseSet[]): void {
  if (sets.length === 0) return
  bests.hasSets = true
  for (const set of sets) bests.maxDurationSeconds = Math.max(bests.maxDurationSeconds, set.durationSeconds ?? 0)
  for (const entry of weighted(sets)) {
    bests.maxWeightKg = Math.max(bests.maxWeightKg ?? 0, entry.weightKg)
    bests.maxRepsAtWeight.set(entry.weightKg, Math.max(bests.maxRepsAtWeight.get(entry.weightKg) ?? 0, entry.reps))
  }
  const estimate = bestEstimate(weighted(sets))
  if (estimate) {
    bests.bestEstimateKg = Math.max(bests.bestEstimateKg ?? 0, estimateOneRepMax(estimate.weightKg, estimate.reps))
  }
  bests.maxSessionVolumeKg = Math.max(bests.maxSessionVolumeKg, volumeOf(sets))
}

interface CompareContext {
  exerciseId: ExerciseId
  session: WorkoutSession
  tracking: TrackingMode
  supportsEstimate: boolean
}

/**
 * Records one session's sets set against earlier bests. An exercise with no
 * earlier sets is a baseline, never a record.
 */
function compare(bests: ExerciseBests, sets: readonly ExerciseSet[], context: CompareContext): PersonalRecord[] {
  if (!bests.hasSets || sets.length === 0) return []
  const base = { exerciseId: context.exerciseId, sessionId: context.session.id }
  const at = (set: ExerciseSet) => set.completedAt ?? context.session.startedAt

  if (context.tracking === 'duration') {
    const best = sets.reduce<ExerciseSet | null>(
      (top, set) => ((set.durationSeconds ?? 0) > (top?.durationSeconds ?? 0) ? set : top),
      null,
    )
    if (best?.durationSeconds && best.durationSeconds > bests.maxDurationSeconds) {
      return [{ ...base, kind: 'longest-duration', durationSeconds: best.durationSeconds, achievedAt: at(best) }]
    }
    return []
  }

  const now = weighted(sets)
  if (now.length === 0 || bests.maxWeightKg === null) return []
  const records: PersonalRecord[] = []

  // Heaviest weight actually lifted (ties broken by reps).
  const heaviest = now.reduce((top, entry) =>
    entry.weightKg > top.weightKg || (entry.weightKg === top.weightKg && entry.reps > top.reps) ? entry : top,
  )
  if (heaviest.weightKg > bests.maxWeightKg) {
    records.push({ ...base, kind: 'heaviest-weight', weightKg: heaviest.weightKg, reps: heaviest.reps, achievedAt: at(heaviest.set) })
  } else {
    // More reps at a weight used before; report the heaviest such weight only.
    const repRecord = now
      .filter((entry) => entry.reps > (bests.maxRepsAtWeight.get(entry.weightKg) ?? Number.POSITIVE_INFINITY))
      .sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps)[0]
    if (repRecord) {
      records.push({ ...base, kind: 'most-reps-at-weight', weightKg: repRecord.weightKg, reps: repRecord.reps, achievedAt: at(repRecord.set) })
    }
  }

  if (context.supportsEstimate && bests.bestEstimateKg !== null) {
    const best = bestEstimate(now)
    if (best) {
      const estimatedKg = estimateOneRepMax(best.weightKg, best.reps)
      if (estimatedKg > bests.bestEstimateKg) {
        records.push({
          ...base,
          kind: 'estimated-1rm',
          estimatedKg,
          basedOn: { weightKg: best.weightKg, reps: best.reps },
          achievedAt: at(best.set),
        })
      }
    }
  }

  const volumeKg = volumeOf(sets)
  if (volumeKg > 0 && volumeKg > bests.maxSessionVolumeKg) {
    const last = sets.reduce((latest, set) => ((set.completedAt ?? '') > (latest.completedAt ?? '') ? set : latest))
    records.push({ ...base, kind: 'most-volume', volumeKg, achievedAt: at(last) })
  }

  return records
}

function byStartedAtAsc(a: WorkoutSession, b: WorkoutSession): number {
  return Date.parse(a.startedAt) - Date.parse(b.startedAt)
}

/**
 * Records set in `session`, compared with finished sessions that started
 * before it. Only completed sets count; the first time an exercise is logged
 * sets a baseline and is not reported as a record.
 */
export function findSessionRecords(
  session: WorkoutSession,
  history: readonly WorkoutSession[],
  library: ExerciseLibrary = EXERCISES_BY_ID,
): PersonalRecord[] {
  const startedAt = Date.parse(session.startedAt)
  const earlier = history
    .filter((candidate) => candidate.id !== session.id && candidate.finishedAt !== null && Date.parse(candidate.startedAt) < startedAt)
    .map(completedByExercise)

  const records: PersonalRecord[] = []
  for (const [exerciseId, { sets, tracking }] of completedByExercise(session)) {
    const bests = emptyBests()
    for (const previous of earlier) absorb(bests, previous.get(exerciseId)?.sets ?? [])
    const supportsEstimate = library.get(exerciseId)?.supportsEstimated1RM ?? false
    records.push(...compare(bests, sets, { exerciseId, session, tracking, supportsEstimate }))
  }
  return records
}

/**
 * Every record ever set, oldest first, in a single pass over finished
 * sessions. Uses the same rules as `findSessionRecords`.
 */
export function buildRecordTimeline(
  sessions: readonly WorkoutSession[],
  library: ExerciseLibrary = EXERCISES_BY_ID,
): PersonalRecord[] {
  const bestsByExercise = new Map<ExerciseId, ExerciseBests>()
  const records: PersonalRecord[] = []
  const finished = sessions.filter((session) => session.finishedAt !== null).sort(byStartedAtAsc)

  for (const session of finished) {
    for (const [exerciseId, { sets, tracking }] of completedByExercise(session)) {
      const bests = bestsByExercise.get(exerciseId) ?? emptyBests()
      const supportsEstimate = library.get(exerciseId)?.supportsEstimated1RM ?? false
      records.push(...compare(bests, sets, { exerciseId, session, tracking, supportsEstimate }))
      absorb(bests, sets)
      bestsByExercise.set(exerciseId, bests)
    }
  }
  return records
}
