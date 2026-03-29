import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useInterview, useScorecard, useAutofill, useSaveScorecard } from '../api/greenhouse'
import styles from './InterviewKitPage.module.css'

const TABS = ['Interview Prep', 'Job Details', 'Resume', 'Scorecard']

const RECOMMENDATIONS = [
  { value: 'definitely_not', label: 'Definitely Not', activeStyle: styles.recommendationDefinitelyNot },
  { value: 'no', label: 'No', activeStyle: styles.recommendationNo },
  { value: 'yes', label: 'Yes', activeStyle: styles.recommendationYes },
  { value: 'strong_yes', label: 'Strong Yes', activeStyle: styles.recommendationStrongYes },
] as const

export default function InterviewKitPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()
  const id = Number(interviewId)

  const { data: interview, isLoading: loadingInterview } = useInterview(id)
  const { data: scorecard, isLoading: loadingScorecard } = useScorecard(id)
  const autofill = useAutofill(id)
  const saveScorecard = useSaveScorecard(id)

  const [notes, setNotes] = useState<string>('')
  const [keyTakeaways, setKeyTakeaways] = useState<string>('')
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [notesHighlighted, setNotesHighlighted] = useState(false)
  const [autofillDone, setAutofillDone] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Populate from existing scorecard on first load
  if (scorecard && !initialized) {
    setNotes(scorecard.notes ?? '')
    setKeyTakeaways(scorecard.key_takeaways ?? '')
    setRecommendation(scorecard.overall_recommendation ?? null)
    setSubmitted(scorecard.status === 'submitted')
    setInitialized(true)
  }

  async function handleAutofill() {
    try {
      const result = await autofill.mutateAsync()
      setNotes(result.notes ?? '')
      setNotesHighlighted(true)
      setAutofillDone(true)
      setTimeout(() => setNotesHighlighted(false), 3000)
    } catch {
      // Handled by mutation error state
    }
  }

  async function handleSaveDraft() {
    await saveScorecard.mutateAsync({
      notes,
      key_takeaways: keyTakeaways,
      overall_recommendation: recommendation,
      status: 'draft',
    })
  }

  async function handleSubmit() {
    await saveScorecard.mutateAsync({
      notes,
      key_takeaways: keyTakeaways,
      overall_recommendation: recommendation,
      status: 'submitted',
    })
    setSubmitted(true)
  }

  if (loadingInterview || loadingScorecard) {
    return (
      <div className={styles.container} style={{ color: 'var(--gh-text-secondary)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (!interview) {
    return <div className={styles.container}>Interview not found.</div>
  }

  const hasGranolaNote = !!interview.granola_note

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerLabel}>INTERVIEW KIT</span>
        <button className={styles.closeButton} onClick={() => navigate('/greenhouse/dashboard')}>
          ×
        </button>
      </div>

      <div className={styles.jobTitle}>{interview.job.title}</div>
      <div className={styles.stageTitle}>{interview.stage_name}</div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <div key={tab} className={tab === 'Scorecard' ? styles.tabActive : styles.tab}>
            {tab}
          </div>
        ))}
      </div>

      {/* Granola Autofill Banner */}
      {hasGranolaNote && !autofillDone && !submitted && (
        <div className={styles.autofillBanner}>
          <div className={styles.autofillHeader}>
            <div className={styles.autofillTitle}>
              <div className={styles.autofillIcon}>✦</div>
              Granola Scorecard Autofill
            </div>
            <div className={styles.autofillLearnMore}>Learn more ›</div>
          </div>

          <div className={styles.autofillOptions}>
            <div className={styles.autofillOptionsLabel}>
              Autofill options: Include additional summary
              <div className={styles.autofillToggle}>
                <div className={styles.autofillToggleDot} />
              </div>
            </div>
            <button
              className={styles.autofillButton}
              onClick={handleAutofill}
              disabled={autofill.isPending}
            >
              <span className={styles.autofillButtonIcon}>✦</span>
              {autofill.isPending ? 'Autofilling…' : 'Autofill scorecard'}
            </button>
          </div>

          <div className={styles.autofillMatch}>
            <span className={styles.autofillMatchIcon}>📄</span>
            <div className={styles.autofillMatchText}>
              <div className={styles.autofillMatchTitle}>
                {interview.granola_note?.note_title ?? 'Interview note'}
              </div>
              <div className={styles.autofillMatchSub}>We matched this from your Granola notes</div>
            </div>
          </div>
        </div>
      )}

      {autofillDone && (
        <div className={styles.autofillDone}>
          <div className={styles.autofillDoneText}>
            ✓ Scorecard autofilled from your Granola note
          </div>
        </div>
      )}

      {/* Bias reminder */}
      <div className={styles.biasReminder}>
        <div className={styles.biasIcons}>
          <span className={styles.biasIcon}>⚖</span>
        </div>
        <div>
          <div className={styles.biasText}>Remember to focus on job-relevant qualifications</div>
          <div className={styles.biasSub}>
            Evaluate candidates based on skills and experience that are directly related to the role.
          </div>
        </div>
      </div>

      {/* Scorecard form */}
      {submitted ? (
        <div className={styles.submittedCard}>
          <div className={styles.submittedTitle}>✓ Scorecard submitted</div>
          <div className={styles.submittedSub}>
            Your scorecard for {interview.candidate.name} has been submitted.
          </div>
        </div>
      ) : (
        <div className={styles.scorecardCard}>
          {/* Notes */}
          <div className={styles.scorecardSection}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div className={styles.scorecardLabel}>Interview Notes</div>
              {notes && (
                <button className={styles.clearFieldsButton} onClick={() => setNotes('')}>
                  Clear
                </button>
              )}
            </div>
            <div className={styles.scorecardSublabel}>
              Notes are only visible to you and other interviewers on this interview.
            </div>
            <textarea
              className={notesHighlighted ? styles.textareaHighlighted : styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your interview notes here…"
            />
          </div>

          {/* Key takeaways */}
          <div className={styles.scorecardSection}>
            <div className={styles.scorecardLabel}>Key Takeaways</div>
            <div className={styles.scorecardSublabel}>
              Summarize the most important points from the interview.
            </div>
            <textarea
              className={styles.textarea}
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              placeholder="Key takeaways from this interview…"
              style={{ minHeight: 80 }}
            />
          </div>

          {/* Overall recommendation */}
          <div className={styles.scorecardSection}>
            <div className={styles.scorecardLabel}>Overall Recommendation</div>
            <div className={styles.recommendationGroup}>
              {RECOMMENDATIONS.map(({ value, label, activeStyle }) => (
                <button
                  key={value}
                  className={recommendation === value ? activeStyle : styles.recommendationOption}
                  onClick={() => setRecommendation(recommendation === value ? null : value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.submitRow}>
            <button
              className={styles.saveDraftButton}
              onClick={handleSaveDraft}
              disabled={saveScorecard.isPending}
            >
              Save draft
            </button>
            <button
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={saveScorecard.isPending || !recommendation}
            >
              Submit Scorecard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
