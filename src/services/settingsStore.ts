import type { SettingsRepository } from '../data/settingsRepository'
import { DEFAULT_SETTINGS } from '../data/settingsSchema'
import type { UserSettings } from '../types/domain'

/**
 * User settings in memory, written through to storage. Settings are small
 * and rarely change, so each update is saved immediately. If storage is
 * unavailable the app still runs with whatever is in memory.
 */

export interface SettingsState {
  settings: UserSettings
  loaded: boolean
}

export interface SettingsStore {
  getState(): SettingsState
  /** Non-reactive read, for event handlers. */
  getSettings(): UserSettings
  subscribe(listener: () => void): () => void
  init(connect: () => Promise<SettingsRepository>): Promise<void>
  update(change: (settings: UserSettings) => UserSettings): void
  /** Applies settings restored from a backup without writing them back. */
  adopt(settings: UserSettings): void
  flush(): Promise<void>
}

export function createSettingsStore(): SettingsStore {
  let state: SettingsState = { settings: DEFAULT_SETTINGS, loaded: false }
  let repository: SettingsRepository | null = null
  let queue: Promise<void> = Promise.resolve()
  const listeners = new Set<() => void>()

  function setState(next: SettingsState) {
    state = next
    listeners.forEach((listener) => listener())
  }

  return {
    getState: () => state,
    getSettings: () => state.settings,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async init(connect) {
      try {
        repository = await connect()
        const stored = await repository.load()
        setState({ settings: stored ?? DEFAULT_SETTINGS, loaded: true })
      } catch (error) {
        console.error('[IronLog] Could not load settings; using defaults', error)
        setState({ settings: DEFAULT_SETTINGS, loaded: true })
      }
    },

    update(change) {
      const next = change(state.settings)
      if (next === state.settings) return
      setState({ settings: next, loaded: state.loaded })
      const repo = repository
      if (!repo) return
      queue = queue.then(() =>
        repo.save(next).catch((error: unknown) => {
          console.error('[IronLog] Could not save settings', error)
        }),
      )
    },

    adopt(settings) {
      setState({ settings, loaded: true })
    },

    flush: () => queue,
  }
}

export const settingsStore: SettingsStore = createSettingsStore()

export function setDefaultRestSeconds(seconds: number): void {
  settingsStore.update((settings) => ({ ...settings, restTimer: { ...settings.restTimer, defaultSeconds: seconds } }))
}

export function setAutoStartRest(autoStart: boolean): void {
  settingsStore.update((settings) => ({ ...settings, restTimer: { ...settings.restTimer, autoStart } }))
}
