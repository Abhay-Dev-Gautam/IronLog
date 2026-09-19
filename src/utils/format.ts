import type { ExerciseSet, Range, TrackingMode } from '../types/domain'

/** "8–12", or "10" when the range is a single value. */
export function formatRange({ min, max }: Range): string {
  return min === max ? String(min) : `${min}–${max}`
}

/** Seconds as a clock: 90 → "1:30", 3725 → "1:02:05". Negative input clamps to 0. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = String(safe % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** Target for one set: "8–12 reps" or "30–60 s". */
export function formatTarget(tracking: TrackingMode, target: Range): string {
  return tracking === 'duration' ? `${formatRange(target)} s` : `${formatRange(target)} reps`
}

/** A logged set: "60 kg × 10", "BW × 12" (no load), or "45 s" for timed sets. */
export function formatSetResult(set: ExerciseSet, tracking: TrackingMode, locale?: string): string {
  if (tracking === 'duration') {
    const time = set.durationSeconds === null ? '—' : `${set.durationSeconds} s`
    return set.weightKg ? `${formatKg(set.weightKg, locale)} × ${time}` : time
  }
  const load = set.weightKg === null || set.weightKg === 0 ? 'BW' : formatKg(set.weightKg, locale)
  return `${load} × ${set.reps ?? '—'}`
}

export function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
}

export function formatKg(value: number, locale?: string): string {
  return `${formatNumber(value, locale)} kg`
}

/** Large totals kept short enough for a stat tile: 9,860 kg, 48.2K kg, 1.3M kg. */
export function formatCompactKg(value: number, locale?: string): string {
  if (Math.abs(value) < 10_000) return formatKg(value, locale)
  return `${new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)} kg`
}

/** Workout duration: "52 min", "1 h 05 min". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  return `${hours} h ${minutes} min`
}

export function formatLongDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

/** "Sep 21": compact enough for chart axes. */
export function formatDayMonth(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date)
}

export function formatShortDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

/** "Chest • Back • Shoulders" */
export function joinFocus(labels: readonly string[]): string {
  return labels.join(' • ')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
