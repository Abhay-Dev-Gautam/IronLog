import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSession } from '../test/fixtures'
import type { UserSettings } from '../types/domain'
import { openDatabase, SESSIONS_STORE, SETTINGS_STORE } from './db'
import { createAppStorage, type AppStorage } from './storage'
import { DEFAULT_SETTINGS, isWellFormedSettings, parseUserSettings } from './settingsSchema'

let factory: IDBFactory
let db: IDBDatabase
let storage: AppStorage

const session = (id: string, date: number) =>
  makeSession({ id, start: new Date(2026, 8, date, 18, 0), exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 50, reps: 10 }] }] })
const settings: UserSettings = { weightUnit: 'kg', theme: 'dark', restTimer: { defaultSeconds: 90, autoStart: false } }

beforeEach(async () => {
  factory = new IDBFactory()
  db = await openDatabase({ factory })
  storage = createAppStorage(db)
})

afterEach(() => {
  db.close()
  vi.restoreAllMocks()
})

describe('settings storage', () => {
  it('has nothing stored until settings are saved', async () => {
    expect(await storage.settings.load()).toBeNull()
  })

  it('saves and reloads settings', async () => {
    await storage.settings.save(settings)
    expect(await storage.settings.load()).toEqual(settings)
  })

  it('keeps one settings record, not one per save', async () => {
    await storage.settings.save(settings)
    await storage.settings.save({ ...settings, restTimer: { defaultSeconds: 180, autoStart: true } })
    const count = await new Promise((resolve) => {
      const request = db.transaction(SETTINGS_STORE).objectStore(SETTINGS_STORE).count()
      request.onsuccess = () => resolve(request.result)
    })
    expect(count).toBe(1)
    expect((await storage.settings.load())?.restTimer.defaultSeconds).toBe(180)
  })

  it('falls back to defaults for a damaged settings record', async () => {
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite')
    transaction.objectStore(SETTINGS_STORE).put({ key: 'user', settings: { weightUnit: 'stones', restTimer: 'soon' } })
    await new Promise((resolve) => (transaction.oncomplete = resolve))
    expect(await storage.settings.load()).toEqual(DEFAULT_SETTINGS)
  })
})

describe('upgrading a Phase 1–3 database', () => {
  it('adds the settings store and keeps existing workouts', async () => {
    const old = new IDBFactory()
    // A v1 database exactly as earlier phases created it.
    const v1 = await new Promise<IDBDatabase>((resolve) => {
      const request = old.open('ironlog', 1)
      request.onupgradeneeded = () => request.result.createObjectStore(SESSIONS_STORE, { keyPath: 'id' })
      request.onsuccess = () => resolve(request.result)
    })
    const write = v1.transaction(SESSIONS_STORE, 'readwrite')
    write.objectStore(SESSIONS_STORE).put(session('existing', 14))
    await new Promise((resolve) => (write.oncomplete = resolve))
    v1.close()

    const upgraded = await openDatabase({ factory: old })
    expect(upgraded.version).toBe(2)
    expect([...upgraded.objectStoreNames]).toContain(SETTINGS_STORE)
    const upgradedStorage = createAppStorage(upgraded)
    expect((await upgradedStorage.sessions.list()).map((s) => s.id)).toEqual(['existing'])
    expect(await upgradedStorage.settings.load()).toBeNull()
    upgraded.close()
  })
})

describe('whole-database operations', () => {
  it('replaces everything in one transaction', async () => {
    await storage.sessions.save(session('old-1', 1))
    await storage.sessions.save(session('old-2', 2))
    await storage.settings.save(DEFAULT_SETTINGS)

    await storage.replaceAll({ sessions: [session('new-1', 20), session('new-2', 21)], settings })

    expect((await storage.sessions.list()).map((s) => s.id).sort()).toEqual(['new-1', 'new-2'])
    expect(await storage.settings.load()).toEqual(settings)
  })

  it('changes nothing when a write inside the restore fails', async () => {
    await storage.sessions.save(session('original', 1))
    const broken = { ...session('bad', 2), notes: (() => 'functions cannot be stored') as unknown as string }

    const failure = await storage.replaceAll({ sessions: [broken], settings }).then(() => null, (error: unknown) => error)
    expect(failure).toBeInstanceOf(Error)
    expect((await storage.sessions.list()).map((s) => s.id)).toEqual(['original'])
    expect(await storage.settings.load()).toBeNull()
  })

  it('clears every store', async () => {
    await storage.sessions.save(session('a', 1))
    await storage.settings.save(settings)
    await storage.clearAll()
    expect(await storage.sessions.list()).toEqual([])
    expect(await storage.settings.load()).toBeNull()
  })
})

describe('parseUserSettings', () => {
  it('fills in defaults for missing or invalid fields', () => {
    expect(parseUserSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseUserSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(parseUserSettings({ weightUnit: 'lb', theme: 'neon', restTimer: { defaultSeconds: 5, autoStart: 'yes' } })).toEqual(DEFAULT_SETTINGS)
    expect(parseUserSettings({ ...DEFAULT_SETTINGS, restTimer: { defaultSeconds: 90, autoStart: false } }).restTimer).toEqual({
      defaultSeconds: 90,
      autoStart: false,
    })
  })

  it('accepts only complete settings when validating a backup', () => {
    expect(isWellFormedSettings(settings)).toBe(true)
    expect(isWellFormedSettings({ ...settings, restTimer: { defaultSeconds: 90 } })).toBe(false)
    expect(isWellFormedSettings({ ...settings, restTimer: { defaultSeconds: 5000, autoStart: true } })).toBe(false)
    expect(isWellFormedSettings(null)).toBe(false)
  })
})
