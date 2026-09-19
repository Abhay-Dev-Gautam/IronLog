import type { Exercise, ExerciseId, MuscleGroup } from '../types/domain'

/**
 * Exercise library. Plan days reference these by ID, so an exercise that
 * appears on several days (e.g. Lat Pulldown on Monday and Thursday) shares
 * one history and one set of personal records.
 */
export const EXERCISES: readonly Exercise[] = [
  // Chest
  { id: 'flat-chest-press-machine', name: 'Flat Chest Press Machine', muscles: ['chest'], tracking: 'weight-reps', supportsEstimated1RM: true },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Bench Press', muscles: ['chest', 'shoulders'], tracking: 'weight-reps', supportsEstimated1RM: true },
  { id: 'pec-deck', name: 'Pec Deck / Chest Fly', muscles: ['chest'], tracking: 'weight-reps', supportsEstimated1RM: false },

  // Back
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscles: ['back'], tracking: 'weight-reps', supportsEstimated1RM: true },
  { id: 'chest-supported-row', name: 'Chest-Supported Row', muscles: ['back'], tracking: 'weight-reps', supportsEstimated1RM: true },
  { id: 'cable-row', name: 'Cable Row', muscles: ['back'], tracking: 'weight-reps', supportsEstimated1RM: true },

  // Shoulders
  { id: 'shoulder-press', name: 'Shoulder Press', muscles: ['shoulders'], tracking: 'weight-reps', supportsEstimated1RM: true },
  { id: 'lateral-raise', name: 'Cable / Dumbbell Lateral Raise', muscles: ['shoulders'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscles: ['shoulders'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', muscles: ['rear-delts'], tracking: 'weight-reps', supportsEstimated1RM: false },

  // Arms
  { id: 'triceps-pushdown', name: 'Triceps Pushdown', muscles: ['triceps'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'rope-triceps-pushdown', name: 'Rope Triceps Pushdown', muscles: ['triceps'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'overhead-cable-triceps-extension', name: 'Overhead Cable Triceps Extension', muscles: ['triceps'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'biceps-curl', name: 'Dumbbell / Cable Biceps Curl', muscles: ['biceps'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'hammer-curl', name: 'Hammer Curl', muscles: ['biceps'], tracking: 'weight-reps', supportsEstimated1RM: false },

  // Legs
  { id: 'leg-press', name: 'Leg Press', muscles: ['quads', 'glutes'], tracking: 'weight-reps', supportsEstimated1RM: true },
  // Two different movements share this slot, so an e1RM would compare unlike lifts.
  { id: 'squat-or-leg-press', name: 'Squat or Leg Press', muscles: ['quads', 'glutes'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscles: ['hamstrings', 'glutes'], tracking: 'weight-reps', supportsEstimated1RM: true },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscles: ['quads', 'glutes'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'leg-extension', name: 'Leg Extension', muscles: ['quads'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'leg-curl', name: 'Seated / Lying Leg Curl', muscles: ['hamstrings'], tracking: 'weight-reps', supportsEstimated1RM: false },
  { id: 'calf-raise', name: 'Standing / Seated Calf Raise', muscles: ['calves'], tracking: 'weight-reps', supportsEstimated1RM: false },

  // Core
  { id: 'plank', name: 'Plank', muscles: ['core'], tracking: 'duration', supportsEstimated1RM: false },
  { id: 'cable-crunch', name: 'Cable Crunch / Ab Exercise', muscles: ['core'], tracking: 'weight-reps', supportsEstimated1RM: false },
]

export const EXERCISES_BY_ID: ReadonlyMap<ExerciseId, Exercise> = new Map(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
)

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  'rear-delts': 'Rear Delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
}
