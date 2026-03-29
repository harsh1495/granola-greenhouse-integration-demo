import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import styles from './OAuthPage.module.css'

const PERMISSIONS = [
  'Read candidate and interview data',
  'Write notes to interview scorecards',
  'View your interview schedule',
]

export default function OAuthPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { provider } = useParams<{ provider: string }>()

  async function handleAuthorize() {
    await fetch(`/api/granola/integration/${provider}/authorize/confirm`, { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['integrations', provider, 'status'] })
    navigate(`/granola/integration/${provider}`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logos}>
          <div className={styles.logoGranola}>G</div>
          <span className={styles.logoArrow}>→</span>
          <div className={styles.logoGreenhouse}>GH</div>
        </div>

        <div className={styles.title}>Authorize Granola</div>
        <div className={styles.subtitle}>
          Granola is requesting access to your Greenhouse account to push interview notes into scorecards.
        </div>

        <div className={styles.permissions}>
          <div className={styles.permissionsTitle}>Granola will be able to:</div>
          {PERMISSIONS.map((p) => (
            <div key={p} className={styles.permission}>
              <span className={styles.permissionIcon}>✓</span>
              {p}
            </div>
          ))}
        </div>

        <div className={styles.buttons}>
          <button className={styles.authorizeButton} onClick={handleAuthorize}>
            Authorize
          </button>
          <button className={styles.denyButton} onClick={() => navigate(`/granola/integration/${provider}`)}>
            Deny
          </button>
        </div>
      </div>
    </div>
  )
}
