import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSession } from '../test/fixtures'
import { openDatabase, SESSIONS_STORE } from './db'
import { createIndexedDbSessionRepository, type SessionRepository } from './sessionRepository'
import { parseWorkoutSession } from './sessionSchema'

let factory: IDBFactory
let db: IDBDatabase
let repository: SessionRepository

const session = (id: string, date: number, end?: Date | null) =>
  makeSession({ id, start: new Date(2026, 8, date, 18, 0), end, exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 50, reps: 10 }] }] })

beforeEach(async () => {
  factory = new IDBFactory() // a fresh, isolated database per test
  db = await openDatabase({ factory })
  repository = createIndexedDbSessionRepository(db)
})

afterEach(() => {
  db.close()
  vi.restoreAllMocks()
})

describe('IndexedDB session repository', () => {
  it('saves and loads a session unchanged', async () => {
    const saved = session('a', 21)
    await repository.save(saved)
    expect(await repository.get('a')).toEqual(saved)
    expect(await repository.list()).toEqual([saved])
  })

  it('updates a session in place', async () => {
    await repository.save(session('a', 21, null))
    const updated = { ...session('a', 21, null), notes: 'Felt strong today' }
    await repository.save(updated)
    expect(await repository.list()).toEqual([updated])
  })

  it('deletes a session', async () => {
    await repository.save(session('a', 21))
    await repository.delete('a')
    expect(await repository.get('a')).toBeNull()
    expect(await repository.list()).toEqual([])
  })

  it('persists across connections (browser or app restart)', async () => {
    await repository.save(session('a', 21))
    db.close()
    db = await openDatabase({ factory })
    expect(await createIndexedDbSessionRepository(db).get('a')).toMatchObject({ id: 'a' })
  })

  it('skips corrupt records without deleting them', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await repository.save(session('good', 21))
    const tx = db.transaction(SESSIONS_STORE, 'readwrite')
    tx.objectStore(SESSIONS_STORE).put({ id: 'broken', startedAt: 'not a date' })
    await new Promise((resolve) => (tx.oncomplete = resolve))

    expect((await repository.list()).map((s) => s.id)).toEqual(['good'])
    const raw = await new Promise((resolve) => {
      const request = db.transaction(SESSIONS_STORE).objectStore(SESSIONS_STORE).count()
      request.onsuccess = () => resolve(request.result)
    })
    expect(raw).toBe(2)
  })

  it('fails with a clear error when IndexedDB is unavailable', async () => {
    await expect(openDatabase({ factory: undefined, name: 'x' }).catch((error: Error) => error.message)).resolves.toMatch(
      /not available/,
    )
  })
})

describe('parseWorkoutSession', () => {
  it('accepts a valid session', () => {
    const valid = session('a', 21)
    expect(parseWorkoutSession(JSON.parse(JSON.stringify(valid)))).toEqual(valid)
  })

  it('rejects malformed sessions', () => {
    const valid = session('a', 21)
    expect(parseWorkoutSession(null)).toBeNull()
    expect(parseWorkoutSession({ ...valid, startedAt: 'yesterday' })).toBeNull()
    expect(parseWorkoutSession({ ...valid, exercises: 'none' })).toBeNull()
    expect(parseWorkoutSession({ ...valid, exercises: [{ ...valid.exercises[0], sets: [{ id: 's', weightKg: '50' }] }] })).toBeNull()
    expect(parseWorkoutSession({ ...valid, exercises: [{ ...valid.exercises[0], tracking: 'laps' }] })).toBeNull()
  })
})
