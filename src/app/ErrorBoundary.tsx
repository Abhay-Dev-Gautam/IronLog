import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import styles from './ErrorBoundary.module.css'
import { navigate } from './router'
import { paths } from './routes'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/** Catches render errors so the user never faces a blank screen. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[IronLog] Unhandled render error', error, info.componentStack)
  }

  private goHome = () => {
    navigate(paths.home, { replace: true })
    this.setState({ error: null })
  }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className={styles.fallback} role="alert">
        <div className={styles.icon}>
          <Icon name="alert" size={28} />
        </div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>This screen hit an unexpected problem. Your saved data is not affected.</p>
        <details className={styles.details}>
          <summary>Technical details</summary>
          <pre>{error.message}</pre>
        </details>
        <div className={styles.actions}>
          <Button onClick={this.goHome}>Go to Today</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    )
  }
}
