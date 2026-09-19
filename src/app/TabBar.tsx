import { Icon, type IconName } from '../components/Icon'
import { Link } from '../components/Link'
import { paths, type Tab } from './routes'
import styles from './TabBar.module.css'

const TABS: { tab: Tab; label: string; icon: IconName; to: string }[] = [
  { tab: 'today', label: 'Today', icon: 'dumbbell', to: paths.home },
  { tab: 'history', label: 'History', icon: 'history', to: paths.history },
  { tab: 'progress', label: 'Progress', icon: 'progress', to: paths.progress },
  { tab: 'settings', label: 'Settings', icon: 'settings', to: paths.settings },
]

export function TabBar({ active }: { active: Tab }) {
  return (
    <nav className={styles.tabbar} aria-label="Main">
      <ul className={styles.list}>
        {TABS.map(({ tab, label, icon, to }) => (
          <li key={tab}>
            <Link to={to} replace className={styles.item} aria-current={tab === active ? 'page' : undefined}>
              <Icon name={icon} size={26} strokeWidth={tab === active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
