import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useNote } from '../api/granola'
import { useIntegrationStatus } from '../api/integration'
import styles from './NoteDetailPage.module.css'

// ── Simple markdown → HTML ────────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inList = false

  for (const line of lines) {
    const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false }
      html += `<h3>${bold(line.slice(4))}</h3>`
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false }
      html += `<h2>${bold(line.slice(3))}</h2>`
    } else if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${bold(line.slice(2))}</li>`
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false }
    } else {
      if (inList) { html += '</ul>'; inList = false }
      html += `<p>${bold(line)}</p>`
    }
  }
  if (inList) html += '</ul>'
  return html
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [shareOpen, setShareOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const { data: note, isLoading } = useNote(noteId!)
  const { data: integration } = useIntegrationStatus('greenhouse')

  const isConnected = integration?.status === 'connected'
  const isSent = note?.sent_to_greenhouse ?? false

  const candidateEmail = note?.attendees
    ?.find((a) => a.email !== note.owner?.email)
    ?.email

  async function handleSendToGreenhouse() {
    if (!candidateEmail || !noteId) return
    setSending(true)
    try {
      await fetch(`/api/granola/notes/${noteId}/send-to-greenhouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_email: candidateEmail }),
      })
      queryClient.invalidateQueries({ queryKey: ['notes', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    } finally {
      setSending(false)
      setShareOpen(false)
    }
  }

  if (isLoading) {
    return <div className={styles.container} style={{ color: 'var(--granola-text-secondary)', fontSize: 13 }}>Loading…</div>
  }

  if (!note) {
    return <div className={styles.container}>Note not found.</div>
  }

  const dateStr = note.calendar_event?.scheduled_start_time ?? note.created_at
  const otherAttendees = note.attendees?.filter((a) => a.email !== note.owner?.email) ?? []

  return (
    <div className={styles.container}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className={styles.topBarRight}>
          <span className={styles.enhancedBadge}>
            <span className={styles.enhancedIcon}>✦</span>
            Enhanced
          </span>

          {isSent ? (
            <span className={styles.sentBadge}>✓ Sent to Greenhouse</span>
          ) : (
            <div className={styles.shareDropdown}>
              <button className={styles.shareButton} onClick={() => setShareOpen((o) => !o)}>
                Share
              </button>
              {shareOpen && (
                <div className={styles.shareMenu}>
                  {isConnected && candidateEmail ? (
                    <button
                      className={styles.shareMenuItem}
                      onClick={handleSendToGreenhouse}
                      disabled={sending}
                    >
                      {sending ? 'Sending…' : 'Send to Greenhouse'}
                    </button>
                  ) : (
                    <div className={styles.shareMenuItemDisabled}>
                      Send to Greenhouse
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h1 className={styles.title}>{note.title}</h1>

      {/* Metadata chips */}
      <div className={styles.metaRow}>
        <span className={styles.metaChip}>
          <span className={styles.metaChipIcon}>📅</span>
          {formatDate(dateStr)}
        </span>
        {otherAttendees.map((a) => (
          <span key={a.email} className={styles.metaChip}>
            <span className={styles.metaChipIcon}>👤</span>
            {a.name ?? a.email}
          </span>
        ))}
        <span className={styles.metaChip}>
          <span className={styles.metaChipIcon}>+</span>
          Add to folder
        </span>
      </div>

      {/* Note content */}
      <div
        className={styles.content}
        dangerouslySetInnerHTML={{
          __html: markdownToHtml(note.summary_markdown ?? note.summary_text ?? ''),
        }}
      />

      {/* Decorative chat bar */}
      <div className={styles.chatBar}>
        <div className={styles.chatBarLeft}>
          <span className={styles.chatBarToggle}>↕</span>
          <span className={styles.chatBarPlaceholder}>Ask anything</span>
        </div>
        <div className={styles.chatBarRecipe}>
          <span className={styles.chatBarRecipeIcon}>✦</span>
          Write follow up email
        </div>
      </div>
    </div>
  )
}
