import { paths } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { Link } from '../../components/Link'
import { LogoMark } from '../../components/LogoMark'
import { ScreenHeader } from '../../components/ScreenHeader'
import { SectionHeader } from '../../components/SectionHeader'
import { usePlan } from '../../hooks/useProgram'
import { formatClock } from '../../utils/format'
import styles from './SettingsScreen.module.css'

export function SettingsScreen() {
  const plan = usePlan()

  return (
    <>
      <ScreenHeader title="Settings" />

      <section aria-labelledby="settings-program">
        <SectionHeader id="settings-program" title="Program" />
        <div className={styles.group}>
          <Link to={paths.plan} className={styles.row}>
            <span className={styles.label}>Workout plan</span>
            <span className={styles.value}>{plan.name}</span>
            <Icon name="chevron-right" size={20} className={styles.chevron} />
          </Link>
        </div>
      </section>

      <section aria-labelledby="settings-training">
        <SectionHeader id="settings-training" title="Training" />
        <div className={styles.group}>
          <div className={styles.row}>
            <span className={styles.label}>Units</span>
            <span className={styles.value}>Kilograms (kg)</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Default rest</span>
            <span className={styles.value}>{formatClock(plan.defaults.restSeconds)}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-about">
        <SectionHeader id="settings-about" title="About" />
        <div className={styles.group}>
          <div className={styles.row}>
            <span className={styles.label}>Version</span>
            <span className={styles.value}>{__APP_VERSION__}</span>
          </div>
        </div>
      </section>

      <div className={styles.brand}>
        <LogoMark size={48} />
        <p className={styles.brandName}>IronLog</p>
        <p className={styles.tagline}>Train. Log. Progress.</p>
      </div>
    </>
  )
}
