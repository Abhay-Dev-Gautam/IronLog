import { describe, expect, it } from 'vitest'
import {
  discardIfStale,
  getProgress,
  getRemainingMs,
  idleTimer,
  isExpired,
  parseRestTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
  toDisplaySeconds,
} from './restTimer'

// Fixed clock values: no real waiting in these tests.
const T0 = 1_000_000

describe('rest timer', () => {
  it('starts with its full duration remaining', () => {
    const timer = startTimer(90_000, T0)
    expect(getRemainingMs(timer, T0)).toBe(90_000)
    expect(toDisplaySeconds(getRemainingMs(timer, T0))).toBe(90)
    expect(getProgress(timer, T0)).toBe(0)
  })

  it('computes the remaining time from timestamps', () => {
    const timer = startTimer(90_000, T0)
    expect(getRemainingMs(timer, T0 + 28_500)).toBe(61_500)
    expect(toDisplaySeconds(61_500)).toBe(62) // rounds up: never shows 0:00 while time remains
    expect(getProgress(timer, T0 + 45_000)).toBe(0.5)
  })

  it('is unaffected by how often it is checked (no drift)', () => {
    const timer = startTimer(60_000, T0)
    // A throttled background tab might only check once, much later.
    expect(getRemainingMs(timer, T0 + 59_000)).toBe(1_000)
  })

  it('expires at the end time and then counts overtime', () => {
    const timer = startTimer(60_000, T0)
    expect(isExpired(timer, T0 + 59_999)).toBe(false)
    expect(isExpired(timer, T0 + 60_000)).toBe(true)
    expect(getRemainingMs(timer, T0 + 72_400)).toBe(-12_400)
    expect(toDisplaySeconds(-12_400)).toBe(12)
    expect(getProgress(timer, T0 + 72_400)).toBe(1)
  })

  it('freezes while paused and continues from the same point when resumed', () => {
    const running = startTimer(120_000, T0)
    const paused = pauseTimer(running, T0 + 30_000)
    expect(paused.status).toBe('paused')
    expect(getRemainingMs(paused, T0 + 300_000)).toBe(90_000) // time passing while paused changes nothing
    expect(isExpired(paused, T0 + 300_000)).toBe(false)

    const resumed = resumeTimer(paused, T0 + 300_000)
    expect(resumed.status).toBe('running')
    expect(getRemainingMs(resumed, T0 + 310_000)).toBe(80_000)
  })

  it('resets to its full duration, idle', () => {
    const reset = resetTimer(startTimer(90_000, T0))
    expect(reset).toEqual(idleTimer(90_000))
    expect(getRemainingMs(reset, T0 + 500_000)).toBe(90_000)
  })

  it('ignores pause/resume in states where they do not apply', () => {
    const idle = idleTimer(60_000)
    expect(pauseTimer(idle, T0)).toBe(idle)
    const running = startTimer(60_000, T0)
    expect(resumeTimer(running, T0)).toBe(running)
  })

  it('drops a long-forgotten timer when restored, but keeps a recent overrun', () => {
    const timer = startTimer(90_000, T0)
    expect(discardIfStale(timer, T0 + 90_000 + 5 * 60_000)).toBe(timer) // 5 min over: still shown
    expect(discardIfStale(timer, T0 + 90_000 + 16 * 60_000)).toEqual(idleTimer(90_000)) // overnight: idle
    const paused = pauseTimer(timer, T0 + 10_000)
    expect(discardIfStale(paused, T0 + 86_400_000)).toBe(paused) // paused timers are deliberate
  })

  it('restores only well-formed saved state', () => {
    const running = startTimer(90_000, T0, 'Lat Pulldown · Set 1')
    expect(parseRestTimer(JSON.parse(JSON.stringify(running)))).toEqual(running)
    expect(parseRestTimer({ status: 'running', durationMs: 90_000 })).toBeNull()
    expect(parseRestTimer({ status: 'paused', durationMs: 90_000, remainingMs: -5 })).toBeNull()
    expect(parseRestTimer('junk')).toBeNull()
  })
})
