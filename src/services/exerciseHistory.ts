import { EXERCISES_BY_ID } from '../data/exercises'
import type { ExerciseId, ExerciseSet, SessionId, TrackingMode, WorkoutDayId, WorkoutSession } from '../types/domain'
import { bestEstimatedSet, volumeOf } from './personalRecords'
import type { ExerciseLibrary } from './plan'
import { isSetComplete } from './sessionStats'

/**
 * Per-exercise history, derived on demand from finished sessions. Nothing
 * here is stored: sessions (with their snapshots) are the single source of
 * truth, so history stays accurate when the plan changes later.
 */

export interface ExerciseSessionEntry {
  sessionId: SessionId
  workoutDayId: WorkoutDayId
  workoutName: string
  startedAt: string
  /** The exercise's name as it was in this session. */
  exerciseName: string
  tracking: TrackingMode
  /** Completed sets only, in the order performed. */
  sets: ExerciseSet[]
  /** Weight × reps over completed sets. 0 for bodyweight and timed work. */
  volumeKg: number
  /** Heaviest set (most reps breaks ties); longest hold for timed exercises. */
  bestSet: ExerciseSet
  /** Heaviest completed load; `null` for timed exercises. */
  topWeightKg: number | null
  bestReps: number | null
  bestDurationSeconds: number | null
  /** Present only where an estimate is meaningful (see Exercise.supportsEstimated1RM). */
  estimated1RM: { estimatedKg: number; weightKg: number; reps: number } | null
  notes: string
}

/** Heaviest set, ties broken by reps; for timed exercises, the longest hold. */
export function getBestSet(sets: readonly ExerciseSet[], tracking: TrackingMode): ExerciseSet | null {
  let best: ExerciseSet | null = null
  for (const set of sets) {
    if (!best) {
      best = set
    } else if (tracking === 'duration') {
      if ((set.durationSeconds ?? 0) > (best.durationSeconds ?? 0)) best = set
    } else {
      const weight = set.weightKg ?? 0
      const bestWeight = best.weightKg ?? 0
      if (weight > bestWeight || (weight === bestWeight && (set.reps ?? 0) > (best.reps ?? 0))) best = set
    }
  }
  return best
}

function toEntry(session: WorkoutSession, exerciseId: ExerciseId, library: ExerciseLibrary): ExerciseSessionEntry | null {
  const matches = session.exercises.filter((exercise) => exercise.exerciseId === exerciseId)
  const first = matches[0]
  if (!first) return null
  const sets = matches.flatMap((exercise) => exercise.sets.filter(isSetComplete))
  const bestSet = getBestSet(sets, first.tracking)
  if (!bestSet) return null

  const timed = first.tracking === 'duration'
  const reps = sets.flatMap((set) => (set.reps === null ? [] : [set.reps]))
  const durations = sets.flatMap((set) => (set.durationSeconds === null ? [] : [set.durationSeconds]))
  return {
    sessionId: session.id,
    workoutDayId: session.workoutDayId,
    workoutName: session.workoutName,
    startedAt: session.startedAt,
    exerciseName: first.exerciseName,
    tracking: first.tracking,
    sets,
    volumeKg: volumeOf(sets),
    bestSet,
    topWeightKg: timed ? null : Math.max(0, ...sets.map((set) => set.weightKg ?? 0)),
    bestReps: reps.length > 0 ? Math.max(...reps) : null,
    bestDurationSeconds: durations.length > 0 ? Math.max(...durations) : null,
    estimated1RM: !timed && library.get(exerciseId)?.supportsEstimated1RM ? bestEstimatedSet(sets) : null,
    notes: matches.map((exercise) => exercise.notes.trim()).filter(Boolean).join('\n'),
  }
}

function finishedNewestFirst(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((session) => session.finishedAt !== null)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
}

/** Every finished session in which this exercise had completed sets, newest first. */
export function getExerciseHistory(
  sessions: readonly WorkoutSession[],
  exerciseId: ExerciseId,
  library: ExerciseLibrary = EXERCISES_BY_ID,
): ExerciseSessionEntry[] {
  return finishedNewestFirst(sessions).flatMap((session) => toEntry(session, exerciseId, library) ?? [])
}

export interface ExerciseOverview {
  exerciseId: ExerciseId
  /** Current library name, falling back to the most recent snapshot. */
  name: string
  sessionCount: number
  latest: ExerciseSessionEntry
  first: ExerciseSessionEntry
}

