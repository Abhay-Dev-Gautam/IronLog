import type { ExerciseSessionEntry, ProgressMetric, Trend } from '../../services/exerciseHistory'
import { getMetricValue } from '../../services/exerciseHistory'
import { formatDayMonth, formatKg, formatNumber, pluralize } from '../../utils/format'

interface MetricInfo {
  /** Short label for the metric switcher. */
  tab: string
  /** Full name, used as the chart title. */
  title: string
  format: (value: number) => string
  formatDelta: (delta: number) => string
}

const kg = (value: number) => formatKg(value)
const signed = (delta: number, unit: (magnitude: number) => string) =>
  `${delta > 0 ? '+' : '−'}${unit(Math.abs(delta))}`

export const METRICS: Record<ProgressMetric, MetricInfo> = {
  'top-weight': { tab: 'Weight', title: 'Top weight', format: kg, formatDelta: (d) => signed(d, kg) },
  'estimated-1rm': { tab: 'Est. 1RM', title: 'Estimated 1RM', format: kg, formatDelta: (d) => signed(d, kg) },
  volume: { tab: 'Volume', title: 'Session volume', format: kg, formatDelta: (d) => signed(d, kg) },
  'best-reps': {
    tab: 'Reps',
    title: 'Best reps',
    format: (value) => pluralize(value, 'rep'),
    formatDelta: (d) => signed(d, (m) => pluralize(m, 'rep')),
  },
  'longest-hold': {
    tab: 'Hold',
    title: 'Longest hold',
    format: (value) => `${formatNumber(value)} s`,
    formatDelta: (d) => signed(d, (m) => `${formatNumber(m)} s`),
  },
}

/** "+2.5 kg since Sep 21", "Same as Sep 21", or null with a single session. */
export function describeTrend(metric: ProgressMetric, trend: Trend | null): string | null {
  if (!trend || trend.points < 2) return null
  const since = formatDayMonth(new Date(trend.first.startedAt))
  return trend.change === 0 ? `Same as ${since}` : `${METRICS[metric].formatDelta(trend.change)} since ${since}`
}

export interface Change {
  label: string
  direction: 'up' | 'down' | 'same'
}

/** Change in an exercise's headline metric between its first and latest session. */
export function headlineChange(
  metric: ProgressMetric,
  first: ExerciseSessionEntry,
  latest: ExerciseSessionEntry,
): Change | null {
  if (first.sessionId === latest.sessionId) return null
  const before = getMetricValue(first, metric)
  const after = getMetricValue(latest, metric)
  if (before === null || after === null) return null
  if (after === before) return { label: 'Same', direction: 'same' }
  return { label: METRICS[metric].formatDelta(after - before), direction: after > before ? 'up' : 'down' }
}
