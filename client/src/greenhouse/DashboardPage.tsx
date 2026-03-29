import { useNavigate } from 'react-router-dom'
import { useInterviews, type GHInterview } from '../api/greenhouse'
import styles from './DashboardPage.module.css'

function formatInterviewDate(dateStr: string | null): string {
  if (!dateStr) return 'Unscheduled'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function ScorecardBadge({ status }: { status: GHInterview['scorecard_status'] }) {
  if (status === 'submitted') return <span className={styles.scorecardSubmitted}>Submitted</span>
  if (status === 'draft') return <span className={styles.scorecardDraft}>Draft</span>
  return <span className={styles.scorecardPending}>Pending</span>
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: interviews = [], isLoading } = useInterviews()

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>My Dashboard</h1>

      <div className={styles.interviewsCard}>
        <div className={styles.interviewsHeader}>
          <div className={styles.interviewsTitle}>My interviews</div>
          <div className={styles.pastLink}>See past interviews &rsaquo;</div>
        </div>

        {isLoading ? (
          <div style={{ color: 'var(--gh-text-secondary)', fontSize: 13, padding: '16px 0' }}>
            Loading…
          </div>
        ) : interviews.length === 0 ? (
          <div style={{ color: 'var(--gh-text-secondary)', fontSize: 13, padding: '16px 0' }}>
            No interviews scheduled.
          </div>
        ) : (
          interviews.map((interview) => (
            <div key={interview.id} className={styles.interviewRow}>
              <div className={styles.candidateAvatar}>
                {getInitials(interview.candidate.name)}
              </div>

              <div className={styles.interviewInfo}>
                <div className={styles.interviewStage}>{interview.stage_name}</div>
                <div className={styles.interviewJob}>{interview.job.title}</div>
                <div className={styles.interviewDate}>
                  {formatInterviewDate(interview.scheduled_at)}
                </div>
                <div className={styles.interviewCandidate}>{interview.candidate.name}</div>
              </div>

              <ScorecardBadge status={interview.scorecard_status} />

              {interview.granola_note && (
                <div className={styles.granolaBadge}>
                  <div className={styles.granolaBadgeDot} />
                  Granola
                </div>
              )}

              <button
                className={styles.interviewKitButton}
                onClick={() => navigate(`/greenhouse/interviews/${interview.id}`)}
              >
                See interview kit →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
