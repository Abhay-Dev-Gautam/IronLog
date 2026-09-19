export interface NiceScale {
  min: number
  max: number
  ticks: number[]
}

/**
 * A y-axis range with round tick values (steps of 1, 2, 2.5 or 5 × 10ⁿ) that
 * contains every value. Never dips below zero for non-negative data.
 */
export function niceScale(dataMin: number, dataMax: number, targetTicks = 4): NiceScale {
  let low = Math.min(dataMin, dataMax)
  let high = Math.max(dataMin, dataMax)
  if (low === high) {
    const pad = Math.max(Math.abs(low) * 0.1, 1)
    low -= pad
    high += pad
  }
  if (dataMin >= 0) low = Math.max(0, low)

  const rawStep = (high - low) / Math.max(1, targetTicks - 1)
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / magnitude - 1e-9 // tolerate noise such as 0.4 − 0.1 = 0.30000000000000004
  const factor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10
  const step = factor * magnitude

  // The epsilon stops floating-point noise (0.4 / 0.1 = 4.000000000000001) adding a whole extra step.
  const min = Math.floor(low / step + 1e-9) * step
  const max = Math.ceil(high / step - 1e-9) * step
  const ticks: number[] = []
  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push(Math.round(value * 1000) / 1000) // strip floating-point noise (0.30000000000000004)
  }
  return { min, max, ticks }
}
