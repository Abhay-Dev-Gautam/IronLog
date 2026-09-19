import { describe, expect, it } from 'vitest'
import { EXERCISES_BY_ID } from '../data/exercises'
import { makeSession, type SetInput } from '../test/fixtures'
import type { Exercise, TrackingMode } from '../types/domain'
import {
  getAvailableMetrics,
  getBestSet,
  getExerciseHistory,
  getExerciseOverviews,
  getExerciseRecords,
  getProgressSeries,
  summarizeTrend,
} from './exerciseHistory'
import type { ExerciseLibrary } from './plan'

const day = (date: number, hour = 18) => new Date(2026, 8, date, hour, 0)
const session = (id: string, date: number, exerciseId: string, sets: SetInput[], extra: { dayId?: string; tracking?: TrackingMode; end?: Date | null; notes?: string } = {}) =>
  makeSession({
    id,
    dayId: extra.dayId,
    start: day(date),
    end: extra.end,
    exercises: [{ exerciseId, tracking: extra.tracking, sets, notes: extra.notes }],
  })

const PRESS = 'flat-chest-press-machine'
const sep21 = session('s21', 21, PRESS, [{ kg: 40, reps: 12, rir: 2 }, { kg: 40, reps: 11, rir: 2 }])
const sep24 = session('s24', 24, PRESS, [{ kg: 40, reps: 12, rir: 2 }, { kg: 42.5, reps: 9, rir: 3 }])
const sep27 = session('s27', 27, PRESS, [{ kg: 42.5, reps: 10, rir: 2 }, { kg: 42.5, reps: 9, rir: 2 }, { kg: 45, reps: 6, done: false }])

describe('getExerciseHistory', () => {
  it('is empty for an exercise that was never logged', () => {
    expect(getExerciseHistory([], PRESS)).toEqual([])
    expect(getExerciseHistory([sep21], 'hammer-curl')).toEqual([])
    expect(getExerciseOverviews([])).toEqual([])
  })

  it('lists sessions newest first with completed sets only', () => {
    const history = getExerciseHistory([sep21, sep27, sep24], PRESS)
    expect(history.map((entry) => entry.sessionId)).toEqual(['s27', 's24', 's21'])
    expect(history[0]!.sets.map((set) => [set.weightKg, set.reps, set.rir])).toEqual([
      [42.5, 10, 2],
      [42.5, 9, 2],
    ])
  })

  it('computes volume, best set, top weight and reps per session', () => {
    const [latest, middle] = getExerciseHistory([sep21, sep24, sep27], PRESS)
    expect(latest).toMatchObject({ volumeKg: 42.5 * 10 + 42.5 * 9, topWeightKg: 42.5, bestReps: 10 })
    expect(latest!.bestSet).toMatchObject({ weightKg: 42.5, reps: 10 })
    // Heaviest set wins over a set with more reps at a lighter load.
    expect(middle!.bestSet).toMatchObject({ weightKg: 42.5, reps: 9 })
  })

  it('gives an estimated 1RM only for exercises where it is meaningful', () => {
    const [press] = getExerciseHistory([sep27], PRESS)
    expect(press!.estimated1RM).toEqual({ estimatedKg: 56.5, weightKg: 42.5, reps: 10 })
    const lateral = getExerciseHistory([session('l', 21, 'lateral-raise', [{ kg: 10, reps: 12 }])], 'lateral-raise')
    expect(lateral[0]!.estimated1RM).toBeNull()
  })

  it('ignores unfinished (in-progress or discarded) sessions and sessions without completed sets', () => {
    const live = session('live', 28, PRESS, [{ kg: 50, reps: 10 }], { end: null })
    const skipped = session('skip', 26, PRESS, [{ kg: 50, reps: 10, done: false }])
    expect(getExerciseHistory([sep21, live, skipped], PRESS).map((entry) => entry.sessionId)).toEqual(['s21'])
  })

  it('merges history for an exercise shared by different workout days', () => {
    const monday = session('mon', 21, 'lat-pulldown', [{ kg: 50, reps: 10 }], { dayId: 'upper-a' })
    const thursday = session('thu', 24, 'lat-pulldown', [{ kg: 52.5, reps: 8 }], { dayId: 'pull' })
    const history = getExerciseHistory([monday, thursday], 'lat-pulldown')
    expect(history.map((entry) => entry.workoutDayId)).toEqual(['pull', 'upper-a'])
  })

  it('keeps historical names and data when the plan or library changes later', () => {
    const old = session('old', 21, 'retired-exercise', [{ kg: 30, reps: 10 }])
    const emptyLibrary: ExerciseLibrary = new Map()
    const [entry] = getExerciseHistory([old], 'retired-exercise', emptyLibrary)
    expect(entry).toMatchObject({ exerciseName: 'retired-exercise', topWeightKg: 30, estimated1RM: null })
    expect(getExerciseOverviews([old], emptyLibrary)[0]!.name).toBe('retired-exercise')

    const renamed: ExerciseLibrary = new Map([
      [PRESS, { ...(EXERCISES_BY_ID.get(PRESS) as Exercise), name: 'Chest Press (renamed)' }],
    ])
    const overview = getExerciseOverviews([sep21], renamed)[0]!
    expect(overview.name).toBe('Chest Press (renamed)') // current label for the list
    expect(overview.latest.exerciseName).toBe(PRESS) // the session keeps what it was called then
  })

  it('treats missing weights on damaged records as bodyweight, and skips sets without reps', () => {
    const damaged = session('d', 21, 'cable-crunch', [{ kg: null, reps: 15 }, { kg: 20, reps: null }])
    const [entry] = getExerciseHistory([damaged], 'cable-crunch')
    expect(entry).toMatchObject({ volumeKg: 0, bestReps: 15 })
  })
})

