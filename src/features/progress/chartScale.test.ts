import { describe, expect, it } from 'vitest'
import { niceScale } from './chartScale'

describe('niceScale', () => {
  it('uses round steps that contain the data', () => {
    expect(niceScale(40, 42.5)).toEqual({ min: 40, max: 43, ticks: [40, 41, 42, 43] })
    expect(niceScale(807.5, 1240)).toEqual({ min: 800, max: 1400, ticks: [800, 1000, 1200, 1400] })
  })

  it('opens up a range around a single value', () => {
    const scale = niceScale(60, 60)
    expect(scale.min).toBeLessThan(60)
    expect(scale.max).toBeGreaterThan(60)
    expect(scale.ticks).toContain(60)
  })

  it('never goes below zero for non-negative data', () => {
    expect(niceScale(0, 3).min).toBe(0)
    expect(niceScale(0.5, 0.5).min).toBe(0)
  })

  it('produces clean decimal ticks', () => {
    expect(niceScale(0.1, 0.4).ticks).toEqual([0.1, 0.2, 0.3, 0.4])
  })
})
