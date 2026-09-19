import { openDatabase } from './db'
import { createIndexedDbSessionRepository, type SessionRepository } from './sessionRepository'

/** Opens the on-device database and returns the session repository. */
export async function connectSessionRepository(): Promise<SessionRepository> {
  const db = await openDatabase()
  // Ask the browser not to evict our data under storage pressure. Best effort only.
  navigator.storage?.persist?.().catch(() => undefined)
  return createIndexedDbSessionRepository(db)
}
