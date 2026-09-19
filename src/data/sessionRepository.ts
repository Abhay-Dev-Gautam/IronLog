import type { SessionId, WorkoutSession } from '../types/domain'
import { requestResult, SESSIONS_STORE, transactionDone } from './db'
import { parseWorkoutSession } from './sessionSchema'

/** Storage boundary for workout sessions. The app talks to this, never to IndexedDB. */
export interface SessionRepository {
  /** All readable sessions. Corrupt records are skipped (and left untouched in storage). */
  list(): Promise<WorkoutSession[]>
  get(id: SessionId): Promise<WorkoutSession | null>
  /** Inserts or replaces a session. */
  save(session: WorkoutSession): Promise<void>
  delete(id: SessionId): Promise<void>
}

// Ask the browser to flush to disk before reporting success.
const WRITE_OPTIONS: IDBTransactionOptions = { durability: 'strict' }

export function createIndexedDbSessionRepository(db: IDBDatabase): SessionRepository {
  return {
    async list() {
      const store = db.transaction(SESSIONS_STORE, 'readonly').objectStore(SESSIONS_STORE)
      const records: unknown[] = await requestResult(store.getAll())
      const sessions: WorkoutSession[] = []
      for (const record of records) {
        const session = parseWorkoutSession(record)
        if (session) {
          sessions.push(session)
        } else {
          console.warn('[IronLog] Skipping unreadable session record', record)
        }
      }
      return sessions
    },

    async get(id) {
      const store = db.transaction(SESSIONS_STORE, 'readonly').objectStore(SESSIONS_STORE)
      const record: unknown = await requestResult(store.get(id))
      return record === undefined ? null : parseWorkoutSession(record)
    },

    async save(session) {
      const transaction = db.transaction(SESSIONS_STORE, 'readwrite', WRITE_OPTIONS)
      transaction.objectStore(SESSIONS_STORE).put(session)
      await transactionDone(transaction)
    },

    async delete(id) {
      const transaction = db.transaction(SESSIONS_STORE, 'readwrite', WRITE_OPTIONS)
      transaction.objectStore(SESSIONS_STORE).delete(id)
      await transactionDone(transaction)
    },
  }
}
