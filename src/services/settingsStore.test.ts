import { describe, expect, it, vi } from 'vitest'
import type { SettingsRepository } from '../data/settingsRepository'
import { DEFAULT_SETTINGS } from '../data/settingsSchema'
import type { UserSettings } from '../types/domain'
import { createSettingsStore } from './settingsStore'

function memoryRepository(initial: UserSettings | null = null) {
  let stored = initial
  return {
    repository: {
      load: () => Promise.resolve(stored),
      save: (settings: UserSettings) => {
        stored = settings
        return Promise.resolve()
      },
    } satisfies SettingsRepository,
    get stored() {
      return stored
    },
  }
}

describe('settings store', () => {
  it('starts on the shipped defaults: rest 2:00 and auto-start on', () => {
    expect(DEFAULT_SETTINGS.restTimer).toEqual({ defaultSeconds: 120, autoStart: true })
    expect(createSettingsStore().getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('loads stored settings on startup', async () => {
    const saved: UserSettings = { weightUnit: 'kg', theme: 'dark', restTimer: { defaultSeconds: 90, autoStart: false } }
    const store = createSettingsStore()
    await store.init(() => Promise.resolve(memoryRepository(saved).repository))
    expect(store.getSettings()).toEqual(saved)
    expect(store.getState().loaded).toBe(true)
  })

  it('keeps the defaults when nothing has been saved yet', async () => {
    const store = createSettingsStore()
    await store.init(() => Promise.resolve(memoryRepository().repository))
    expect(store.getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('saves each change and notifies subscribers', async () => {
    const backing = memoryRepository()
    const store = createSettingsStore()
    await store.init(() => Promise.resolve(backing.repository))
    let notified = 0
    store.subscribe(() => (notified += 1))

    store.update((settings) => ({ ...settings, restTimer: { ...settings.restTimer, defaultSeconds: 180 } }))
    store.update((settings) => ({ ...settings, restTimer: { ...settings.restTimer, autoStart: false } }))
    await store.flush()

    expect(notified).toBe(2)
    expect(store.getSettings().restTimer).toEqual({ defaultSeconds: 180, autoStart: false })
    expect(backing.stored?.restTimer).toEqual({ defaultSeconds: 180, autoStart: false })
  })

  it('keeps working in memory when settings cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = createSettingsStore()
    await store.init(() => Promise.reject(new Error('storage unavailable')))
    expect(store.getSettings()).toEqual(DEFAULT_SETTINGS)
    store.update((settings) => ({ ...settings, restTimer: { ...settings.restTimer, autoStart: false } }))
    expect(store.getSettings().restTimer.autoStart).toBe(false)
    vi.restoreAllMocks()
  })

  it('adopts restored settings without writing them back', async () => {
    const backing = memoryRepository()
    const store = createSettingsStore()
    await store.init(() => Promise.resolve(backing.repository))
    store.adopt({ weightUnit: 'kg', theme: 'dark', restTimer: { defaultSeconds: 60, autoStart: false } })
    await store.flush()
    expect(store.getSettings().restTimer.defaultSeconds).toBe(60)
    expect(backing.stored).toBeNull() // the import already wrote it in its own transaction
  })
})
