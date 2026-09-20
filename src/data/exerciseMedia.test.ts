import { describe, expect, it } from 'vitest'
import type { Exercise } from '../types/domain'
import { EXERCISES, EXERCISES_BY_ID } from './exercises'
import { EXERCISE_MEDIA, getExerciseMedia } from './exerciseMedia'

// Resolved by Vite at build time: the files that actually ship in public/.
const SHIPPED = new Set(Object.keys(import.meta.glob('/public/exercises/*.svg')).map((path) => path.replace('/public', '')))

describe('exercise media', () => {
  it('returns the illustration for an exercise that has one', () => {
    expect(getExerciseMedia('flat-chest-press-machine')).toEqual({
      id: 'press-machine',
      src: '/exercises/press-machine.svg',
      description: 'Seated machine chest press',
    })
  })

  it('returns nothing for an exercise without an illustration', () => {
    const noMedia: Exercise = { id: 'custom', name: 'Custom', muscles: ['chest'], tracking: 'weight-reps', supportsEstimated1RM: false }
    expect(getExerciseMedia('custom', new Map([[noMedia.id, noMedia]]))).toBeNull()
  })

  it('returns nothing for an illustration reference that does not exist', () => {
    const broken: Exercise = { ...(EXERCISES_BY_ID.get('lat-pulldown') as Exercise), media: 'not-a-drawing' }
    expect(getExerciseMedia(broken.id, new Map([[broken.id, broken]]))).toBeNull()
  })

  it('returns nothing for an unknown exercise', () => {
    expect(getExerciseMedia('does-not-exist')).toBeNull()
  })

  it('gives every exercise in the library an illustration that resolves', () => {
    const missing = EXERCISES.filter((exercise) => getExerciseMedia(exercise.id) === null).map((exercise) => exercise.id)
    expect(missing).toEqual([])
  })

  it('ships the asset file behind every illustration', () => {
    expect(SHIPPED.size).toBeGreaterThan(0)
    const absent = Object.values(EXERCISE_MEDIA)
      .filter((media) => !SHIPPED.has(media.src))
      .map((media) => media.src)
    expect(absent).toEqual([])
  })

  it('ships no unreferenced illustration files', () => {
    const referenced = new Set(Object.values(EXERCISE_MEDIA).map((media) => media.src))
    expect([...SHIPPED].filter((src) => !referenced.has(src))).toEqual([])
  })

  it('has no unused illustrations', () => {
    const used = new Set(EXERCISES.map((exercise) => exercise.media))
    expect(Object.keys(EXERCISE_MEDIA).filter((id) => !used.has(id))).toEqual([])
  })

  it('shares one drawing between exercises of the same movement', () => {
    expect(getExerciseMedia('triceps-pushdown')?.src).toBe(getExerciseMedia('rope-triceps-pushdown')?.src)
    expect(getExerciseMedia('chest-supported-row')?.src).toBe(getExerciseMedia('cable-row')?.src)
  })
})
