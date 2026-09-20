import { connectStorage } from '../data/storage'
import { now } from '../utils/clock'
import { backupFileName, createBackup, serializeBackup, type BackupFile } from './backup'
import { sessionStore } from './sessionStore'
import { settingsStore } from './settingsStore'

/** Everything currently on the device, as a backup file. */
export function buildBackupFile(): { fileName: string; text: string } {
  const at = now()
  const backup = createBackup({
    sessions: sessionStore.getState().all,
    settings: settingsStore.getSettings(),
    now: at,
    appVersion: __APP_VERSION__,
  })
  return { fileName: backupFileName(at), text: serializeBackup(backup) }
}

/** Saves the backup through the browser's normal download/share sheet. */
export function downloadBackup(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give Safari a moment to start the download before the blob goes away.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Restores a validated backup, replacing what is stored now. The write is a
 * single transaction, and the app reloads afterwards so every screen and
 * derived figure is rebuilt from the restored data.
 */
export async function applyBackup(backup: BackupFile): Promise<void> {
  const storage = await connectStorage()
  await storage.replaceAll({ sessions: backup.data.sessions, settings: backup.data.settings })
  window.location.reload()
}

/** Deletes every workout and setting on this device. */
export async function clearAllData(): Promise<void> {
  const storage = await connectStorage()
  await storage.clearAll()
  window.location.reload()
}
