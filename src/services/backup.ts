import { parseWorkoutSession } from '../data/sessionSchema'
import { isWellFormedSettings, parseUserSettings } from '../data/settingsSchema'
import type { UserSettings, WorkoutSession } from '../types/domain'

/**
 * JSON backups of everything IronLog stores on the device.
 *
 * Only canonical data is exported: workouts (with the snapshots they already
 * carry) and settings. Volume, records, streaks and charts are recalculated
 * after an import, so a backup can never hold stale derived numbers.
 */

export const BACKUP_FORMAT = 'ironlog-backup'
/** Bump only for a breaking change to the file layout. */
export const BACKUP_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  app: { version: string }
  data: {
    sessions: WorkoutSession[]
    settings: UserSettings
  }
}

export interface BackupSummary {
  workouts: number
  completed: number
  inProgress: number
  /** ISO timestamps of the oldest and newest workout, or null when empty. */
  firstWorkoutAt: string | null
  lastWorkoutAt: string | null
  settingsIncluded: boolean
  exportedAt: string
  appVersion: string | null
}

export type BackupParseResult =
  | { ok: true; backup: BackupFile; summary: BackupSummary }
  | { ok: false; error: string }

interface CreateBackupOptions {
  sessions: readonly WorkoutSession[]
  settings: UserSettings
  now: Date
  appVersion: string
}

export function createBackup({ sessions, settings, now, appVersion }: CreateBackupOptions): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    app: { version: appVersion },
    data: {
      // Oldest first, so the file reads chronologically.
      sessions: [...sessions].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)),
      settings,
    },
  }
}

export function serializeBackup(backup: BackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`
}

/** e.g. ironlog-backup-2026-09-24.json */
export function backupFileName(now: Date): string {
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')
  return `ironlog-backup-${date}.json`
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isTimestamp = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

function summarize(backup: BackupFile, settingsIncluded: boolean): BackupSummary {
  const times = backup.data.sessions.map((session) => Date.parse(session.startedAt)).sort((a, b) => a - b)
  const completed = backup.data.sessions.filter((session) => session.finishedAt !== null).length
  return {
    workouts: backup.data.sessions.length,
    completed,
    inProgress: backup.data.sessions.length - completed,
    firstWorkoutAt: times.length > 0 ? new Date(times[0] as number).toISOString() : null,
    lastWorkoutAt: times.length > 0 ? new Date(times.at(-1) as number).toISOString() : null,
    settingsIncluded,
    exportedAt: backup.exportedAt,
    appVersion: backup.app.version,
  }
}

/**
 * Validates a parsed backup completely before anything is imported. Any
 * problem rejects the whole file: a partial restore is never attempted.
 */
export function parseBackup(value: unknown): BackupParseResult {
  if (!isRecord(value)) return { ok: false, error: 'This file isn’t an IronLog backup.' }
  if (value.format !== BACKUP_FORMAT) return { ok: false, error: 'This file isn’t an IronLog backup.' }

  const version = value.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'This backup has no usable version number.' }
  }
  if (version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `This backup was made by a newer version of IronLog (backup version ${version}). Update IronLog, then import it.`,
    }
  }
  if (!isTimestamp(value.exportedAt)) return { ok: false, error: 'This backup has no valid export date.' }

  const app = isRecord(value.app) ? value.app : null
  const appVersion = app && typeof app.version === 'string' ? app.version : null

  const data = value.data
  if (!isRecord(data)) return { ok: false, error: 'This backup has no data section.' }
  if (!Array.isArray(data.sessions)) return { ok: false, error: 'This backup has no workout list.' }

  const sessions: WorkoutSession[] = []
  const seen = new Set<string>()
  for (const [index, record] of data.sessions.entries()) {
    const session = parseWorkoutSession(record)
    if (!session) {
      const id = isRecord(record) && typeof record.id === 'string' ? ` (id ${record.id})` : ''
      return { ok: false, error: `Workout ${index + 1} of ${data.sessions.length}${id} is not readable, so nothing was imported.` }
    }
    if (seen.has(session.id)) {
      return { ok: false, error: `This backup lists the same workout twice (id ${session.id}), so nothing was imported.` }
    }
    seen.add(session.id)
    sessions.push(session)
  }

  const hasSettings = data.settings !== undefined && data.settings !== null
  if (hasSettings && !isWellFormedSettings(data.settings)) {
    return { ok: false, error: 'The settings in this backup are not readable, so nothing was imported.' }
  }

  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    version,
    exportedAt: value.exportedAt,
    app: { version: appVersion ?? 'unknown' },
    data: { sessions, settings: parseUserSettings(hasSettings ? data.settings : undefined) },
  }
  return { ok: true, backup, summary: summarize(backup, hasSettings) }
}

/** Parses backup text, turning malformed JSON into a readable message. */
export function parseBackupJson(text: string): BackupParseResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON. Choose a backup exported from IronLog.' }
  }
  return parseBackup(value)
}
