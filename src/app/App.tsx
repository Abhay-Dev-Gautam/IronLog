import { useLayoutEffect, useRef } from 'react'
import { ExerciseScreen } from '../features/exercise/ExerciseScreen'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { HomeScreen } from '../features/home/HomeScreen'
import { PlanScreen } from '../features/plan/PlanScreen'
import { ProgressScreen } from '../features/progress/ProgressScreen'
import { SessionSummaryScreen } from '../features/session/SessionSummaryScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { WorkoutScreen } from '../features/workout/WorkoutScreen'
import { ButtonLink } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ScreenHeader } from '../components/ScreenHeader'
import { useSessionState } from '../hooks/useProgram'
import styles from './App.module.css'
import { ErrorBoundary } from './ErrorBoundary'
import { usePath } from './router'
import { matchRoute, paths, tabForRoute, type Route } from './routes'
import { StorageBanner } from './StorageBanner'
import { TabBar } from './TabBar'

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />
    case 'workout':
      return <WorkoutScreen dayId={route.dayId} />
    case 'history':
      return <HistoryScreen />
    case 'session':
      return <SessionSummaryScreen sessionId={route.sessionId} />
    case 'progress':
      return <ProgressScreen />
    case 'exercise':
      return <ExerciseScreen exerciseId={route.exerciseId} />
    case 'settings':
      return <SettingsScreen />
    case 'plan':
      return <PlanScreen />
    case 'not-found':
      return (
        <>
          <ScreenHeader title="Not found" />
          <EmptyState
            icon="alert"
            title="This screen doesn’t exist"
            action={
              <ButtonLink to={paths.home} replace variant="secondary">
                Go to Today
              </ButtonLink>
            }
          >
            The link may be out of date.
          </EmptyState>
        </>
      )
  }
}

/**
 * On navigation: start at the top and move focus to the new screen's title.
 * A layout effect, so a screen's own scrolling (e.g. jumping to the current
 * exercise on resume) runs afterwards and wins.
 */
function useScreenChange(path: string) {
  const previous = useRef(path)
  useLayoutEffect(() => {
    if (previous.current === path) return
    previous.current = path
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  }, [path])
}

export function App() {
  const path = usePath()
  const route = matchRoute(path)
  const tab = tabForRoute(route)
  const { status } = useSessionState()
  useScreenChange(path)

  // Local data loads in a few milliseconds; render nothing rather than a flash of empty screens.
  if (status === 'loading') return <div className={styles.shell} />

  return (
    <div className={styles.shell} data-tabbar={tab ? 'visible' : 'hidden'}>
      <div className={styles.statusScrim} aria-hidden="true" />
      {/* Keyed by path: each screen mounts fresh and a crashed screen recovers on navigation. */}
      <main key={path} className={styles.main}>
        <StorageBanner />
        <ErrorBoundary>
          <RouteScreen route={route} />
        </ErrorBoundary>
      </main>
      {tab && <TabBar active={tab} />}
    </div>
  )
}
