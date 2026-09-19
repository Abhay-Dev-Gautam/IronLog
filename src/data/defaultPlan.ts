import type { WorkoutPlan } from '../types/domain'

/**
 * The initial 5-day hypertrophy program.
 *
 * Training parameters live here as data: `defaults` apply to every exercise
 * unless a prescription overrides them. To move to a higher-volume phase,
 * change `defaults.sets` — no UI code needs to change.
 *
 * `target` is reps for weighted exercises and seconds for timed ones.
 */
export const DEFAULT_PLAN: WorkoutPlan = {
  id: 'ironlog-5-day',
  name: 'IronLog 5-Day Split',
  defaults: {
    sets: 2,
    rir: { min: 2, max: 4 },
    restSeconds: 120,
  },
  days: [
    {
      id: 'upper-a',
      weekday: 'monday',
      name: 'Upper A',
      focus: ['Chest', 'Back', 'Shoulders', 'Arms'],
      exercises: [
        { id: 'upper-a-1', exerciseId: 'flat-chest-press-machine', target: { min: 8, max: 12 } },
        { id: 'upper-a-2', exerciseId: 'lat-pulldown', target: { min: 8, max: 12 } },
        { id: 'upper-a-3', exerciseId: 'chest-supported-row', target: { min: 8, max: 12 } },
        { id: 'upper-a-4', exerciseId: 'shoulder-press', target: { min: 8, max: 12 } },
        { id: 'upper-a-5', exerciseId: 'lateral-raise', target: { min: 12, max: 15 }, restSeconds: 90 },
        { id: 'upper-a-6', exerciseId: 'triceps-pushdown', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'upper-a-7', exerciseId: 'biceps-curl', target: { min: 10, max: 15 }, restSeconds: 90 },
      ],
    },
    {
      id: 'lower-a',
      weekday: 'tuesday',
      name: 'Lower A',
      focus: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'],
      exercises: [
        { id: 'lower-a-1', exerciseId: 'leg-press', target: { min: 8, max: 12 }, restSeconds: 180 },
        { id: 'lower-a-2', exerciseId: 'romanian-deadlift', target: { min: 8, max: 12 }, restSeconds: 180 },
        { id: 'lower-a-3', exerciseId: 'leg-extension', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'lower-a-4', exerciseId: 'leg-curl', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'lower-a-5', exerciseId: 'calf-raise', target: { min: 10, max: 15 }, restSeconds: 60 },
        {
          id: 'lower-a-6',
          exerciseId: 'plank',
          target: { min: 30, max: 60 },
          rir: null,
          restSeconds: 60,
          notes: 'Stop when your hips start to sag.',
        },
      ],
    },
    {
      id: 'push',
      weekday: 'wednesday',
      name: 'Push',
      focus: ['Chest', 'Shoulders', 'Triceps'],
      exercises: [
        { id: 'push-1', exerciseId: 'incline-dumbbell-press', target: { min: 8, max: 12 } },
        { id: 'push-2', exerciseId: 'pec-deck', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'push-3', exerciseId: 'shoulder-press', target: { min: 8, max: 12 } },
        { id: 'push-4', exerciseId: 'cable-lateral-raise', target: { min: 12, max: 15 }, restSeconds: 90 },
        { id: 'push-5', exerciseId: 'rope-triceps-pushdown', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'push-6', exerciseId: 'overhead-cable-triceps-extension', target: { min: 10, max: 15 }, restSeconds: 90 },
      ],
    },
    {
      id: 'pull',
      weekday: 'thursday',
      name: 'Pull',
      focus: ['Back', 'Rear Delts', 'Biceps'],
      exercises: [
        { id: 'pull-1', exerciseId: 'lat-pulldown', target: { min: 8, max: 12 } },
        { id: 'pull-2', exerciseId: 'chest-supported-row', target: { min: 8, max: 12 } },
        { id: 'pull-3', exerciseId: 'cable-row', target: { min: 8, max: 12 } },
        { id: 'pull-4', exerciseId: 'reverse-pec-deck', target: { min: 12, max: 15 }, restSeconds: 90 },
        { id: 'pull-5', exerciseId: 'biceps-curl', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'pull-6', exerciseId: 'hammer-curl', target: { min: 10, max: 15 }, restSeconds: 90 },
      ],
    },
    {
      id: 'lower-b',
      weekday: 'friday',
      name: 'Lower B + Core',
      focus: ['Legs', 'Glutes', 'Hamstrings', 'Core'],
      exercises: [
        {
          id: 'lower-b-1',
          exerciseId: 'squat-or-leg-press',
          target: { min: 8, max: 12 },
          restSeconds: 180,
          notes: 'Pick one and keep it consistent so progress stays comparable.',
        },
        { id: 'lower-b-2', exerciseId: 'romanian-deadlift', target: { min: 8, max: 12 }, restSeconds: 180 },
        { id: 'lower-b-3', exerciseId: 'bulgarian-split-squat', target: { min: 8, max: 12 }, notes: 'Reps are per leg.' },
        { id: 'lower-b-4', exerciseId: 'leg-extension', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'lower-b-5', exerciseId: 'leg-curl', target: { min: 10, max: 15 }, restSeconds: 90 },
        { id: 'lower-b-6', exerciseId: 'calf-raise', target: { min: 10, max: 15 }, restSeconds: 60 },
        { id: 'lower-b-7', exerciseId: 'cable-crunch', target: { min: 10, max: 15 }, restSeconds: 60 },
      ],
    },
  ],
}
