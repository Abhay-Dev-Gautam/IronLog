import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../data/defaultPlan'
import { makeSession, type SetInput } from '../test/fixtures'
import { getTrainingStats, getWeekOverview, getWeekStreak, median } from './trainingStats'

const at = (month: number, date: number, hour = 18, minute = 0) => new Date(2026, month, date, hour, minute)
const workout = (id: string, start: Date, dayId = 'upper-a', minutes: number | null = 50, sets: SetInput[] = [{ kg: 50, reps: 10 }]) =>
  makeSession({
    id,
    dayId,
    start,
    end: minutes === null ? null : new Date(start.getTime() + minutes * 60_000),
    exercises: [{ exerciseId: 'lat-pulldown', sets }],
  })

// Wednesday 23 September 2026
const TODAY = at(8, 23, 12)

describe('getTrainingStats', () => {
  it('is all zeros with no history', () => {
    expect(getTrainingStats([], TODAY)).toEqual({
      totalWorkouts: 0,
      workoutsThisWeek: 0,
      workoutsThisMonth: 0,
      totalSets: 0,
      totalVolumeKg: 0,
      typicalDurationMs: null,
      weekStreak: 0,
    })
  })

  it('counts this week and this month by local start date, including the boundaries', () => {
    const sessions = [
      workout('sun-late', at(8, 20, 23, 50)), // Sunday 23:50: last week
      workout('mon-early', at(8, 21, 0, 10)), // Monday 00:10: this week
      workout('tue', at(8, 22)),
      workout('aug-late', at(7, 31, 23, 50)), // 31 Aug 23:50: last month
    ]
    const stats = getTrainingStats(sessions, TODAY)
    expect(stats).toMatchObject({ totalWorkouts: 4, workoutsThisWeek: 2, workoutsThisMonth: 3 })

    const octoberFirst = getTrainingStats([workout('sep-30', at(8, 30, 23, 50)), workout('oct-1', at(9, 1, 0, 10))], at(9, 1, 12))
    expect(octoberFirst.workoutsThisMonth).toBe(1)
    expect(octoberFirst.workoutsThisWeek).toBe(2) // same Mon–Sun week across the month change
  })

  it('totals completed sets and external load, ignoring bodyweight and unfinished workouts', () => {
    const sessions = [
      workout('a', at(8, 21), 'upper-a', 50, [{ kg: 50, reps: 10 }, { kg: 50, reps: 8 }, { kg: 50, reps: 8, done: false }]),
      workout('b', at(8, 22), 'lower-a', 50, [{ kg: 0, reps: 15 }]),
      workout('live', at(8, 23), 'push', null, [{ kg: 100, reps: 10 }]),
    ]
    expect(getTrainingStats(sessions, TODAY)).toMatchObject({ totalWorkouts: 2, totalSets: 3, totalVolumeKg: 900 })
  })

  it('uses the median duration so one workout left open overnight does not distort it', () => {
    const sessions = [workout('a', at(8, 14), 'upper-a', 50), workout('b', at(8, 15), 'lower-a', 55), workout('c', at(8, 16), 'push', 14 * 60)]
    expect(getTrainingStats(sessions, TODAY).typicalDurationMs).toBe(55 * 60_000)
  })

  it('computes medians for odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('getWeekStreak', () => {
  it('counts consecutive weeks with training, ignoring rest days', () => {
    const sessions = [workout('w0', at(8, 2)), workout('w2', at(8, 18)), workout('w3', at(8, 22))]
    expect(getWeekStreak(sessions, TODAY)).toBe(2) // this week + last week; the week of 31 Aug is cut off by an untrained week
  })

  it('does not break the streak just because this week has not been trained yet', () => {
    const sessions = [workout('w1', at(8, 14)), workout('w2', at(8, 18))]
    expect(getWeekStreak(sessions, at(8, 21, 9))).toBe(1)
  })

  it('is zero after a full week without training, and ignores unfinished workouts', () => {
    expect(getWeekStreak([workout('old', at(8, 8))], TODAY)).toBe(0)
    expect(getWeekStreak([workout('live', at(8, 22), 'upper-a', null)], TODAY)).toBe(0)
  })
})

describe('getWeekOverview', () => {
  it('marks scheduled workouts complete only from finished sessions this week', () => {
    const sessions = [
      workout('mon', at(8, 21), 'upper-a'),
      workout('live-tue', at(8, 22), 'lower-a', null), // in progress: not complete
      workout('last-week-push', at(8, 16), 'push'), // previous week: not this week's
    ]
    const overview = getWeekOverview(DEFAULT_PLAN, sessions, TODAY)
    expect(overview.days.map((day) => [day.weekday, day.workout?.id ?? 'rest', day.completedBy?.id ?? null])).toEqual([
      ['monday', 'upper-a', 'mon'],
      ['tuesday', 'lower-a', null], // the day has passed, but nothing was finished
      ['wednesday', 'push', null],
      ['thursday', 'pull', null],
      ['friday', 'lower-b', null],
      ['saturday', 'rest', null],
      ['sunday', 'rest', null],
    ])
    expect(overview).toMatchObject({ planned: 5, completed: 1 })
  })

  it('counts a make-up session done on a different day of the week', () => {
    const overview = getWeekOverview(DEFAULT_PLAN, [workout('late', at(8, 22), 'upper-a')], TODAY)
    expect(overview.days[0]!.completedBy?.id).toBe('late')
    expect(overview.days[1]!.completedBy).toBeNull()
  })

  it('marks today and past days, with weekend rest days identifiable', () => {
    const overview = getWeekOverview(DEFAULT_PLAN, [], TODAY)
    expect(overview.days.map((day) => day.isToday)).toEqual([false, false, true, false, false, false, false])
    expect(overview.days.slice(5).every((day) => day.workout === null)).toBe(true)
  })
})
