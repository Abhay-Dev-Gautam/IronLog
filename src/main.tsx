import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorBoundary } from './app/ErrorBoundary'
import { connectSessionRepository } from './data/storage'
import { sessionStore } from './services/sessionStore'
import './styles/tokens.css'
import './styles/global.css'

// iOS Safari only applies :active (press feedback) styles when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true })

// Load saved workouts (including any unfinished one) before the first screen shows.
void sessionStore.init(connectSessionRepository)

const container = document.getElementById('root')
if (!container) throw new Error('IronLog: #root element is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
