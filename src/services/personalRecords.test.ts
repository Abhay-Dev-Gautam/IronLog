import { describe, expect, it } from 'vitest'
import { makeSession, type SetInput } from '../test/fixtures'
import { buildRecordTimeline, estimateOneRepMax, findSessionRecords, volumeOf } from './personalRecords'

const day = (date: number) => new Date(2026, 8, date, 18, 0)
const press = (id: string, date: number, sets: SetInput[], exerciseId = 'flat-chest-press-machine') =>
  makeSession({ id, start: day(date), exercises: [{ exerciseId, sets }] })

describe('estimateOneRepMax', () => {
  it('uses Epley, rounded to 0.5 kg, and returns the load itself for a single', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(60, 10)).toBe(80)
    expect(estimateOneRepMax(62.5, 8)).toBe(79)
  })
})

describe('findSessionRecords', () => {
  it('reports nothing the first time an exercise is logged (that is a baseline)', () => {
    expect(findSessionRecords(press('now', 21, [{ kg: 60, reps: 10 }]), [])).toEqual([])
  })

  it('reports a heaviest-weight record with the reps actually lifted', () => {
    const history = [press('old', 14, [{ kg: 60, reps: 10 }])]
    const records = findSessionRecords(press('now', 21, [{ kg: 62.5, reps: 8 }]), history)
    expect(records).toContainEqual(expect.objectContaining({ kind: 'heaviest-weight', weightKg: 62.5, reps: 8 }))
  })

  it('reports more reps at a weight used before', () => {
    const history = [press('old', 14, [{ kg: 60, reps: 10 }])]
    const records = findSessionRecords(press('now', 21, [{ kg: 60, reps: 12 }]), history)
    expect(records).toContainEqual(expect.objectContaining({ kind: 'most-reps-at-weight', weightKg: 60, reps: 12 }))
  })

  it('reports an estimated 1RM separately, flagged by kind, with the set it came from', () => {
    const history = [press('old', 14, [{ kg: 60, reps: 10 }])]
    const records = findSessionRecords(press('now', 21, [{ kg: 60, reps: 12 }]), history)
    expect(records).toContainEqual(
      expect.objectContaining({ kind: 'estimated-1rm', estimatedKg: 84, basedOn: { weightKg: 60, reps: 12 } }),
    )
  })

  it('skips estimates for exercises where they are not meaningful', () => {
    const history = [press('old', 14, [{ kg: 20, reps: 12 }], 'lateral-raise')]
    const records = findSessionRecords(press('now', 21, [{ kg: 22.5, reps: 12 }], 'lateral-raise'), history)
    expect(records.map((record) => record.kind)).toEqual(['heaviest-weight', 'most-volume'])
  })

  it('does not estimate from high-rep sets', () => {
    const history = [press('old', 14, [{ kg: 60, reps: 12 }])]
    const records = findSessionRecords(press('now', 21, [{ kg: 60, reps: 20 }]), history)
    expect(records.map((record) => record.kind)).toEqual(['most-reps-at-weight', 'most-volume'])
  })

  it('reports nothing when performance only matches or trails history', () => {
    const history = [press('old', 14, [{ kg: 60, reps: 10 }])]
    expect(findSessionRecords(press('now', 21, [{ kg: 60, reps: 10 }]), history)).toEqual([])
    expect(findSessionRecords(press('now', 21, [{ kg: 55, reps: 10 }]), history)).toEqual([])
  })

  it('ignores incomplete sets and sessions after this one', () => {
    const later = press('later', 28, [{ kg: 50, reps: 5 }])
    const earlier = press('old', 14, [{ kg: 50, reps: 5 }])
    const now = press('now', 21, [{ kg: 70, reps: 10, done: false }, { kg: 55, reps: 5 }])
    expect(findSessionRecords(now, [earlier, later]).map((record) => record.kind)).toEqual(['heaviest-weight', 'estimated-1rm', 'most-volume'])
    expect(findSessionRecords(now, [later])).toEqual([])
  })

  it('reports the longest hold for timed exercises', () => {
    const plank = (id: string, date: number, seconds: number) =>
      makeSession({ id, start: day(date), exercises: [{ exerciseId: 'plank', tracking: 'duration', sets: [{ seconds }] }] })
    expect(findSessionRecords(plank('now', 21, 65), [plank('old', 14, 60)])).toEqual([
      expect.objectContaining({ kind: 'longest-duration', durationSeconds: 65 }),
    ])
  })
})

describe('most volume in a session', () => {
  it('is a record when an exercise moves more total load than in any earlier session', () => {
    const history = [press('old', 14, [{ kg: 60, reps: 10 }, { kg: 60, reps: 9 }])]
    const records = findSessionRecords(press('now', 21, [{ kg: 60, reps: 10 }, { kg: 60, reps: 9 }, { kg: 60, reps: 8 }]), history)
    expect(records).toEqual([expect.objectContaining({ kind: 'most-volume', volumeKg: 60 * 27 })])
  })

  it('never comes from bodyweight or incomplete sets', () => {
    const history = [press('old', 14, [{ kg: 0, reps: 12 }], 'cable-crunch')]
    const bodyweight = findSessionRecords(press('now', 21, [{ kg: 0, reps: 15 }], 'cable-crunch'), history)
    expect(bodyweight.map((record) => record.kind)).toEqual(['most-reps-at-weight'])
    expect(volumeOf(press('x', 21, [{ kg: 80, reps: 10, done: false }]).exercises[0]!.sets.filter((set) => set.completedAt))).toBe(0)
  })
})

describe('buildRecordTimeline', () => {
  const sessions = [
    press('s1', 7, [{ kg: 50, reps: 10 }]),
    press('s2', 14, [{ kg: 52.5, reps: 8 }]),
    press('s3', 21, [{ kg: 52.5, reps: 10 }]),
    makeSession({ id: 'live', start: day(22), end: null, exercises: [{ exerciseId: 'flat-chest-press-machine', sets: [{ kg: 90, reps: 10 }] }] }),
  ]

  it('lists every record oldest first, never from the baseline session or unfinished workouts', () => {
    const timeline = buildRecordTimeline(sessions)
    expect(timeline.map((record) => [record.sessionId, record.kind])).toEqual([
      ['s2', 'heaviest-weight'], // no estimate record: 52.5 × 8 ties 50 × 10 at 66.5 kg, and a tie isn't a record
      ['s3', 'most-reps-at-weight'],
      ['s3', 'estimated-1rm'],
      ['s3', 'most-volume'],
    ])
  })

  it('agrees exactly with the per-session records shown on each summary', () => {
    const finished = sessions.filter((session) => session.finishedAt)
    const perSession = finished.flatMap((session) => findSessionRecords(session, finished))
    expect(buildRecordTimeline(sessions)).toEqual(perSession)
  })

  it('handles an exercise logged on different workout days as one history', () => {
    const monday = makeSession({ id: 'mon', dayId: 'upper-a', start: day(21), exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 50, reps: 10 }] }] })
    const thursday = makeSession({ id: 'thu', dayId: 'pull', start: day(24), exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 55, reps: 8 }] }] })
    expect(buildRecordTimeline([monday, thursday]).map((record) => record.kind)).toContain('heaviest-weight')
  })
})
