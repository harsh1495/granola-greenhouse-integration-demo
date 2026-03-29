import { Outlet, useNavigate } from 'react-router-dom'
import styles from './GreenhouseLayout.module.css'

export default function GreenhouseLayout() {
  const navigate = useNavigate()

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/greenhouse/dashboard')}>
          <span style={{ color: 'var(--gh-accent)' }}>greenhouse</span>
          <span className={styles.logoSub}>Recruiting</span>
        </div>

        <div className={styles.navLinks}>
          {['Jobs', 'Candidates'].map((label) => (
            <div key={label} className={styles.navLink}>{label}</div>
          ))}
        </div>

        <div className={styles.addButton}>
          + Add <span style={{ fontSize: 10 }}>▾</span>
        </div>

        <div className={styles.navRight}>
          <div className={styles.navAvatar}>H</div>
        </div>
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
