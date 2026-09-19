import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { useSessionState } from '../hooks/useProgram'
import { retrySaving } from '../services/workoutActions'
import styles from './StorageBanner.module.css'

/** Makes storage problems impossible to miss, so data is never lost silently. */
export function StorageBanner() {
  const { status, storageError, saveFailed } = useSessionState()

  if (status === 'unavailable') {
    return (
      <div className={styles.banner} role="alert">
        <Icon name="alert" size={22} />
        <p className={styles.text}>
          <strong>Workouts can’t be saved on this device.</strong> {storageError} Close other IronLog tabs and reload,
          or check that the browser isn’t in private mode.
        </p>
      </div>
    )
  }

  if (saveFailed) {
    return (
      <div className={styles.banner} role="alert">
        <Icon name="alert" size={22} />
        <p className={styles.text}>
          <strong>Your latest changes weren’t saved.</strong> They’re still here. Keep this screen open and try again.
        </p>
        <Button variant="secondary" onClick={retrySaving}>
          Retry
        </Button>
      </div>
    )
  }

  return null
}
