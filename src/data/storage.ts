import type { UserSettings, WorkoutSession } from '../types/domain'
import { openDatabase, SESSIONS_STORE, SETTINGS_STORE, transactionDone } from './db'
import { createIndexedDbSessionRepository, type SessionRepository } from './sessionRepository'
import { createIndexedDbSettingsRepository, SETTINGS_KEY, type SettingsRepository } from './settingsRepository'

/**
 * The app's storage, opened once and shared by every store. Whole-database
 * operations (restoring a backup, clearing everything) live here because
 * they must span both object stores in a single transaction.
 */
export interface AppStorage {
  sessions: SessionRepository
  settings: SettingsRepository
  /**
   * Replaces everything in one transaction: either the whole backup is
   * restored or nothing changes.
   */
  replaceAll(data: { sessions: readonly WorkoutSession[]; settings: UserSettings | null }): Promise<void>
  /** Deletes all workouts and settings. */
  clearAll(): Promise<void>
}

const WRITE_OPTIONS: IDBTransactionOptions = { durability: 'strict' }

export function createAppStorage(db: IDBDatabase): AppStorage {
  return {
    sessions: createIndexedDbSessionRepository(db),
    settings: createIndexedDbSettingsRepository(db),

    async replaceAll({ sessions, settings }) {
      const transaction = db.transaction([SESSIONS_STORE, SETTINGS_STORE], 'readwrite', WRITE_OPTIONS)
      const done = transactionDone(transaction)
      try {
        const sessionStore = transaction.objectStore(SESSIONS_STORE)
        sessionStore.clear()
        for (const session of sessions) sessionStore.put(session)
        if (settings) transaction.objectStore(SETTINGS_STORE).put({ key: SETTINGS_KEY, settings })
      } catch (error) {
        // A rejected write (e.g. an unstorable value) must not leave the
        // already-queued clear() to commit on its own.
        transaction.abort()
        await done.catch(() => undefined)
        throw error
      }
      await done
    },

    async clearAll() {
      const transaction = db.transaction([SESSIONS_STORE, SETTINGS_STORE], 'readwrite', WRITE_OPTIONS)
      transaction.objectStore(SESSIONS_STORE).clear()
      transaction.objectStore(SETTINGS_STORE).clear()
      await transactionDone(transaction)
    },
  }
}

let connection: Promise<AppStorage> | null = null

/** Opens the on-device database once; later calls share the same connection. */
export function connectStorage(): Promise<AppStorage> {
  connection ??= openDatabase().then((db) => {
    // Ask the browser not to evict our data under storage pressure. Best effort only.
    navigator.storage?.persist?.().catch(() => undefined)
    return createAppStorage(db)
  })
  return connection
}

export async function connectSessionRepository(): Promise<SessionRepository> {
  return (await connectStorage()).sessions
}

export async function connectSettingsRepository(): Promise<SettingsRepository> {
  return (await connectStorage()).settings
}
