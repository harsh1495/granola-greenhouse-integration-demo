import { Outlet, NavLink } from 'react-router-dom'
import styles from './GranolaLayout.module.css'

const NON_FUNCTIONAL_ITEMS: Record<string, string[]> = {
  Integrations: ['Slack', 'HubSpot', 'Notion', 'Zapier', 'Affinity', 'Attio'],
}

export default function GranolaLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <span style={{ fontSize: 16, fontWeight: 350, padding: '0 4px' }}>Harsh Mehta</span>
        </div>

        <NavLink
          to="/granola"
          end
          className={({ isActive }) => isActive ? styles.navItemActive : styles.navItem}
        >
          Home
        </NavLink>

        <div className={styles.sectionLabel}>Spaces</div>

        <NavLink
          to="/granola/notes"
          className={({ isActive }) => isActive ? styles.navItemActive : styles.navItem}
        >
          My Notes
        </NavLink>

        {Object.entries(NON_FUNCTIONAL_ITEMS).map(([section, items]) => (
          <div key={section}>
            <div className={styles.sectionLabel}>{section}</div>
            {items.map((item) => (
              <div
                key={item}
                className={styles.navItem}
                style={{ cursor: 'default', pointerEvents: 'none' }}
              >
                {item}
              </div>
            ))}
            {section === 'Integrations' && (
              <NavLink
                to="/granola/integration/greenhouse"
                className={({ isActive }) => isActive ? styles.navItemActive : styles.navItem}
              >
                Greenhouse
              </NavLink>
            )}
          </div>
        ))}

        <div className={styles.sidebarBottom}>
          <div className={styles.userSection}>
            <div className={styles.userAvatar}>H</div>
            <span className={styles.userName}>Harsh Mehta</span>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
