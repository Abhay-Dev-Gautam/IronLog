export type Route =
  | { name: 'home' }
  | { name: 'workout'; dayId: string }
  | { name: 'history' }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'plan' }
  | { name: 'session'; sessionId: string }
  | { name: 'exercise'; exerciseId: string }
  | { name: 'not-found'; path: string }

export type Tab = 'today' | 'history' | 'progress' | 'settings'

export const paths = {
  home: '/',
  workout: (dayId: string) => `/workout/${encodeURIComponent(dayId)}`,
  history: '/history',
  progress: '/progress',
  settings: '/settings',
  plan: '/settings/plan',
  session: (sessionId: string) => `/session/${encodeURIComponent(sessionId)}`,
  exercise: (exerciseId: string) => `/exercise/${encodeURIComponent(exerciseId)}`,
} as const

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

export function matchRoute(path: string): Route {
  const segments = path.split('/').filter(Boolean)
  const [first, second, ...rest] = segments

  if (segments.length === 0) return { name: 'home' }
  if (rest.length === 0) {
    if (first === 'workout' && second) {
      const dayId = safeDecode(second)
      if (dayId) return { name: 'workout', dayId }
    }
    if (first === 'session' && second) {
      const sessionId = safeDecode(second)
      if (sessionId) return { name: 'session', sessionId }
    }
    if (first === 'exercise' && second) {
      const exerciseId = safeDecode(second)
      if (exerciseId) return { name: 'exercise', exerciseId }
    }
    if (first === 'history' && !second) return { name: 'history' }
    if (first === 'progress' && !second) return { name: 'progress' }
    if (first === 'settings' && !second) return { name: 'settings' }
    if (first === 'settings' && second === 'plan') return { name: 'plan' }
  }
  return { name: 'not-found', path }
}

/** Which tab is highlighted for a route; `null` hides the tab bar (focused screens). */
export function tabForRoute(route: Route): Tab | null {
  switch (route.name) {
    case 'home':
    case 'not-found':
      return 'today'
    case 'history':
    case 'session':
      return 'history'
    case 'progress':
    case 'exercise':
      return 'progress'
    case 'settings':
    case 'plan':
      return 'settings'
    case 'workout':
      return null
  }
}