/** Every exercise that has been logged, most recently trained first. */
export function getExerciseOverviews(
  sessions: readonly WorkoutSession[],
  library: ExerciseLibrary = EXERCISES_BY_ID,
): ExerciseOverview[] {
  const byExercise = new Map<ExerciseId, ExerciseSessionEntry[]>()
  for (const session of finishedNewestFirst(sessions)) {
    for (const exerciseId of new Set(session.exercises.map((exercise) => exercise.exerciseId))) {
      const entry = toEntry(session, exerciseId, library)
      if (!entry) continue
      const list = byExercise.get(exerciseId)
      if (list) list.push(entry)
      else byExercise.set(exerciseId, [entry])
    }
  }
  return [...byExercise].map(([exerciseId, entries]) => {
    const latest = entries[0] as ExerciseSessionEntry
    return {
      exerciseId,
      name: library.get(exerciseId)?.name ?? latest.exerciseName,
      sessionCount: entries.length,
      latest,
      first: entries.at(-1) as ExerciseSessionEntry,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Progression                                                         */
/* ------------------------------------------------------------------ */

export type ProgressMetric = 'top-weight' | 'estimated-1rm' | 'volume' | 'best-reps' | 'longest-hold'

/** Metrics that are meaningful for this exercise's logged data. */
export function getAvailableMetrics(history: readonly ExerciseSessionEntry[]): ProgressMetric[] {
  const latest = history[0]
  if (!latest) return []
  if (latest.tracking === 'duration') return ['longest-hold']
  const loaded = history.some((entry) => (entry.topWeightKg ?? 0) > 0)
  if (!loaded) return ['best-reps'] // bodyweight only: kg-based metrics would be meaningless
  const metrics: ProgressMetric[] = ['top-weight']
  if (history.some((entry) => entry.estimated1RM)) metrics.push('estimated-1rm')
  metrics.push('volume')
  return metrics
}

export function getMetricValue(entry: ExerciseSessionEntry, metric: ProgressMetric): number | null {
  switch (metric) {
    case 'top-weight':
      return entry.topWeightKg !== null && entry.topWeightKg > 0 ? entry.topWeightKg : null
    case 'estimated-1rm':
      return entry.estimated1RM?.estimatedKg ?? null
    case 'volume':
      return entry.volumeKg > 0 ? entry.volumeKg : null
    case 'best-reps':
      return entry.bestReps
    case 'longest-hold':
      return entry.bestDurationSeconds
  }
}

export interface SeriesPoint {
  sessionId: SessionId
  startedAt: string
  value: number
}

/** Chronological (oldest first) values of `metric`, skipping sessions where it doesn't apply. */
export function getProgressSeries(history: readonly ExerciseSessionEntry[], metric: ProgressMetric): SeriesPoint[] {
  return history
    .flatMap((entry) => {
      const value = getMetricValue(entry, metric)
      return value === null ? [] : [{ sessionId: entry.sessionId, startedAt: entry.startedAt, value }]
    })
    .reverse()
}

export interface Trend {
  first: SeriesPoint
  latest: SeriesPoint
  best: SeriesPoint
  /** latest − first */
  change: number
  points: number
}

export function summarizeTrend(series: readonly SeriesPoint[]): Trend | null {
  const first = series[0]
  const latest = series.at(-1)
  if (!first || !latest) return null
  const best = series.reduce((top, point) => (point.value > top.value ? point : top), first)
  return { first, latest, best, change: latest.value - first.value, points: series.length }
}

/* ------------------------------------------------------------------ */
/* Records for one exercise                                            */
/* ------------------------------------------------------------------ */

interface Dated {
  startedAt: string
  sessionId: SessionId
}

export interface ExerciseRecords {
  /** Heaviest load actually lifted, with its reps. */
  heaviest: (Dated & { weightKg: number; reps: number }) | null
  /** Best reps achieved at each load used, heaviest load first. */
  repsByWeight: (Dated & { weightKg: number; reps: number })[]
  mostVolume: (Dated & { volumeKg: number }) | null
  /** Estimated, never lifted: only for exercises where the estimate is meaningful. */
  bestEstimate: (Dated & { estimatedKg: number; weightKg: number; reps: number }) | null
  longestHold: (Dated & { seconds: number }) | null
}

/** All-time bests from an exercise's history. Earliest achievement wins ties. */
export function getExerciseRecords(history: readonly ExerciseSessionEntry[]): ExerciseRecords {
  const records: ExerciseRecords = { heaviest: null, repsByWeight: [], mostVolume: null, bestEstimate: null, longestHold: null }
  const byWeight = new Map<number, Dated & { weightKg: number; reps: number }>()

  // Oldest first, so a later session must beat (not tie) a record to take it.
  for (const entry of [...history].reverse()) {
    const dated = { startedAt: entry.startedAt, sessionId: entry.sessionId }
    if (entry.tracking === 'duration') {
      if (entry.bestDurationSeconds !== null && entry.bestDurationSeconds > (records.longestHold?.seconds ?? 0)) {
        records.longestHold = { ...dated, seconds: entry.bestDurationSeconds }
      }
      continue
    }
    for (const set of entry.sets) {
      if (set.reps === null) continue
      const weightKg = set.weightKg ?? 0
      const current = byWeight.get(weightKg)
      if (!current || set.reps > current.reps) byWeight.set(weightKg, { ...dated, weightKg, reps: set.reps })
      const heaviest = records.heaviest
      if (weightKg > 0 && (!heaviest || weightKg > heaviest.weightKg || (weightKg === heaviest.weightKg && set.reps > heaviest.reps))) {
        records.heaviest = { ...dated, weightKg, reps: set.reps }
      }
    }
    if (entry.volumeKg > (records.mostVolume?.volumeKg ?? 0)) records.mostVolume = { ...dated, volumeKg: entry.volumeKg }
    if (entry.estimated1RM && entry.estimated1RM.estimatedKg > (records.bestEstimate?.estimatedKg ?? 0)) {
      records.bestEstimate = { ...dated, ...entry.estimated1RM }
    }
  }

  records.repsByWeight = [...byWeight.values()].sort((a, b) => b.weightKg - a.weightKg)
  return records
}
