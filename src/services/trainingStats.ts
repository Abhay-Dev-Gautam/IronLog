import type { LocalDateKey, Weekday, WorkoutDay, WorkoutPlan, WorkoutSession } from '../types/domain'
import { addDays, startOfWeek, toLocalDateKey } from '../utils/date'
import { getWeekSchedule } from './schedule'
import { getSessionDateKey, summarizeSession } from './sessionStats'

/**
 * Training statistics derived from finished sessions. Calendar grouping uses
 * the local date a session started on, so a 23:30 workout stays on its day.
 */

export interface TrainingStats {
  totalWorkouts: number
  workoutsThisWeek: number
  workoutsThisMonth: number
  totalSets: number
  /** Weight × reps over completed sets; bodyweight and timed sets add nothing. */
  totalVolumeKg: number
  /**
   * Median duration. A median, not a mean, so one workout left open
   * overnight doesn't distort it.
   */
  typicalDurationMs: number | null
  weekStreak: number
}

function finished(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => session.finishedAt !== null)
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
}

function weekKey(date: Date): LocalDateKey {
  return toLocalDateKey(startOfWeek(date))
}

/**
 * Consecutive calendar weeks (Mon–Sun) with at least one finished workout,
 * counting back from this week. The current week doesn't break the streak
 * until it is over, and rest days never do.
 */
export function getWeekStreak(sessions: readonly WorkoutSession[], today: Date): number {
  const trainedWeeks = new Set(finished(sessions).map((session) => weekKey(new Date(session.startedAt))))
  let cursor = startOfWeek(today)
  if (!trainedWeeks.has(toLocalDateKey(cursor))) cursor = addDays(cursor, -7)
  let streak = 0
  while (trainedWeeks.has(toLocalDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -7)
  }
  return streak
}

export function getTrainingStats(sessions: readonly WorkoutSession[], today: Date): TrainingStats {
  const done = finished(sessions)
  const thisWeek = weekKey(today)
  let workoutsThisWeek = 0
  let workoutsThisMonth = 0
  let totalSets = 0
  let totalVolumeKg = 0
  const durations: number[] = []

  for (const session of done) {
    const started = new Date(session.startedAt)
    if (weekKey(started) === thisWeek) workoutsThisWeek += 1
    if (started.getFullYear() === today.getFullYear() && started.getMonth() === today.getMonth()) workoutsThisMonth += 1
    const summary = summarizeSession(session)
    totalSets += summary.completedSets
    totalVolumeKg += summary.volumeKg
    if (summary.durationMs !== null && summary.durationMs > 0) durations.push(summary.durationMs)
  }

  return {
    totalWorkouts: done.length,
    workoutsThisWeek,
    workoutsThisMonth,
    totalSets,
    totalVolumeKg,
    typicalDurationMs: median(durations),
    weekStreak: getWeekStreak(done, today),
  }
}

export interface WeekOverviewDay {
  date: Date
  dateKey: LocalDateKey
  weekday: Weekday
  /** The scheduled workout, or `null` on a rest day. */
  workout: WorkoutDay | null
  /**
   * The finished session that completed this scheduled workout during this
   * week, on any day (a make-up session counts). Never assumed from the date.
   */
  completedBy: WorkoutSession | null
  isToday: boolean
  isPast: boolean
}

export interface WeekOverview {
  days: WeekOverviewDay[]
  /** Scheduled workouts this week. */
  planned: number
  /** Scheduled workouts completed this week. */
  completed: number
}

/** Mon–Sun of the current week: what was scheduled, and what was actually completed. */
export function getWeekOverview(plan: WorkoutPlan, sessions: readonly WorkoutSession[], today: Date): WeekOverview {
  const schedule = getWeekSchedule(plan, today)
  const weekKeys = new Set(schedule.map((day) => day.dateKey))
  const thisWeek = finished(sessions)
    .filter((session) => weekKeys.has(getSessionDateKey(session)))
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))

  const days = schedule.map((day) => ({
    ...day,
    completedBy: day.workout
      ? (thisWeek.find((session) => session.workoutDayId === day.workout?.id) ?? null)
      : null,
  }))
  return {
    days,
    planned: days.filter((day) => day.workout).length,
    completed: days.filter((day) => day.completedBy).length,
  }
}
