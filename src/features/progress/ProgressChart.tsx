import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import type { SeriesPoint } from '../../services/exerciseHistory'
import { formatDayMonth, formatNumber } from '../../utils/format'
import { niceScale } from './chartScale'
import styles from './ProgressChart.module.css'

const HEIGHT = 168
const TOP = 10
const X_AXIS = 26
const RIGHT = 4
const INSET = 8 // keeps edge markers clear of the axis labels
const MARKER_LIMIT = 16

interface ProgressChartProps {
  /** What is plotted, e.g. "Top weight". A single series needs no legend. */
  title: string
  points: readonly SeriesPoint[]
  format: (value: number) => string
  /** e.g. "+2.5 kg since Sep 21" */
  change: string | null
}

const shortDate = (point: SeriesPoint) => formatDayMonth(new Date(point.startedAt))

/**
 * One exercise metric over time: a 2px line with ringed markers on hairline
 * gridlines. No area fill: the y-axis starts near the data (not at zero) so
 * small gains stay visible, and a filled area would exaggerate them.
 *
 * The headline doubles as the readout: it shows the latest value, or the
 * session under the finger while scrubbing (or while stepping with the
 * arrow keys).
 */
export function ProgressChart({ title, points, format, change }: ProgressChartProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(plotRef)
  const [active, setActive] = useState<number | null>(null)

  const latestIndex = points.length - 1
  const shown = points[active ?? latestIndex]
  const scale = niceScale(Math.min(...points.map((p) => p.value)), Math.max(...points.map((p) => p.value)))
  const tickLabels = scale.ticks.map((tick) => formatNumber(tick))
  const left = Math.max(...tickLabels.map((label) => label.length)) * 7 + 10
  const plotLeft = left + INSET
  const plotRight = width - RIGHT - INSET
  const plotBottom = HEIGHT - X_AXIS

  const times = points.map((point) => Date.parse(point.startedAt))
  const first = times[0] ?? 0
  const span = (times.at(-1) ?? 0) - first
  const x = (index: number) => {
    if (points.length === 1) return (plotLeft + plotRight) / 2
    const fraction = span > 0 ? ((times[index] ?? first) - first) / span : index / latestIndex
    return plotLeft + fraction * (plotRight - plotLeft)
  }
  const y = (value: number) => TOP + (1 - (value - scale.min) / (scale.max - scale.min)) * (plotBottom - TOP)

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.value)}`).join(' ')

  function nearest(clientX: number): number {
    const box = plotRef.current?.getBoundingClientRect()
    const position = clientX - (box?.left ?? 0)
    let best = 0
    points.forEach((_, index) => {
      if (Math.abs(x(index) - position) < Math.abs(x(best) - position)) best = index
    })
    return best
  }

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' || event.buttons > 0 || event.type === 'pointerdown') {
      setActive(nearest(event.clientX))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') setActive(null)
  }

  if (!shown) return null
  const showAllMarkers = points.length <= MARKER_LIMIT
  const meta =
    active !== null ? shortDate(shown) : [shortDate(shown), change ?? (points.length === 1 ? 'first session' : null)].filter(Boolean).join(' · ')

  return (
    <div className={styles.chart}>
      <div className={styles.head} aria-live="polite">
        <p className={styles.title}>{title}</p>
        <p className={styles.value}>{format(shown.value)}</p>
        <p className={styles.meta}>{meta}</p>
      </div>

      <div
        ref={plotRef}
        className={styles.plot}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onPointerUp={(event) => event.pointerType !== 'mouse' && setActive(null)}
        onPointerLeave={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
      >
        {/* Keyboard and screen-reader access: a native range input steps through the sessions. */}
        <input
          className="visually-hidden"
          type="range"
          min={0}
          max={latestIndex}
          step={1}
          value={active ?? latestIndex}
          aria-label={`${title} by session`}
          aria-valuetext={`${shortDate(shown)}: ${format(shown.value)}`}
          onChange={(event) => setActive(Number(event.target.value))}
          onKeyDown={handleKeyDown}
          onBlur={() => setActive(null)}
        />
        {width > 0 && (
          <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden="true">
            {scale.ticks.map((tick, index) => (
              <g key={tick}>
                <line className={styles.grid} x1={left} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} />
                <text className={styles.tick} x={left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                  {tickLabels[index]}
                </text>
              </g>
            ))}

            {points.length > 1 && <path className={styles.line} d={line} />}
            {active !== null && <line className={styles.crosshair} x1={x(active)} x2={x(active)} y1={TOP} y2={plotBottom} />}

            {points.map((point, index) =>
              showAllMarkers || index === latestIndex || index === active ? (
                <circle
                  key={point.sessionId}
                  className={styles.marker}
                  cx={x(index)}
                  cy={y(point.value)}
                  r={index === active ? 6 : 4}
                />
              ) : null,
            )}

            <text className={styles.tick} x={x(0)} y={HEIGHT - 6} textAnchor={points.length === 1 ? 'middle' : 'start'}>
              {shortDate(points[0] as SeriesPoint)}
            </text>
            {points.length > 1 && (
              <text className={styles.tick} x={x(latestIndex)} y={HEIGHT - 6} textAnchor="end">
                {shortDate(points[latestIndex] as SeriesPoint)}
              </text>
            )}
          </svg>
        )}
      </div>

      <table className="visually-hidden">
        <caption>{title} by session</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{title}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.sessionId}>
              <td>{shortDate(point)}</td>
              <td>{format(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
