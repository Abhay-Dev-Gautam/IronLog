import type { UserSettings } from '../types/domain'
import { requestResult, SETTINGS_STORE, transactionDone } from './db'
import { parseUserSettings } from './settingsSchema'

/** The single settings record's key. */
export const SETTINGS_KEY = 'user'

export interface SettingsRepository {
  /** Stored settings, or `null` when nothing has been saved yet. */
  load(): Promise<UserSettings | null>
  save(settings: UserSettings): Promise<void>
}

const WRITE_OPTIONS: IDBTransactionOptions = { durability: 'strict' }

export function createIndexedDbSettingsRepository(db: IDBDatabase): SettingsRepository {
  return {
    async load() {
      const store = db.transaction(SETTINGS_STORE, 'readonly').objectStore(SETTINGS_STORE)
      const record: unknown = await requestResult(store.get(SETTINGS_KEY))
      if (record === undefined || typeof record !== 'object' || record === null) return null
      return parseUserSettings((record as { settings?: unknown }).settings)
    },

    async save(settings) {
      const transaction = db.transaction(SETTINGS_STORE, 'readwrite', WRITE_OPTIONS)
      transaction.objectStore(SETTINGS_STORE).put({ key: SETTINGS_KEY, settings })
      await transactionDone(transaction)
    },
  }
}
