import { useRef, useState, type ChangeEvent } from 'react'
import { paths } from '../../app/routes'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { LogoMark } from '../../components/LogoMark'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { Switch } from '../../components/Switch'
import { REST_PRESETS_SECONDS } from '../../services/restTimer'
import { usePlan, useSessionState, useSettings } from '../../hooks/useProgram'
import { applyBackup, buildBackupFile, clearAllData, downloadBackup } from '../../services/backupActions'
import { parseBackupJson, type BackupFile, type BackupSummary } from '../../services/backup'
import { setAutoStartRest, setDefaultRestSeconds } from '../../services/settingsStore'
import { formatClock, formatShortDate, pluralize } from '../../utils/format'
import styles from './SettingsScreen.module.css'

/** Rest presets plus a couple of longer options for heavy compound work. */
const REST_OPTIONS = [...REST_PRESETS_SECONDS, 240, 300]

type Dialog = { kind: 'import'; backup: BackupFile; summary: BackupSummary } | { kind: 'clear' } | { kind: 'clear-confirm' } | null

export function SettingsScreen() {
  const plan = usePlan()
  const settings = useSettings()
  const { all } = useSessionState()
  const fileInput = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function handleExport() {
    setError(null)
    try {
      const { fileName, text } = buildBackupFile()
      downloadBackup(fileName, text)
    } catch (cause) {
      console.error('[IronLog] Export failed', cause)
      setError('Could not create the backup file.')
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Let the same file be chosen again after a failed attempt.
    event.target.value = ''
    if (!file) return
    setError(null)
    const result = parseBackupJson(await file.text())
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDialog({ kind: 'import', backup: result.backup, summary: result.summary })
  }

  async function confirmImport(backup: BackupFile) {
    setBusy(true)
    try {
      await applyBackup(backup) // reloads the app on success
    } catch (cause) {
      console.error('[IronLog] Import failed', cause)
      setBusy(false)
      setDialog(null)
      setError('Could not save the backup to this device. Nothing was changed.')
    }
  }

  async function confirmClear() {
    setBusy(true)
    try {
      await clearAllData() // reloads the app on success
    } catch (cause) {
      console.error('[IronLog] Clearing data failed', cause)
      setBusy(false)
      setDialog(null)
      setError('Could not clear the data on this device.')
    }
  }

  return (
    <>
      <ScreenHeader title="Settings" />

      <section aria-labelledby="settings-program">
        <SectionHeader id="settings-program" title="Program" />
        <div className={styles.group}>
          <Link to={paths.plan} className={styles.row}>
            <span className={styles.label}>Workout plan</span>
            <span className={styles.value}>{plan.name}</span>
            <Icon name="chevron-right" size={20} className={styles.chevron} />
          </Link>
        </div>
      </section>

      <section aria-labelledby="settings-rest">
        <SectionHeader id="settings-rest" title="Rest timer" />
        <div className={styles.group}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="default-rest">
              Default rest
            </label>
            <select
              id="default-rest"
              className={styles.select}
              value={settings.restTimer.defaultSeconds}
              onChange={(event) => setDefaultRestSeconds(Number(event.target.value))}
            >
              {REST_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {formatClock(seconds)}
                </option>
              ))}
            </select>
          </div>
          <Switch
            label="Auto-start rest timer"
            description="Start the countdown when you complete a set."
            checked={settings.restTimer.autoStart}
            onChange={setAutoStartRest}
          />
        </div>
        <p className={styles.note}>
          Exercises with their own rest time keep it. The default applies to the rest of your plan, and takes effect on
          your next workout.
        </p>
      </section>

      <section aria-labelledby="settings-training">
        <SectionHeader id="settings-training" title="Training" />
        <div className={styles.group}>
          <div className={styles.row}>
            <span className={styles.label}>Units</span>
            <span className={styles.value}>Kilograms (kg)</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-data">
        <SectionHeader id="settings-data" title="Data" />
        <div className={styles.group}>
          <button type="button" className={styles.row} onClick={handleExport}>
            <span className={styles.label}>Export backup</span>
            <span className={styles.value}>{pluralize(all.length, 'workout')}</span>
            <Icon name="download" size={20} className={styles.chevron} />
          </button>
          <button type="button" className={styles.row} onClick={() => fileInput.current?.click()}>
            <span className={styles.label}>Import backup</span>
            <span className={styles.value}>Replaces local data</span>
            <Icon name="upload" size={20} className={styles.chevron} />
          </button>
          <button type="button" className={`${styles.row} ${styles.danger}`} onClick={() => setDialog({ kind: 'clear' })}>
            <span className={styles.label}>Clear all data</span>
            <Icon name="chevron-right" size={20} className={styles.chevron} />
          </button>
        </div>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Choose a backup file"
          onChange={(event) => void handleFile(event)}
        />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <p className={styles.note}>
            Backups are JSON files kept on this device. Your workouts are stored only here, so export before changing
            phone or browser.
          </p>
        )}
      </section>

      <section aria-labelledby="settings-about">
        <SectionHeader id="settings-about" title="About" />
        <div className={styles.group}>
          <div className={styles.row}>
            <span className={styles.label}>Version</span>
            <span className={styles.value}>{__APP_VERSION__}</span>
          </div>
        </div>
      </section>

      <div className={styles.brand}>
        <LogoMark size={48} />
        <p className={styles.brandName}>IronLog</p>
        <p className={styles.tagline}>Train. Log. Progress.</p>
      </div>

      <ConfirmDialog
        open={dialog?.kind === 'import'}
        title="Restore this backup?"
        confirmLabel={busy ? 'Restoring…' : 'Replace my data'}
        cancelLabel="Keep my data"
        tone="danger"
        onConfirm={() => dialog?.kind === 'import' && void confirmImport(dialog.backup)}
        onCancel={() => setDialog(null)}
      >
        {dialog?.kind === 'import' && <ImportDetails summary={dialog.summary} current={all.length} />}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'clear'}
        title="Clear all data?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => setDialog({ kind: 'clear-confirm' })}
        onCancel={() => setDialog(null)}
      >
        This will permanently delete your locally stored IronLog workout data
        {all.length > 0 ? `, including ${pluralize(all.length, 'workout')}` : ''}. Export a backup first if you might
        want it back.
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'clear-confirm'}
        title="Delete everything permanently?"
        confirmLabel={busy ? 'Deleting…' : 'Delete everything'}
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => void confirmClear()}
        onCancel={() => setDialog(null)}
      >
        This can’t be undone. {pluralize(all.length, 'workout')} and your settings will be erased from this device.
      </ConfirmDialog>
    </>
  )
}

function ImportDetails({ summary, current }: { summary: BackupSummary; current: number }) {
  const range =
    summary.firstWorkoutAt && summary.lastWorkoutAt
      ? `${formatShortDate(new Date(summary.firstWorkoutAt))} – ${formatShortDate(new Date(summary.lastWorkoutAt))}`
      : 'No workouts in this backup'
  return (
    <>
      <span className={styles.dialogList}>
        <span>
          <strong>{pluralize(summary.workouts, 'workout')}</strong> in this backup
          {summary.inProgress > 0 ? ` (${summary.inProgress} unfinished)` : ''}
        </span>
        <span>{range}</span>
        <span>Exported {formatShortDate(new Date(summary.exportedAt))}</span>
        <span>{summary.settingsIncluded ? 'Includes settings' : 'No settings in this backup'}</span>
      </span>
      <span className={styles.dialogWarning}>
        {pluralize(current, 'workout')} on this device will be replaced. Export first if you want to keep them.
      </span>
    </>
  )
}
