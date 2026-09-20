import type { ExerciseId } from '../types/domain'
import { EXERCISES_BY_ID } from './exercises'
import type { ExerciseLibrary } from '../services/plan'

/**
 * Exercise illustrations. Exercises reference a media id, and several
 * exercises can share one drawing (a rope pushdown and a bar pushdown are
 * the same movement), so no artwork is duplicated.
 *
 * The files are local SVGs in public/exercises, drawn for IronLog: no
 * external requests, nothing copied from the web. They are deliberately
 * simple placeholders that can be swapped for better artwork later by
 * replacing the file — no code changes needed.
 */

export interface ExerciseMedia {
  id: string
  /** Local asset path. */
  src: string
  /** What the drawing shows, used as alt text. */
  description: string
}

function media(id: string, description: string): ExerciseMedia {
  return { id, src: `/exercises/${id}.svg`, description }
}

export const EXERCISE_MEDIA: Record<string, ExerciseMedia> = {
  'press-machine': media('press-machine', 'Seated machine chest press'),
  'press-incline': media('press-incline', 'Incline bench dumbbell press'),
  fly: media('fly', 'Seated chest fly machine'),
  pulldown: media('pulldown', 'Seated lat pulldown'),
  row: media('row', 'Seated cable row'),
  'press-overhead': media('press-overhead', 'Seated overhead press'),
  'raise-lateral': media('raise-lateral', 'Standing lateral raise'),
  'reverse-fly': media('reverse-fly', 'Rear delt reverse fly'),
  pushdown: media('pushdown', 'Cable triceps pushdown'),
  'overhead-extension': media('overhead-extension', 'Overhead cable triceps extension'),
  curl: media('curl', 'Standing biceps curl'),
  'leg-press': media('leg-press', 'Seated leg press'),
  squat: media('squat', 'Barbell squat'),
  hinge: media('hinge', 'Romanian deadlift hip hinge'),
  'split-squat': media('split-squat', 'Bulgarian split squat with rear foot raised'),
  'knee-extension': media('knee-extension', 'Seated leg extension machine'),
  'knee-curl': media('knee-curl', 'Seated leg curl machine'),
  'calf-raise': media('calf-raise', 'Standing calf raise on a step'),
  plank: media('plank', 'Forearm plank hold'),
  crunch: media('crunch', 'Kneeling cable crunch'),
}

/** The illustration for an exercise, or `null` when it has none or references a missing one. */
export function getExerciseMedia(exerciseId: ExerciseId, library: ExerciseLibrary = EXERCISES_BY_ID): ExerciseMedia | null {
  const mediaId = library.get(exerciseId)?.media
  if (!mediaId) return null
  return EXERCISE_MEDIA[mediaId] ?? null
}
