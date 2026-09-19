import type { PersonalRecord } from '../../types/domain'
import { formatKg, pluralize } from '../../utils/format'

export interface RecordDescription {
  title: string
  value: string
  /** Set only for estimates, which must never read as an actual lift. */
  estimate?: string
}

export function describeRecord(record: PersonalRecord): RecordDescription {
  switch (record.kind) {
    case 'heaviest-weight':
      return { title: 'Heaviest weight', value: `${formatKg(record.weightKg)} × ${record.reps}` }
    case 'most-reps-at-weight':
      return {
        title: record.weightKg > 0 ? `Most reps at ${formatKg(record.weightKg)}` : 'Most reps (bodyweight)',
        value: pluralize(record.reps, 'rep'),
      }
    case 'longest-duration':
      return { title: 'Longest hold', value: `${record.durationSeconds} s` }
    case 'most-volume':
      return { title: 'Most volume in a session', value: formatKg(record.volumeKg) }
    case 'estimated-1rm':
      return {
        title: 'Estimated 1RM',
        value: formatKg(record.estimatedKg),
        estimate: `Estimate from ${formatKg(record.basedOn.weightKg)} × ${record.basedOn.reps}`,
      }
  }
}
