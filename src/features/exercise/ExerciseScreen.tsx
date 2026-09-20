import { useMemo, useState } from 'react'
import { paths } from '../../app/routes'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ExerciseImage } from '../../components/ExerciseImage'
import { Link } from '../../components/Link'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { SetText } from '../../components/SetText'
import { TopBar } from '../../components/TopBar'
import { EXERCISES_BY_ID } from '../../data/exercises'
import { useSessionHistory } from '../../hooks/useProgram'
import {
  getAvailableMetrics,
  getExerciseHistory,
  getExerciseRecords,
  getProgressSeries,
  summarizeTrend,
  type ExerciseRecords,
  type ExerciseSessionEntry,
  type ProgressMetric,
} from '../../services/exerciseHistory'
import { formatKg, formatShortDate, pluralize } from '../../utils/format'
import { describeTrend, METRICS } from '../progress/metrics'
import { ProgressChart } from '../progress/ProgressChart'
import { muscleLabel } from '../workout/workoutLayout'
import styles from './ExerciseScreen.module.css'

const REP_RECORD_LIMIT = 6

const dateOf = (iso: string) => formatShortDate(new Date(iso))

export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const sessions = useSessionHistory()
  const history = useMemo(() => getExerciseHistory(sessions, exerciseId), [sessions, exerciseId])
  const records = useMemo(() => getExerciseRecords(history), [history])
  const metrics = getAvailableMetrics(history)
  const [chosen, setChosen] = useState<ProgressMetric | null>(null)
  const metric = chosen && metrics.includes(chosen) ? chosen : metrics[0]

  const name = EXERCISES_BY_ID.get(exerciseId)?.name ?? history[0]?.exerciseName
  const muscles = muscleLabel(exerciseId)

  if (!name) {
    return (
      <>
        <TopBar fallback={paths.progress} />
        <ScreenHeader title="Exercise" />
        <EmptyState
          icon="alert"
          title="Exercise not found"
          action={
            <ButtonLink to={paths.progress} replace variant="secondary">
              Go to Progress
            </ButtonLink>
          }
        >
          It isn’t in your plan and has no logged history.
        </EmptyState>
      </>
    )
  }

  const first = history.at(-1)
  const series = metric ? getProgressSeries(history, metric) : []

  return (
    <>
      <TopBar fallback={paths.progress} />
      <ExerciseImage exerciseId={exerciseId} variant="hero" className={styles.hero} />
      <ScreenHeader
        eyebrow={muscles || 'Exercise'}
        title={name}
        subtitle={first ? `${pluralize(history.length, 'session')} · since ${dateOf(first.startedAt)}` : undefined}
      />

      {history.length === 0 ? (
        <EmptyState icon="progress" title="No history yet">
          Complete a set of {name} in a workout and every session will show up here.
        </EmptyState>
      ) : (
        <>
          <RecordsCard records={records} history={history} />

          {metric && series.length > 0 && (
            <section aria-labelledby="progress-title">
              <SectionHeader id="progress-title" title="Progress" />
              {metrics.length > 1 && (
                <fieldset className={styles.switcher}>
                  <legend className="visually-hidden">Chart metric</legend>
                  {metrics.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={styles.switch}
                      aria-pressed={option === metric}
                      onClick={() => setChosen(option)}
                    >
                      {METRICS[option].tab}
                    </button>
                  ))}
                </fieldset>
              )}
              <ProgressChart
                title={METRICS[metric].title}
                points={series}
                format={METRICS[metric].format}
                change={describeTrend(metric, summarizeTrend(series))}
              />
              {metric === 'estimated-1rm' && (
                <p className={styles.note}>
                  Estimated from your best set of 12 reps or fewer each session. It’s a guide to strength, not a
                  weight you lifted.
                </p>
              )}
              {metric === 'volume' && (
                <p className={styles.note}>Weight × reps across completed sets in each session.</p>
              )}
            </section>
          )}

          {records.heaviest && records.repsByWeight.length > 0 && (
            <section aria-labelledby="reps-title">
              <SectionHeader id="reps-title" title="Best reps by weight" />
              <ul className={styles.card}>
                {records.repsByWeight.slice(0, REP_RECORD_LIMIT).map((record) => (
                  <li key={record.weightKg} className={styles.recordRow}>
                    <span className={styles.recordLabel}>{record.weightKg > 0 ? formatKg(record.weightKg) : 'Bodyweight'}</span>
                    <span className={styles.recordValue}>{pluralize(record.reps, 'rep')}</span>
                    <span className={styles.recordDate}>{dateOf(record.startedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="history-title">
            <SectionHeader id="history-title" title="History" trailing={pluralize(history.length, 'session')} />
            <ol className={styles.history}>
              {history.map((entry) => (
                <li key={entry.sessionId}>
                  <HistoryEntry entry={entry} />
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  )
}

function RecordsCard({ records, history }: { records: ExerciseRecords; history: ExerciseSessionEntry[] }) {
  const rows: { label: string; value: string; date: string; estimate?: string }[] = []
  if (records.heaviest) {
    rows.push({ label: 'Heaviest set', value: `${formatKg(records.heaviest.weightKg)} × ${records.heaviest.reps}`, date: records.heaviest.startedAt })
  } else {
    const bestReps = records.repsByWeight[0]
    if (bestReps) rows.push({ label: 'Most reps', value: pluralize(bestReps.reps, 'rep'), date: bestReps.startedAt })
  }
  if (records.longestHold) rows.push({ label: 'Longest hold', value: `${records.longestHold.seconds} s`, date: records.longestHold.startedAt })
  if (records.mostVolume) rows.push({ label: 'Most volume', value: formatKg(records.mostVolume.volumeKg), date: records.mostVolume.startedAt })
  if (records.bestEstimate) {
    rows.push({
      label: 'Estimated 1RM',
      value: formatKg(records.bestEstimate.estimatedKg),
      date: records.bestEstimate.startedAt,
      estimate: `From ${formatKg(records.bestEstimate.weightKg)} × ${records.bestEstimate.reps}. Estimate, not a lift.`,
    })
  }
  const latest = history[0]
  if (latest) rows.push({ label: 'Last trained', value: dateOf(latest.startedAt), date: '' })

  return (
    <section aria-labelledby="records-title">
      <SectionHeader id="records-title" title="Records" />
      <ul className={styles.card}>
        {rows.map((row) => (
          <li key={row.label} className={styles.recordRow}>
            <span className={styles.recordLabel}>
              {row.label}
              {row.estimate && <span className={styles.estimateTag}>Estimate</span>}
              {row.estimate && <span className={styles.recordNote}>{row.estimate}</span>}
            </span>
            <span className={styles.recordValue}>{row.value}</span>
            {row.date && <span className={styles.recordDate}>{dateOf(row.date)}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function HistoryEntry({ entry }: { entry: ExerciseSessionEntry }) {
  return (
    <article className={styles.entry} aria-label={`${dateOf(entry.startedAt)}, ${entry.workoutName}`}>
      <Link to={paths.session(entry.sessionId)} className={styles.entryHead}>
        <span className={styles.entryDate}>{dateOf(entry.startedAt)}</span>
        <span className={styles.entryWorkout}>{entry.workoutName}</span>
        {entry.volumeKg > 0 && <span className={styles.entryVolume}>{formatKg(entry.volumeKg)}</span>}
      </Link>
      <ol className={styles.sets}>
        {entry.sets.map((set, index) => (
          <li key={set.id} className={styles.set}>
            <span className={styles.setNumber} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.setText}>
              <SetText set={set} tracking={entry.tracking} />
            </span>
            {set.id === entry.bestSet.id && entry.sets.length > 1 && <span className={styles.bestTag}>Best</span>}
          </li>
        ))}
      </ol>
      {entry.notes && <p className={styles.entryNote}>{entry.notes}</p>}
    </article>
  )
}
