import { useMemo } from 'react'
import { paths } from '../../app/routes'
import { EmptyState } from '../../components/EmptyState'
import { ExerciseImage } from '../../components/ExerciseImage'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { SetText } from '../../components/SetText'
import { StatGroup } from '../../components/StatGroup'
import { useCurrentDate } from '../../hooks/useCurrentDate'
import { usePlan, useSessionHistory } from '../../hooks/useProgram'
import { getExerciseOverviews, type ExerciseSessionEntry, type ProgressMetric } from '../../services/exerciseHistory'
import { buildRecordTimeline } from '../../services/personalRecords'
import { getCompletedSessions } from '../../services/sessionStats'
import { getTrainingStats, getWeekOverview } from '../../services/trainingStats'
import { formatCompactKg, formatDayMonth, formatDuration, pluralize } from '../../utils/format'
import { describeRecord } from './describeRecord'
import { headlineChange } from './metrics'
import styles from './ProgressScreen.module.css'
import { WeekStrip } from './WeekStrip'

const RECENT_RECORDS = 5

export function ProgressScreen() {
  const plan = usePlan()
  const history = useSessionHistory()
  const today = useCurrentDate()

  // Derived from finished sessions only; recomputed when history changes, not while logging.
  const completed = useMemo(() => getCompletedSessions(history), [history])
  const stats = useMemo(() => getTrainingStats(completed, today), [completed, today])
  const overview = useMemo(() => getWeekOverview(plan, completed, today), [plan, completed, today])
  const records = useMemo(() => buildRecordTimeline(completed), [completed])
  const exercises = useMemo(() => getExerciseOverviews(completed), [completed])

  if (completed.length === 0) {
    return (
      <>
        <ScreenHeader title="Progress" />
        <EmptyState icon="progress" title="Nothing to chart yet">
          Complete a workout to start tracking your streak, training volume and personal records.
        </EmptyState>
      </>
    )
  }

  const exerciseNames = new Map(exercises.map((exercise) => [exercise.exerciseId, exercise.name]))
  const recent = records.slice(-RECENT_RECORDS).reverse()

  return (
    <>
      <ScreenHeader title="Progress" />

      <section aria-labelledby="consistency-title">
        <SectionHeader id="consistency-title" title="Consistency" />
        <div className={styles.card}>
          <StatGroup
            columns={2}
            className={styles.stats}
            stats={[
              { label: 'This week', value: pluralize(stats.workoutsThisWeek, 'workout') },
              { label: 'This month', value: pluralize(stats.workoutsThisMonth, 'workout') },
              { label: 'Week streak', value: stats.weekStreak > 0 ? pluralize(stats.weekStreak, 'week') : '—' },
              { label: 'All time', value: pluralize(stats.totalWorkouts, 'workout') },
            ]}
          />
          <WeekStrip overview={overview} />
        </div>
      </section>

      <section aria-labelledby="totals-title">
        <SectionHeader id="totals-title" title="Training totals" />
        <div className={styles.card}>
          <StatGroup
            columns={2}
            className={styles.stats}
            stats={[
              { label: 'Sets', value: stats.totalSets.toLocaleString() },
              { label: 'Volume', value: formatCompactKg(stats.totalVolumeKg) },
              { label: 'Typical session', value: stats.typicalDurationMs === null ? '—' : formatDuration(stats.typicalDurationMs) },
              { label: 'Records set', value: records.length },
            ]}
          />
          <p className={styles.footnote}>
            Volume is weight × reps over completed sets. Bodyweight and timed sets aren’t counted.
          </p>
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="records-title">
          <SectionHeader id="records-title" title="Recent records" />
          <ul className={styles.list}>
            {recent.map((record) => {
              const { title, value, estimate } = describeRecord(record)
              return (
                <li key={`${record.sessionId}-${record.exerciseId}-${record.kind}`}>
                  <Link to={paths.exercise(record.exerciseId)} className={styles.row}>
                    <span className={styles.recordIcon} aria-hidden="true">
                      <Icon name="trophy" size={20} />
                    </span>
                    <span className={styles.info}>
                      <span className={styles.name}>{exerciseNames.get(record.exerciseId) ?? record.exerciseId}</span>
                      <span className={styles.meta}>
                        {title}
                        {estimate && <span className={styles.estimateTag}>Estimate</span>}{' '}
                        <span className={styles.date}>· {formatDayMonth(new Date(record.achievedAt))}</span>
                      </span>
                    </span>
                    <span className={styles.value}>{value}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="exercises-title">
        <SectionHeader id="exercises-title" title="Exercises" trailing={`${exercises.length} logged`} />
        <ul className={styles.list}>
          {exercises.map((exercise) => {
            const change = headlineChange(primaryMetric(exercise.first, exercise.latest), exercise.first, exercise.latest)
            return (
              <li key={exercise.exerciseId}>
                <Link to={paths.exercise(exercise.exerciseId)} className={styles.row}>
                  <ExerciseImage exerciseId={exercise.exerciseId} />
                  <span className={styles.info}>
                    <span className={styles.name}>{exercise.name}</span>
                    <span className={styles.meta}>
                      <span className={styles.date}>{formatDayMonth(new Date(exercise.latest.startedAt))} ·</span>{' '}
                      <SetText set={exercise.latest.bestSet} tracking={exercise.latest.tracking} />
                    </span>
                  </span>
                  <span className={`${styles.change} ${change?.direction === 'up' ? styles.changeUp : ''}`}>
                    {change?.label ?? pluralize(exercise.sessionCount, 'session')}
                  </span>
                  <Icon name="chevron-right" size={20} className={styles.chevron} />
                </Link>
              </li>
            )
          })}
        </ul>
        <p className={styles.footnote}>Changes compare your latest session with your first.</p>
      </section>
    </>
  )
}

/** The metric an exercise's progress is summarised by in lists: load if any was used, else reps or time. */
function primaryMetric(first: ExerciseSessionEntry, latest: ExerciseSessionEntry): ProgressMetric {
  if (latest.tracking === 'duration') return 'longest-hold'
  return (first.topWeightKg ?? 0) > 0 || (latest.topWeightKg ?? 0) > 0 ? 'top-weight' : 'best-reps'
}
