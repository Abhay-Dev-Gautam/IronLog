import type { SessionId, WorkoutPlan, WorkoutSession } from '../types/domain'
import { now } from '../utils/clock'
import { createId } from '../utils/id'
import { findWorkoutDay, resolveWorkoutDay } from './plan'
import { resetRest } from './restTimerStore'
import { settingsStore } from './settingsStore'
import type { SetValues } from './setValidation'
import { sessionStore } from './sessionStore'
import {
  addSet,
  completeSet,
  createSession,
  removeSet,
  setExerciseNotes,
  setSessionNotes,
  uncompleteSet,
  updateSetValues,
} from './workoutSession'

/*
 * Workout actions used by screens. Module-level functions keep stable
 * identities, so memoized components never re-render just because a
 * callback prop was re-created.
 */

/**
 * Starts `dayId` from the plan. If a workout is already in progress it is
 * returned instead: only one session is ever active.
 */
export function startWorkout(plan: WorkoutPlan, dayId: string): WorkoutSession | null {
  const existing = sessionStore.getState().active
  if (existing) return existing
  const day = findWorkoutDay(plan, dayId)
  if (!day) return null
  resetRest() // A new workout never inherits a leftover countdown.
  const workout = resolveWorkoutDay(plan, day, undefined, {
    restSecondsDefault: settingsStore.getSettings().restTimer.defaultSeconds,
  })
  return sessionStore.start(createSession({ plan, workout, now: now(), createId }))
}

export function editSet(exerciseId: string, setId: string, patch: Partial<SetValues>): void {
  sessionStore.updateActive((session) => updateSetValues(session, exerciseId, setId, patch))
}

export function markSetComplete(exerciseId: string, setId: string, values: SetValues): void {
  sessionStore.updateActive((session) => completeSet(session, exerciseId, setId, values, now()))
}

export function reopenSet(exerciseId: string, setId: string): void {
  sessionStore.updateActive((session) => uncompleteSet(session, exerciseId, setId))
}

export function addSetTo(exerciseId: string): void {
  sessionStore.updateActive((session) => addSet(session, exerciseId, createId()))
}

export function removeSetFrom(exerciseId: string, setId: string): void {
  sessionStore.updateActive((session) => removeSet(session, exerciseId, setId))
}

export function editExerciseNotes(exerciseId: string, notes: string): void {
  sessionStore.updateActive((session) => setExerciseNotes(session, exerciseId, notes))
}

export function editWorkoutNotes(sessionId: SessionId, notes: string): void {
  sessionStore.update(sessionId, (session) => setSessionNotes(session, notes))
}

let justFinishedId: SessionId | null = null

export function finishWorkout(): WorkoutSession | null {
  resetRest()
  const finished = sessionStore.finishActive(now())
  justFinishedId = finished?.id ?? null
  return finished
}

/** True for the session finished moments ago in this app run (shows the celebratory summary). */
export function wasJustFinished(sessionId: SessionId): boolean {
  return justFinishedId === sessionId
}

export function discardWorkout(): void {
  resetRest()
  sessionStore.discardActive()
}

export function retrySaving(): void {
  sessionStore.retryFailedWrites()
}
