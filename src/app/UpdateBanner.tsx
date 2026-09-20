import { useSyncExternalStore } from 'react'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { applyUpdate, isUpdateReady, subscribeToUpdates } from './serviceWorker'
import styles from './UpdateBanner.module.css'

/** Offers a waiting update. Nothing changes until the user taps Reload. */
export function UpdateBanner() {
  const ready = useSyncExternalStore(subscribeToUpdates, isUpdateReady, () => false)
  if (!ready) return null

  return (
    <output className={styles.banner}>
      <Icon name="download" size={22} />
      <p className={styles.text}>A new version of IronLog is ready.</p>
      <Button variant="secondary" onClick={applyUpdate}>
        Reload
      </Button>
    </output>
  )
}
