import type { ThemePreference, UserSettings, WeightUnit } from '../types/domain'

/** Shipped defaults. Also the fallback whenever stored settings are missing or unreadable. */
export const DEFAULT_SETTINGS: UserSettings = {
  weightUnit: 'kg',
  theme: 'dark',
  restTimer: {
    defaultSeconds: 120,
    // Phase 2 behaviour: completing a set starts the rest timer.
    autoStart: true,
  },
}

export const MIN_REST_DEFAULT_SECONDS = 30
export const MAX_REST_DEFAULT_SECONDS = 600

const UNITS: WeightUnit[] = ['kg']
const THEMES: ThemePreference[] = ['dark', 'light', 'system']

/**
 * Reads settings from storage or a backup. Unknown or invalid fields fall
 * back to the default rather than failing: settings are preferences, and a
 * bad value must never block the app from starting.
 */
export function parseUserSettings(value: unknown): UserSettings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS
  const record = value as Record<string, unknown>
  const timer = (typeof record.restTimer === 'object' && record.restTimer !== null ? record.restTimer : {}) as Record<
    string,
    unknown
  >
  const seconds = timer.defaultSeconds

  return {
    weightUnit: UNITS.includes(record.weightUnit as WeightUnit) ? (record.weightUnit as WeightUnit) : DEFAULT_SETTINGS.weightUnit,
    theme: THEMES.includes(record.theme as ThemePreference) ? (record.theme as ThemePreference) : DEFAULT_SETTINGS.theme,
    restTimer: {
      defaultSeconds: isValidRestDefault(seconds) ? seconds : DEFAULT_SETTINGS.restTimer.defaultSeconds,
      autoStart: typeof timer.autoStart === 'boolean' ? timer.autoStart : DEFAULT_SETTINGS.restTimer.autoStart,
    },
  }
}

export function isValidRestDefault(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_REST_DEFAULT_SECONDS &&
    value <= MAX_REST_DEFAULT_SECONDS
  )
}

/** True when `value` is a settings object with nothing unexpected in it (used when validating backups). */
export function isWellFormedSettings(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (!UNITS.includes(record.weightUnit as WeightUnit) || !THEMES.includes(record.theme as ThemePreference)) return false
  const timer = record.restTimer
  if (typeof timer !== 'object' || timer === null) return false
  const { defaultSeconds, autoStart } = timer as Record<string, unknown>
  return isValidRestDefault(defaultSeconds) && typeof autoStart === 'boolean'
}
