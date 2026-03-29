import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useIntegrationStatus } from '../api/integration'
import GreenhouseIcon from '../assets/greenhouse.svg?react'
import styles from './IntegrationPage.module.css'

export default function GreenhouseSettingsPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: integration, isLoading } = useIntegrationStatus('greenhouse')

  const isConnected = integration?.status === 'connected'

  async function handleDisconnect() {
    await fetch('/api/granola/integration/greenhouse/disconnect', { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['integrations', 'greenhouse', 'status'] })
  }

  return (
    <div className={styles.main}>
      <div className={styles.integrationHeader}>
        <div className={styles.integrationLogoGreenhouse}>
          <GreenhouseIcon />
        </div>
        <h2 className={styles.integrationTitle}>Greenhouse</h2>
      </div>

      <p className={styles.integrationSubtitle}>
        Send your interview notes directly to Greenhouse scorecards.
      </p>

      {isLoading ? null : isConnected ? (
        <div>
          <span className={styles.connectedBadge}>✓ Connected</span>
          <button className={styles.disconnectButton} onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className={styles.connectButton}
          onClick={() => navigate('/oauth/greenhouse')}
        >
          Connect Greenhouse ↗
        </button>
      )}

      <div className={styles.howItWorks}>
        <div className={styles.howItWorksTitle}>How it works</div>
        <div className={styles.howItWorksSubtitle}>
          Three steps to get Granola notes into Greenhouse scorecards.
        </div>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepBold}>Connect</span> — Click the button above and authorize
            Granola to access your Greenhouse account.
          </li>
          <li className={styles.step}>
            <span className={styles.stepBold}>Send a note</span> — After an interview, open the
            note and click "Send to Greenhouse".
          </li>
          <li className={styles.step}>
            <span className={styles.stepBold}>Autofill</span> — Your notes appear in the
            candidate's scorecard in Greenhouse, ready to review and submit.
          </li>
        </ol>
      </div>
    </div>
  )
}
