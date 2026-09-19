import { describe, expect, it } from 'vitest'
import { makeSet, type SetInput } from '../test/fixtures'
import { assessPerformance } from './progression'

const sets = (...inputs: SetInput[]) => inputs.map(makeSet)
const TARGET = { min: 8, max: 12 }
const RIR = { min: 2, max: 4 }

describe('assessPerformance', () => {
  it('recognises every working set at the top of the range within target effort', () => {
    const result = assessPerformance(sets({ kg: 40, reps: 12, rir: 2 }, { kg: 40, reps: 12, rir: 3 }), TARGET, RIR)
    expect(result).toMatchObject({
      workingWeightKg: 40,
      workingSets: 2,
      repsAtWorkingWeight: [12, 12],
      reachedTopOfRange: true,
      lowestRir: 2,
      effortWithinTarget: true,
      meetsDoubleProgression: true,
    })
  })

  it('does not meet the condition when a set fell short of the top of the range', () => {
    const result = assessPerformance(sets({ kg: 40, reps: 12, rir: 2 }, { kg: 40, reps: 11, rir: 2 }), TARGET, RIR)
    expect(result).toMatchObject({ reachedTopOfRange: false, meetsDoubleProgression: false, setsBelowRange: 0 })
  })

  it('does not meet the condition when the sets were harder than the target effort', () => {
    const result = assessPerformance(sets({ kg: 40, reps: 12, rir: 0 }, { kg: 40, reps: 12, rir: 1 }), TARGET, RIR)
    expect(result).toMatchObject({ reachedTopOfRange: true, effortWithinTarget: false, meetsDoubleProgression: false })
  })

  it('assesses the heaviest load as the working weight and counts lighter sets separately', () => {
    const result = assessPerformance(sets({ kg: 42.5, reps: 7 }, { kg: 40, reps: 12 }), TARGET, RIR)
    expect(result).toMatchObject({ workingWeightKg: 42.5, workingSets: 1, lighterSets: 1, setsBelowRange: 1 })
  })

  it('leaves effort unknown when RIR was not logged', () => {
    const result = assessPerformance(sets({ kg: 40, reps: 12 }), TARGET, RIR)
    expect(result).toMatchObject({ lowestRir: null, effortWithinTarget: null })
  })

  it('returns null when there is nothing to assess', () => {
    expect(assessPerformance([], TARGET, RIR)).toBeNull()
    expect(assessPerformance(sets({ kg: 40, reps: 12, done: false }), TARGET, RIR)).toBeNull()
    expect(assessPerformance(sets({ seconds: 45 }), TARGET, null)).toBeNull()
  })
})
