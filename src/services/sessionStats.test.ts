import { describe, expect, it } from 'vitest'
import { makeSession } from '../test/fixtures'
import {
  getActiveSession,
  getCompletedSessions,
  getLastFinishedSession,
  getPreviousPerformance,
  getWorkoutStatusForDate,
  summarizeSession,
} from './sessionStats'

const mondayMorning = new Date(2026, 8, 21, 7, 0)

describe('summarizeSession', () => {
  it('counts completed sets, trained vs fully completed exercises, and volume', () => {
    const session = makeSession({
      id: 's1',
      start: mondayMorning,
      end: new Date(2026, 8, 21, 7, 52),
      exercises: [
        { exerciseId: 'press', sets: [{ kg: 60, reps: 10 }, { kg: 60, reps: 9 }] },
        { exerciseId: 'row', sets: [{ kg: 50, reps: 12 }, { kg: 50, reps: 12, done: false }] },
        { exerciseId: 'curl', sets: [{ kg: 12, reps: 12, done: false }] },
      ],
    })

    expect(summarizeSession(session)).toEqual({
      durationMs: 52 * 60_000,
      completedSets: 3,
      totalSets: 5,
      totalExercises: 3,
      exercisesTrained: 2,
      exercisesCompleted: 1,
      volumeKg: 60 * 10 + 60 * 9 + 50 * 12,
    })
  })

  it('adds no volume for timed or unloaded sets', () => {
    const session = makeSession({
      id: 's1',
      start: mondayMorning,
      exercises: [
        { exerciseId: 'plank', tracking: 'duration', sets: [{ seconds: 45 }] },
        { exerciseId: 'crunch', sets: [{ kg: null, reps: 15 }] },
      ],
    })
    expect(summarizeSession(session)).toMatchObject({ completedSets: 2, volumeKg: 0 })
  })

  it('has no duration while the session is in progress', () => {
    const session = makeSession({ id: 's1', start: mondayMorning, end: null, exercises: [] })
    expect(summarizeSession(session).durationMs).toBeNull()
  })
})

describe('getWorkoutStatusForDate', () => {
  it('is not started when no session exists, using the planned set count', () => {
    expect(getWorkoutStatusForDate([], 'upper-a', '2026-09-21', 14)).toEqual({
      state: 'not-started',
      progress: { completedSets: 0, totalSets: 14, percent: 0 },
    })
  })

  it('reports progress of an in-progress session from its own sets', () => {
    const session = makeSession({
      id: 's1',
      start: mondayMorning,
      end: null,
      exercises: [{ exerciseId: 'press', sets: [{ kg: 60, reps: 10 }, { done: false }, { done: false }] }],
    })
    const status = getWorkoutStatusForDate([session], 'upper-a', '2026-09-21', 14)
    expect(status.state).toBe('in-progress')
    expect(status.progress).toEqual({ completedSets: 1, totalSets: 3, percent: 33 })
  })

  it('is complete once the session is finished, with a summary', () => {
    const session = makeSession({ id: 's1', start: mondayMorning, exercises: [{ exerciseId: 'press', sets: [{ kg: 60, reps: 10 }] }] })
    const status = getWorkoutStatusForDate([session], 'upper-a', '2026-09-21', 14)
    expect(status.state).toBe('complete')
    expect(status.state === 'complete' && status.summary.volumeKg).toBe(600)
  })

  it('ignores sessions from other days or other workouts', () => {
    const tuesday = makeSession({ id: 's1', start: new Date(2026, 8, 22, 7, 0), exercises: [] })
    const otherWorkout = makeSession({ id: 's2', dayId: 'push', start: mondayMorning, exercises: [] })
    expect(getWorkoutStatusForDate([tuesday, otherWorkout], 'upper-a', '2026-09-21', 14).state).toBe('not-started')
  })

  it('uses the latest session when the workout was started twice in a day', () => {
    const abandoned = makeSession({ id: 'old', start: mondayMorning, end: null, exercises: [] })
    const finished = makeSession({ id: 'new', start: new Date(2026, 8, 21, 18, 0), exercises: [] })
    const status = getWorkoutStatusForDate([finished, abandoned], 'upper-a', '2026-09-21', 14)
    expect(status.state === 'complete' && status.session.id).toBe('new')
  })
})

describe('getLastFinishedSession', () => {
  it('returns the most recent finished session and ignores in-progress ones', () => {
    const older = makeSession({ id: 'older', start: new Date(2026, 8, 17, 7, 0), exercises: [] })
    const newer = makeSession({ id: 'newer', start: new Date(2026, 8, 18, 7, 0), exercises: [] })
    const inProgress = makeSession({ id: 'live', start: mondayMorning, end: null, exercises: [] })
    expect(getLastFinishedSession([older, inProgress, newer])?.id).toBe('newer')
    expect(getLastFinishedSession([])).toBeNull()
  })
})

describe('getPreviousPerformance', () => {
  const monday = makeSession({
    id: 'mon',
    start: new Date(2026, 8, 14, 7, 0),
    exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 50, reps: 10 }, { kg: 50, reps: 9 }, { kg: 50, reps: 8, done: false }] }],
  })
  const thursday = makeSession({
    id: 'thu',
    dayId: 'pull',
    start: new Date(2026, 8, 17, 7, 0),
    exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 52.5, reps: 10 }] }],
  })

  it('finds the most recent session with completed sets, across workout days', () => {
    const previous = getPreviousPerformance([monday, thursday], 'lat-pulldown')
    expect(previous?.sessionId).toBe('thu')
    expect(previous?.sets.map((set) => set.weightKg)).toEqual([52.5])
  })

  it('returns only completed sets', () => {
    expect(getPreviousPerformance([monday], 'lat-pulldown')?.sets).toHaveLength(2)
  })

  it('can exclude the current session and skips sessions without the exercise', () => {
    const skipped = makeSession({
      id: 'skipped',
      start: new Date(2026, 8, 18, 7, 0),
      exercises: [{ exerciseId: 'lat-pulldown', sets: [{ done: false }] }],
    })
    expect(getPreviousPerformance([monday, thursday, skipped], 'lat-pulldown', 'thu')?.sessionId).toBe('mon')
    expect(getPreviousPerformance([monday], 'hammer-curl')).toBeNull()
  })

  it('ignores unfinished sessions', () => {
    const live = makeSession({ id: 'live', start: mondayMorning, end: null, exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 60, reps: 8 }] }] })
    expect(getPreviousPerformance([monday, live], 'lat-pulldown')?.sessionId).toBe('mon')
  })
})

describe('active and completed session selectors', () => {
  const finishedOld = makeSession({ id: 'old', start: new Date(2026, 8, 14, 7, 0), exercises: [] })
  const finishedNew = makeSession({ id: 'new', start: new Date(2026, 8, 18, 7, 0), exercises: [] })
  const active = makeSession({ id: 'live', start: mondayMorning, end: null, exercises: [] })

  it('retrieves the active (unfinished) session', () => {
    expect(getActiveSession([finishedOld, active, finishedNew])?.id).toBe('live')
    expect(getActiveSession([finishedOld, finishedNew])).toBeNull()
  })

  it('prefers the newest unfinished session if several exist', () => {
    const olderActive = makeSession({ id: 'stale', start: new Date(2026, 8, 20, 7, 0), end: null, exercises: [] })
    expect(getActiveSession([olderActive, active])?.id).toBe('live')
  })

  it('retrieves completed sessions, newest first', () => {
    expect(getCompletedSessions([finishedOld, active, finishedNew]).map((session) => session.id)).toEqual(['new', 'old'])
  })
})
