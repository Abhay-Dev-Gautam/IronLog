import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PLAN } from '../data/defaultPlan'
import { openDatabase } from '../data/db'
import { createIndexedDbSessionRepository, type SessionRepository } from '../data/sessionRepository'
import type { WorkoutSession } from '../types/domain'
import { findWorkoutDay, resolveWorkoutDay } from './plan'
import { summarizeSession } from './sessionStats'
import { createSessionStore, type SessionStore } from './sessionStore'
import { completeSet, createSession, setExerciseNotes, updateSetValues } from './workoutSession'

const START = new Date(2026, 8, 21, 18, 0)
let factory: IDBFactory
const openDbs: IDBDatabase[] = []

async function connect(): Promise<SessionRepository> {
  const db = await openDatabase({ factory })
  openDbs.push(db)
  return createIndexedDbSessionRepository(db)
}

/** A store as the app has it after launch. A second call simulates a page refresh. */
async function launchStore(): Promise<SessionStore> {
  const store = createSessionStore()
  await store.init(connect)
  return store
}

let idCounter = 0
function newSession(dayId = 'upper-a', now = START): WorkoutSession {
  const day = findWorkoutDay(DEFAULT_PLAN, dayId)!
  return createSession({ plan: DEFAULT_PLAN, workout: resolveWorkoutDay(DEFAULT_PLAN, day), now, createId: () => `id-${++idCounter}` })
}

function logFirstSet(session: WorkoutSession): WorkoutSession {
  const exercise = session.exercises[0]!
  return completeSet(session, exercise.id, exercise.sets[0]!.id, { weightKg: 60, reps: 10, durationSeconds: null, rir: 3 }, START)
}

beforeEach(() => {
  factory = new IDBFactory()
})

afterEach(() => {
  openDbs.splice(0).forEach((db) => db.close())
  vi.restoreAllMocks()
})

describe('session store lifecycle', () => {
  it('starts empty and ready', async () => {
    const store = await launchStore()
    expect(store.getState()).toMatchObject({ status: 'ready', active: null, history: [], all: [] })
  })

  it('starts a session and persists it immediately', async () => {
    const store = await launchStore()
    const session = store.start(newSession())
    expect(store.getState().active).toBe(session)
    await store.flush()
    expect(await (await connect()).get(session.id)).toEqual(session)
  })

  it('only allows one workout in progress at a time', async () => {
    const store = await launchStore()
    const first = store.start(newSession())
    expect(store.start(newSession('push'))).toBe(first)
    expect(store.getState().all).toHaveLength(1)
  })

  it('auto-saves every modification', async () => {
    const store = await launchStore()
    const session = store.start(newSession())
    const exercise = session.exercises[0]!
    store.updateActive((s) => updateSetValues(s, exercise.id, exercise.sets[0]!.id, { weightKg: 57.5 }))
    store.updateActive((s) => setExerciseNotes(s, exercise.id, 'Used machine instead of dumbbells'))
    await store.flush()

    const saved = await (await connect()).get(session.id)
    expect(saved?.exercises[0]).toMatchObject({ notes: 'Used machine instead of dumbbells' })
    expect(saved?.exercises[0]!.sets[0]!.weightKg).toBe(57.5)
  })

  it('resumes an in-progress workout after a refresh, with its logged sets', async () => {
    const before = await launchStore()
    const session = before.start(newSession())
    before.updateActive(logFirstSet)
    await before.flush()

    const after = await launchStore() // e.g. the page was reloaded
    const resumed = after.getState().active
    expect(resumed?.id).toBe(session.id)
    expect(resumed && summarizeSession(resumed)).toMatchObject({ completedSets: 1, volumeKg: 600 })
  })

  it('completes a workout: moves it to history and persists the end time', async () => {
    const store = await launchStore()
    store.start(newSession())
    store.updateActive(logFirstSet)
    const finished = store.finishActive(new Date(START.getTime() + 52 * 60_000))
    await store.flush()

    expect(store.getState()).toMatchObject({ active: null, history: [finished] })
    expect(summarizeSession(finished!).durationMs).toBe(52 * 60_000)

    const relaunched = await launchStore()
    expect(relaunched.getState().active).toBeNull()
    expect(relaunched.getState().history.map((s) => s.id)).toEqual([finished!.id])
  })

  it('discards the active workout only when asked, deleting it from storage', async () => {
    const store = await launchStore()
    const session = store.start(newSession())
    store.discardActive()
    await store.flush()
    expect(store.getState().active).toBeNull()
    expect(await (await connect()).get(session.id)).toBeNull()
  })

  it('updates a finished session (e.g. its workout note)', async () => {
    const store = await launchStore()
    store.start(newSession())
    const finished = store.finishActive(START)!
    store.update(finished.id, (s) => ({ ...s, notes: 'Increase weight next time' }))
    await store.flush()
    expect((await (await connect()).get(finished.id))?.notes).toBe('Increase weight next time')
  })

  it('orders history newest first after loading', async () => {
    const repository = await connect()
    const older = { ...newSession('push', new Date(2026, 8, 16, 18, 0)), finishedAt: '2026-09-16T13:30:00.000Z' }
    const newer = { ...newSession('pull', new Date(2026, 8, 17, 18, 0)), finishedAt: '2026-09-17T13:30:00.000Z' }
    await repository.save(older)
    await repository.save(newer)
    const store = await launchStore()
    expect(store.getState().history.map((s) => s.workoutDayId)).toEqual(['pull', 'push'])
  })
})

describe('storage failures', () => {
  it('keeps working in memory and reports why when storage cannot open', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = createSessionStore()
    await store.init(() => Promise.reject(new Error('IndexedDB is not available in this browser.')))
    expect(store.getState()).toMatchObject({ status: 'unavailable', storageError: 'IndexedDB is not available in this browser.' })
    const session = store.start(newSession())
    expect(store.getState().active).toBe(session)
  })

  it('flags a failed write and retries it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const real = await connect()
    let failNext = true
    const flaky: SessionRepository = {
      ...real,
      save: (session) => (failNext ? ((failNext = false), Promise.reject(new Error('QuotaExceededError'))) : real.save(session)),
    }
    const store = createSessionStore()
    await store.init(async () => flaky)

    const session = store.start(newSession())
    await store.flush()
    expect(store.getState().saveFailed).toBe(true)

    store.retryFailedWrites()
    await store.flush()
    expect(store.getState().saveFailed).toBe(false)
    expect(await real.get(session.id)).toEqual(session)
  })
})
