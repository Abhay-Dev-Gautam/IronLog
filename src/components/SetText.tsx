import type { ExerciseSet, TrackingMode } from '../types/domain'
import { formatSetResult } from '../utils/format'
import styles from './SetText.module.css'

/** A logged set as "40 kg × 12 @ RIR 2", with the RIR part de-emphasised. */
export function SetText({ set, tracking }: { set: ExerciseSet; tracking: TrackingMode }) {
  return (
    <>
      {formatSetResult(set, tracking)}
      {set.rir !== null && <span className={styles.rir}> @ RIR {set.rir}</span>}
    </>
  )
}
