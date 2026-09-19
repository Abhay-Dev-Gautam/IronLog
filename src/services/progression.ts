import type { ExerciseSet, Range } from '../types/domain'

/**
 * Foundation for future progressive-overload guidance. This only describes
 * what was done relative to the target; it makes no recommendation and the
 * UI does not show it yet.
 */

export interface PerformanceAssessment {
  /** Heaviest load used; sets at this load are the working sets. */
  workingWeightKg: number
  workingSets: number
  /** Completed sets at a lighter load (e.g. back-off sets). */
  lighterSets: number
  repsAtWorkingWeight: number[]
  /** Every working set reached the top of the target rep range. */
  reachedTopOfRange: boolean
  /** Working sets that fell short of the bottom of the range. */
  setsBelowRange: number
  /** Lowest RIR logged on a working set; `null` if RIR wasn't logged. */
  lowestRir: number | null
  /** Hardest working set stayed at or above the target RIR minimum; `null` when unknown. */
  effortWithinTarget: boolean | null
  /**
   * Double-progression condition: every working set at the top of the rep
   * range, without going harder than the target effort. Exposed as data only.
   */
  meetsDoubleProgression: boolean
}

/**
 * Describes one session's completed weighted sets against a rep target and
 * RIR target. Returns `null` when there is nothing to assess (no completed
 * sets with reps, or timed work).
 */
export function assessPerformance(
  sets: readonly ExerciseSet[],
  target: Range,
  targetRir: Range | null,
): PerformanceAssessment | null {
  const logged = sets.filter((set) => set.completedAt !== null && set.reps !== null)
  if (logged.length === 0) return null

  const workingWeightKg = Math.max(...logged.map((set) => set.weightKg ?? 0))
  const working = logged.filter((set) => (set.weightKg ?? 0) === workingWeightKg)
  const reps = working.map((set) => set.reps as number)
  const rirs = working.flatMap((set) => (set.rir === null ? [] : [set.rir]))
  const lowestRir = rirs.length > 0 ? Math.min(...rirs) : null
  const effortWithinTarget = lowestRir === null || targetRir === null ? null : lowestRir >= targetRir.min
  const reachedTopOfRange = reps.every((value) => value >= target.max)

  return {
    workingWeightKg,
    workingSets: working.length,
    lighterSets: logged.length - working.length,
    repsAtWorkingWeight: reps,
    reachedTopOfRange,
    setsBelowRange: reps.filter((value) => value < target.min).length,
    lowestRir,
    effortWithinTarget,
    meetsDoubleProgression: reachedTopOfRange && effortWithinTarget !== false,
  }
}
