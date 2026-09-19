import type { SessionRepository } from '../data/sessionRepository'
import type { SessionId, WorkoutSession } from '../types/domain'
import { getActiveSession } from './sessionStats'
import { finishSession } from './workoutSession'

/**
 * In-memory session state backed by a repository. Every change is applied to
 * memory synchronously (so logging feels instant) and written through to
 * storage immediately, in order. There is no manual "save".
 */

export type StorageStatus = 'loading' | 'ready' | 'unavailable'

export interface SessionState {
  status: StorageStatus
  /** Why storage could not be opened; the app then runs without saving. */
  storageError: string | null
  /** A write failed. Changes are kept in memory and can be retried. */
  saveFailed: boolean
  /** The unfinished workout, if any. Only one can be in progress at a time. */
  active: WorkoutSession | null
  /** Every other session, most recent first. */
  history: readonly WorkoutSession[]
  /** `active` + `history`. */
  all: readonly WorkoutSession[]
}

export interface SessionStore {
  getState(): SessionState
  subscribe(listener: () => void): () => void
  init(connect: () => Promise<SessionRepository>): Promise<void>
  /** Starts `session` unless a workout is already in progress; returns whichever is active. */
  start(session: WorkoutSession): WorkoutSession
  updateActive(update: (session: WorkoutSession) => WorkoutSession): void
  /** Completes the active workout and returns it. */
  finishActive(now: Date): WorkoutSession | null
  /** Permanently deletes the active workout. */
  discardActive(): void
  /** Updates any session by ID (e.g. the note on a finished workout). */
  update(id: SessionId, update: (session: WorkoutSession) => WorkoutSession): void
  retryFailedWrites(): void
  /** Resolves once all queued writes have settled. */
  flush(): Promise<void>
}

/** The app's session store. Initialised once at startup (see main.tsx). */
export const sessionStore: SessionStore = createSessionStore()

function byStartedAtDesc(a: WorkoutSession, b: WorkoutSession): number {
  return Date.parse(b.startedAt) - Date.parse(a.startedAt)
}

function derive(state: Omit<SessionState, 'all'>): SessionState {
  return { ...state, all: state.active ? [state.active, ...state.history] : state.history }
}

export function createSessionStore(): SessionStore {
  let state: SessionState = derive({
    status: 'loading',
    storageError: null,
    saveFailed: false,
    active: null,
    history: [],
  })
  let repository: SessionRepository | null = null
  let queue: Promise<void> = Promise.resolve()
  const failedWrites = new Map<SessionId, 'save' | 'delete'>()
  const listeners = new Set<() => void>()

  function setState(patch: Partial<Omit<SessionState, 'all'>>) {
    state = derive({ ...state, ...patch })
    listeners.forEach((listener) => listener())
  }

  function enqueue(id: SessionId, kind: 'save' | 'delete', session?: WorkoutSession) {
    const repo = repository
    if (!repo) return // Storage unavailable: memory only, already surfaced via `storageError`.
    queue = queue.then(async () => {
      try {
        if (kind === 'save' && session) await repo.save(session)
        else await repo.delete(id)
        if (failedWrites.delete(id) && failedWrites.size === 0) setState({ saveFailed: false })
      } catch (error) {
        console.error('[IronLog] Failed to write session', id, error)
        failedWrites.set(id, kind)
        setState({ saveFailed: true })
      }
    })
  }

  function findSession(id: SessionId): WorkoutSession | undefined {
    return state.active?.id === id ? state.active : state.history.find((session) => session.id === id)
  }

  function updateActive(update: (session: WorkoutSession) => WorkoutSession) {
    const current = state.active
    if (!current) return
    const next = update(current)
    if (next === current) return
    setState({ active: next })
    enqueue(next.id, 'save', next)
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async init(connect) {
      try {
        repository = await connect()
        const sessions = await repository.list()
        const active = getActiveSession(sessions)
        setState({
          status: 'ready',
          active,
          history: sessions.filter((session) => session !== active).sort(byStartedAtDesc),
        })
      } catch (error) {
        repository = null
        console.error('[IronLog] Local storage unavailable', error)
        setState({
          status: 'unavailable',
          storageError: error instanceof Error ? error.message : 'Local storage is unavailable.',
        })
      }
    },

    start(session) {
      if (state.active) return state.active
      setState({ active: session })
      enqueue(session.id, 'save', session)
      return session
    },

    updateActive,

    finishActive(now) {
      const current = state.active
      if (!current) return null
      const finished = finishSession(current, now)
      setState({ active: null, history: [finished, ...state.history].sort(byStartedAtDesc) })
      enqueue(finished.id, 'save', finished)
      return finished
    },

    discardActive() {
      const current = state.active
      if (!current) return
      setState({ active: null })
      enqueue(current.id, 'delete')
    },

    update(id, update) {
      if (state.active?.id === id) {
        updateActive(update)
        return
      }
      const current = state.history.find((session) => session.id === id)
      if (!current) return
      const next = update(current)
      if (next === current) return
      setState({ history: state.history.map((session) => (session.id === id ? next : session)) })
      enqueue(id, 'save', next)
    },

    retryFailedWrites() {
      for (const [id, kind] of [...failedWrites]) {
        const session = findSession(id)
        if (kind === 'delete' || !session) enqueue(id, 'delete')
        else enqueue(id, 'save', session)
      }
    },

    flush: () => queue,
  }
}
