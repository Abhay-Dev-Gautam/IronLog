/**
 * Thin promise wrapper over IndexedDB. Only repositories use this module;
 * UI code never touches IndexedDB directly.
 */

export const DB_NAME = 'ironlog'
/** v1: sessions. v2: adds the settings store (existing sessions are untouched). */
export const DB_VERSION = 2
export const SESSIONS_STORE = 'sessions'
export const SETTINGS_STORE = 'settings'

const OPEN_TIMEOUT_MS = 5000

interface OpenOptions {
  name?: string
  /** Injectable for tests. */
  factory?: IDBFactory
  timeoutMs?: number
}

export function openDatabase({ name = DB_NAME, factory, timeoutMs = OPEN_TIMEOUT_MS }: OpenOptions = {}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = factory ?? (typeof indexedDB === 'undefined' ? undefined : indexedDB)
    if (!idb) {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }

    // Some iOS versions occasionally never answer an open request; fail visibly instead of hanging.
    const timer = setTimeout(() => reject(new Error('Opening local storage timed out.')), timeoutMs)
    const request = idb.open(name, DB_VERSION)

    // Additive upgrades only: every version creates what is missing and never
    // touches or rewrites data that is already there.
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => {
      clearTimeout(timer)
      const db = request.result
      // Let a newer version of the app (e.g. in another tab) upgrade the schema.
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => {
      clearTimeout(timer)
      reject(request.error ?? new Error('Could not open local storage.'))
    }
    request.onblocked = () => {
      clearTimeout(timer)
      reject(new Error('Local storage is blocked by another open IronLog tab.'))
    }
  })
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Storage request failed.'))
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Storage transaction failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Storage transaction was aborted.'))
  })
}
