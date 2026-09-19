import type { LocalDateKey, Weekday, WorkoutDay, WorkoutPlan } from '../types/domain'
import { addDays, getWeekday, startOfWeek, toLocalDateKey } from '../utils/date'
import { findWorkoutDayByWeekday } from './plan'

export interface ScheduledDay {
  date: Date
  dateKey: LocalDateKey
  weekday: Weekday
  /** `null` on rest days. */
  workout: WorkoutDay | null
  isToday: boolean
  isPast: boolean
}

export function getWorkoutForDate(plan: WorkoutPlan, date: Date): WorkoutDay | null {
  return findWorkoutDayByWeekday(plan, getWeekday(date)) ?? null
}

/** Monday → Sunday for the week containing `today`. */
export function getWeekSchedule(plan: WorkoutPlan, today: Date): ScheduledDay[] {
  const todayKey = toLocalDateKey(today)
  const monday = startOfWeek(today)
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(monday, offset)
    const dateKey = toLocalDateKey(date)
    return {
      date,
      dateKey,
      weekday: getWeekday(date),
      workout: getWorkoutForDate(plan, date),
      isToday: dateKey === todayKey,
      isPast: dateKey < todayKey,
    }
  })
}

/** The first scheduled workout strictly after `date`. */
export function getNextWorkout(plan: WorkoutPlan, date: Date): { date: Date; workout: WorkoutDay } | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(date, offset)
    const workout = getWorkoutForDate(plan, candidate)
    if (workout) return { date: candidate, workout }
  }
  return null
}
