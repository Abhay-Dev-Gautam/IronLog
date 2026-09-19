import { useSyncExternalStore } from 'react'
import { DEFAULT_PLAN } from '../data/defaultPlan'
import { sessionStore, type SessionState } from '../services/sessionStore'
import type { WorkoutPlan, WorkoutSession } from '../types/domain'

/*
 * Data access for screens. Screens read through these hooks and change data
 * through services/workoutActions; neither touches storage directly.
 */

export function usePlan(): WorkoutPlan {
  return DEFAULT_PLAN
}

export function useSessionState(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState)
}

/** Every session: the active one (if any) followed by history, most recent first. */
export function useSessions(): readonly WorkoutSession[] {
  return useSessionState().all
}

export function useActiveSession(): WorkoutSession | null {
  return useSessionState().active
}

export function useSessionHistory(): readonly WorkoutSession[] {
  return useSessionState().history
}
