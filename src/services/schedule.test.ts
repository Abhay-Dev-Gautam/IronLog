import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../data/defaultPlan'
import { getNextWorkout, getWeekSchedule, getWorkoutForDate } from './schedule'

// Local-time dates: 21 Sep 2026 is a Monday.
const monday = new Date(2026, 8, 21, 7, 30)
const friday = new Date(2026, 8, 25, 18, 0)
const saturday = new Date(2026, 8, 19, 21, 0)
const sunday = new Date(2026, 8, 20, 10, 0)

describe("today's workout detection", () => {
  it('maps each weekday to its workout', () => {
    const names = [0, 1, 2, 3, 4].map((offset) => getWorkoutForDate(DEFAULT_PLAN, new Date(2026, 8, 21 + offset))?.name)
    expect(names).toEqual(['Upper A', 'Lower A', 'Push', 'Pull', 'Lower B + Core'])
  })

  it('treats the weekend as rest days', () => {
    expect(getWorkoutForDate(DEFAULT_PLAN, saturday)).toBeNull()
    expect(getWorkoutForDate(DEFAULT_PLAN, sunday)).toBeNull()
  })

  it('uses the local calendar day, not UTC, late at night', () => {
    // 23:45 local on Monday is still Monday regardless of the UTC offset.
    expect(getWorkoutForDate(DEFAULT_PLAN, new Date(2026, 8, 21, 23, 45))?.id).toBe('upper-a')
  })
})

describe('getWeekSchedule', () => {
  it('returns Monday to Sunday of the current week, even when today is Sunday', () => {
    const week = getWeekSchedule(DEFAULT_PLAN, sunday)
    expect(week.map((day) => day.dateKey)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ])
    expect(week.filter((day) => day.workout).length).toBe(5)
  })

  it('marks today and past days', () => {
    const week = getWeekSchedule(DEFAULT_PLAN, new Date(2026, 8, 23, 12, 0)) // Wednesday
    expect(week.map((day) => day.isToday)).toEqual([false, false, true, false, false, false, false])
    expect(week.map((day) => day.isPast)).toEqual([true, true, false, false, false, false, false])
  })
})

describe('getNextWorkout', () => {
  it('skips the weekend to Monday', () => {
    const fromSaturday = getNextWorkout(DEFAULT_PLAN, saturday)
    expect(fromSaturday?.workout.id).toBe('upper-a')
    expect(fromSaturday?.date.getDate()).toBe(21)

    expect(getNextWorkout(DEFAULT_PLAN, friday)?.workout.id).toBe('upper-a')
  })

  it('returns the following day during the week', () => {
    expect(getNextWorkout(DEFAULT_PLAN, monday)?.workout.id).toBe('lower-a')
  })

  it('returns null for a plan with no days', () => {
    expect(getNextWorkout({ ...DEFAULT_PLAN, days: [] }, monday)).toBeNull()
  })
})
