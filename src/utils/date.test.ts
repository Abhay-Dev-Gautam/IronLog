import { describe, expect, it } from 'vitest'
import { addDays, getGreeting, getWeekday, parseLocalDateKey, startOfWeek, toLocalDateKey } from './date'

describe('date utils', () => {
  it('builds zero-padded local date keys', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('parses valid keys and rejects impossible dates', () => {
    expect(parseLocalDateKey('2026-09-21')?.getDate()).toBe(21)
    expect(parseLocalDateKey('2026-02-30')).toBeNull()
    expect(parseLocalDateKey('21-09-2026')).toBeNull()
    expect(parseLocalDateKey('')).toBeNull()
  })

  it('finds the Monday that starts the week', () => {
    expect(toLocalDateKey(startOfWeek(new Date(2026, 8, 20)))).toBe('2026-09-14') // Sunday
    expect(toLocalDateKey(startOfWeek(new Date(2026, 8, 21)))).toBe('2026-09-21') // Monday
    expect(toLocalDateKey(startOfWeek(new Date(2026, 9, 1)))).toBe('2026-09-28') // Thursday, across months
  })

  it('adds calendar days across month boundaries', () => {
    expect(toLocalDateKey(addDays(new Date(2026, 8, 29), 3))).toBe('2026-10-02')
  })

  it('names weekdays', () => {
    expect(getWeekday(new Date(2026, 8, 19))).toBe('saturday')
    expect(getWeekday(new Date(2026, 8, 21))).toBe('monday')
  })

  it('greets by time of day', () => {
    const at = (hour: number) => getGreeting(new Date(2026, 8, 21, hour))
    expect([at(4), at(5), at(11), at(12), at(16), at(17), at(23)]).toEqual([
      'Good evening',
      'Good morning',
      'Good morning',
      'Good afternoon',
      'Good afternoon',
      'Good evening',
      'Good evening',
    ])
  })
})
