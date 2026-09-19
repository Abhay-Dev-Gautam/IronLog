import { describe, expect, it } from 'vitest'
import { normalizePath } from './router'
import { matchRoute, paths, tabForRoute } from './routes'

describe('routing', () => {
  it('normalizes hashes to paths', () => {
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('#')).toBe('/')
    expect(normalizePath('#/history')).toBe('/history')
    expect(normalizePath('#junk')).toBe('/')
  })

  it('matches every screen', () => {
    expect(matchRoute('/')).toEqual({ name: 'home' })
    expect(matchRoute('/history')).toEqual({ name: 'history' })
    expect(matchRoute('/progress')).toEqual({ name: 'progress' })
    expect(matchRoute('/settings')).toEqual({ name: 'settings' })
    expect(matchRoute('/settings/plan')).toEqual({ name: 'plan' })
    expect(matchRoute(paths.workout('upper-a'))).toEqual({ name: 'workout', dayId: 'upper-a' })
    expect(matchRoute(paths.session('abc-123'))).toEqual({ name: 'session', sessionId: 'abc-123' })
    expect(matchRoute(paths.exercise('lat-pulldown'))).toEqual({ name: 'exercise', exerciseId: 'lat-pulldown' })
  })

  it('round-trips workout IDs that need encoding', () => {
    expect(matchRoute(paths.workout('lower b/core'))).toEqual({ name: 'workout', dayId: 'lower b/core' })
  })

  it('falls back to not-found for unknown or malformed paths', () => {
    expect(matchRoute('/nope').name).toBe('not-found')
    expect(matchRoute('/workout').name).toBe('not-found')
    expect(matchRoute('/workout/%E0%A4%A').name).toBe('not-found')
    expect(matchRoute('/history/extra/segments').name).toBe('not-found')
  })

  it('hides the tab bar only on the workout screen', () => {
    expect(tabForRoute({ name: 'workout', dayId: 'x' })).toBeNull()
    expect(tabForRoute({ name: 'plan' })).toBe('settings')
    expect(tabForRoute({ name: 'session', sessionId: 'x' })).toBe('history')
    expect(tabForRoute({ name: 'exercise', exerciseId: 'x' })).toBe('progress')
    expect(tabForRoute({ name: 'home' })).toBe('today')
  })
})