describe('getExerciseOverviews', () => {
  it('lists logged exercises, most recently trained first, with counts', () => {
    const pull = session('pull', 25, 'lat-pulldown', [{ kg: 50, reps: 10 }])
    const overviews = getExerciseOverviews([sep21, sep24, pull])
    expect(overviews.map((overview) => [overview.exerciseId, overview.sessionCount])).toEqual([
      ['lat-pulldown', 1],
      [PRESS, 2],
    ])
    expect(overviews[1]!.first.sessionId).toBe('s21')
    expect(overviews[1]!.latest.sessionId).toBe('s24')
  })
})

describe('progression', () => {
  const history = getExerciseHistory([sep21, sep24, sep27], PRESS)

  it('offers weight, estimate and volume metrics for a loaded compound lift', () => {
    expect(getAvailableMetrics(history)).toEqual(['top-weight', 'estimated-1rm', 'volume'])
  })

  it('offers only reps for bodyweight work and only time for timed work', () => {
    const bodyweight = getExerciseHistory([session('b', 21, 'cable-crunch', [{ kg: 0, reps: 15 }])], 'cable-crunch')
    expect(getAvailableMetrics(bodyweight)).toEqual(['best-reps'])
    const plank = getExerciseHistory([session('p', 21, 'plank', [{ seconds: 45 }], { tracking: 'duration' })], 'plank')
    expect(getAvailableMetrics(plank)).toEqual(['longest-hold'])
    expect(getAvailableMetrics([])).toEqual([])
  })

  it('builds a chronological series and summarises the change', () => {
    const series = getProgressSeries(history, 'top-weight')
    expect(series.map((point) => point.value)).toEqual([40, 42.5, 42.5])
    expect(summarizeTrend(series)).toMatchObject({ change: 2.5, points: 3, best: { sessionId: 's24' } })
    expect(getProgressSeries(history, 'volume').map((point) => point.value)).toEqual([40 * 12 + 40 * 11, 40 * 12 + 42.5 * 9, 42.5 * 19])
    expect(summarizeTrend([])).toBeNull()
  })
})

describe('getBestSet', () => {
  it('prefers the heavier set, then more reps; longest hold for timed sets', () => {
    const sets = session('x', 21, PRESS, [{ kg: 40, reps: 12 }, { kg: 42.5, reps: 8 }, { kg: 42.5, reps: 9 }]).exercises[0]!.sets
    expect(getBestSet(sets, 'weight-reps')).toMatchObject({ weightKg: 42.5, reps: 9 })
    const holds = session('p', 21, 'plank', [{ seconds: 40 }, { seconds: 55 }], { tracking: 'duration' }).exercises[0]!.sets
    expect(getBestSet(holds, 'duration')).toMatchObject({ durationSeconds: 55 })
    expect(getBestSet([], 'weight-reps')).toBeNull()
  })
})

describe('getExerciseRecords', () => {
  it('collects all-time bests with the session they came from', () => {
    const records = getExerciseRecords(getExerciseHistory([sep21, sep24, sep27], PRESS))
    expect(records.heaviest).toMatchObject({ weightKg: 42.5, reps: 10, sessionId: 's27' })
    expect(records.repsByWeight.map((record) => [record.weightKg, record.reps])).toEqual([
      [42.5, 10],
      [40, 12],
    ])
    expect(records.repsByWeight[1]!.sessionId).toBe('s21') // earliest achievement keeps a tie
    expect(records.mostVolume).toMatchObject({ volumeKg: 40 * 12 + 40 * 11, sessionId: 's21' }) // more sets at 40 kg beat fewer at 42.5 kg
    expect(records.bestEstimate).toMatchObject({ estimatedKg: 56.5, sessionId: 's27' })
  })

  it('has no estimate for unsuitable exercises and tracks holds for timed ones', () => {
    const lateral = getExerciseRecords(getExerciseHistory([session('l', 21, 'lateral-raise', [{ kg: 10, reps: 12 }])], 'lateral-raise'))
    expect(lateral.bestEstimate).toBeNull()
    const plank = getExerciseRecords(
      getExerciseHistory([session('a', 21, 'plank', [{ seconds: 45 }], { tracking: 'duration' }), session('b', 24, 'plank', [{ seconds: 60 }], { tracking: 'duration' })], 'plank'),
    )
    expect(plank).toMatchObject({ longestHold: { seconds: 60, sessionId: 'b' }, heaviest: null, mostVolume: null })
  })

  it('is empty without history', () => {
    expect(getExerciseRecords([])).toEqual({ heaviest: null, repsByWeight: [], mostVolume: null, bestEstimate: null, longestHold: null })
  })
})
