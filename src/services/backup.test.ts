import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../data/settingsSchema'
import { makeSession } from '../test/fixtures'
import type { WorkoutSession } from '../types/domain'
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, createBackup, parseBackup, parseBackupJson, serializeBackup } from './backup'

const day = (date: number) => new Date(2026, 8, date, 18, 0)
const session = (id: string, date: number, end?: Date | null) =>
  makeSession({ id, start: day(date), end, exercises: [{ exerciseId: 'lat-pulldown', sets: [{ kg: 50, reps: 10, rir: 2 }] }] })

const settings = { ...DEFAULT_SETTINGS, restTimer: { defaultSeconds: 90, autoStart: false } }
const exported = new Date(2026, 8, 24, 9, 30)

function backupOf(sessions: WorkoutSession[]) {
  return createBackup({ sessions, settings, now: exported, appVersion: '0.1.0' })
}

/** A valid backup as it would arrive from a file (plain JSON, no live objects). */
const roundTrip = (sessions: WorkoutSession[]) => JSON.parse(serializeBackup(backupOf(sessions))) as Record<string, unknown>

describe('creating a backup', () => {
  it('holds the canonical data: workouts and settings, with format and version', () => {
    const backup = backupOf([session('b', 21), session('a', 14)])
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: exported.toISOString(), app: { version: '0.1.0' } })
    expect(backup.data.settings).toEqual(settings)
    expect(backup.data.sessions.map((s) => s.id)).toEqual(['a', 'b']) // oldest first
  })

  it('holds no derived statistics: those are recalculated after import', () => {
    const text = serializeBackup(backupOf([session('a', 14)]))
    expect(text).not.toMatch(/volume|streak|record|personalRecord/i)
    expect(Object.keys(backupOf([]).data)).toEqual(['sessions', 'settings'])
  })

  it('exports empty data without complaint', () => {
    const result = parseBackup(roundTrip([]))
    expect(result.ok && result.summary).toMatchObject({ workouts: 0, completed: 0, inProgress: 0, firstWorkoutAt: null })
  })

  it('names the file by date', () => {
    expect(backupFileName(new Date(2026, 8, 4))).toBe('ironlog-backup-2026-09-04.json')
  })
})

describe('validating a backup', () => {
  it('accepts a valid backup and summarises it', () => {
    const result = parseBackup(roundTrip([session('a', 14), session('b', 21), session('live', 24, null)]))
    expect(result.ok).toBe(true)
    expect(result.ok && result.summary).toMatchObject({
      workouts: 3,
      completed: 2,
      inProgress: 1,
      settingsIncluded: true,
      appVersion: '0.1.0',
      exportedAt: exported.toISOString(),
    })
    expect(result.ok && result.backup.data.sessions).toHaveLength(3)
    expect(result.ok && result.backup.data.settings.restTimer).toEqual({ defaultSeconds: 90, autoStart: false })
  })

  it('rejects text that is not JSON', () => {
    const result = parseBackupJson('{ not json')
    expect(result).toMatchObject({ ok: false })
    expect(!result.ok && result.error).toMatch(/isn’t valid JSON/)
  })

  it('rejects files that are not IronLog backups', () => {
    expect(parseBackup({ format: 'other-app', version: 1, data: {} })).toMatchObject({ ok: false })
    expect(parseBackup(null)).toMatchObject({ ok: false })
    expect(parseBackup([])).toMatchObject({ ok: false })
    expect(parseBackupJson('"just a string"')).toMatchObject({ ok: false })
  })

  it('rejects a backup from a newer version of the app', () => {
    const result = parseBackup({ ...roundTrip([]), version: BACKUP_VERSION + 1 })
    expect(!result.ok && result.error).toMatch(/newer version of IronLog/)
  })

  it('rejects missing or malformed top-level fields', () => {
    const valid = roundTrip([session('a', 14)])
    expect(parseBackup({ ...valid, version: undefined })).toMatchObject({ ok: false })
    expect(parseBackup({ ...valid, version: 'one' })).toMatchObject({ ok: false })
    expect(parseBackup({ ...valid, exportedAt: 'whenever' })).toMatchObject({ ok: false })
    expect(parseBackup({ ...valid, data: undefined })).toMatchObject({ ok: false })
    expect(parseBackup({ ...valid, data: { sessions: 'lots' } })).toMatchObject({ ok: false })
  })

  it('rejects a corrupt workout and names it, importing nothing', () => {
    const valid = roundTrip([session('good-1', 14), session('good-2', 21)])
    const data = valid.data as { sessions: unknown[] }
    data.sessions[1] = { ...(data.sessions[1] as object), startedAt: 'last tuesday' }
    const result = parseBackup(valid)
    expect(!result.ok && result.error).toMatch(/Workout 2 of 2 \(id good-2\) is not readable, so nothing was imported\./)
  })

  it('rejects invalid set values inside a workout', () => {
    const valid = roundTrip([session('a', 14)])
    const sessions = (valid.data as { sessions: { exercises: { sets: unknown[] }[] }[] }).sessions
    sessions[0]!.exercises[0]!.sets[0] = { id: 's1', weightKg: 'heavy', reps: 10, durationSeconds: null, rir: null, completedAt: null }
    expect(parseBackup(valid)).toMatchObject({ ok: false })
  })

  it('rejects duplicate workout IDs', () => {
    const twice = roundTrip([session('a', 14), session('a', 21)])
    const result = parseBackup(twice)
    expect(!result.ok && result.error).toMatch(/same workout twice \(id a\)/)
  })

  it('rejects unreadable settings rather than silently using defaults', () => {
    const valid = roundTrip([session('a', 14)])
    expect(parseBackup({ ...valid, data: { ...(valid.data as object), settings: { weightUnit: 'stones' } } })).toMatchObject({ ok: false })
    expect(parseBackup({ ...valid, data: { ...(valid.data as object), settings: { ...settings, restTimer: { defaultSeconds: 5, autoStart: true } } } })).toMatchObject({ ok: false })
  })

  it('accepts a backup without settings and falls back to defaults', () => {
    const valid = roundTrip([session('a', 14)])
    const result = parseBackup({ ...valid, data: { sessions: (valid.data as { sessions: unknown[] }).sessions } })
    expect(result.ok && result.summary.settingsIncluded).toBe(false)
    expect(result.ok && result.backup.data.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips a full export through JSON unchanged', () => {
    const original = backupOf([session('a', 14), session('live', 24, null)])
    const result = parseBackupJson(serializeBackup(original))
    expect(result.ok && result.backup.data.sessions).toEqual(original.data.sessions)
  })
})
