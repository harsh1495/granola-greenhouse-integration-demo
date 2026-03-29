import { useNavigate } from 'react-router-dom'
import { useNotes } from '../api/granola'
import type { Note } from '../api/types'
import styles from './NotesPage.module.css'

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getAttendeeSubtitle(note: Note): string {
  const others = note.attendees?.filter((a) => a.email !== note.owner?.email)
  return others?.[0]?.name ?? others?.[0]?.email ?? ''
}

function groupByDate(notes: Note[]): [string, Note[]][] {
  const groups = new Map<string, Note[]>()
  for (const note of notes) {
    const dateStr = note.calendar_event?.scheduled_start_time ?? note.created_at
    const label = formatDateLabel(dateStr)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(note)
  }
  return Array.from(groups.entries())
}

export default function NotesPage() {
  const navigate = useNavigate()
  const { data: notes = [], isLoading } = useNotes()
  const dateGroups = groupByDate(notes)

  return (
    <div className={styles.container}>
      <div className={styles.lockIcon}>🔒</div>
      <h2 className={styles.heading}>My notes</h2>
      <p className={styles.subtitle}>Your private notes and folders</p>

      {/* Decorative chat area */}
      <div className={styles.chatArea}>
        <div className={styles.chatScope}>
          <span className={styles.chatScopeLock}>🔒</span>
          My notes
        </div>
        <div className={styles.chatInput}>
          <span className={styles.chatPlaceholder}>Ask anything</span>
          <div className={styles.chatRight}>
            <span className={styles.chatModel}>✦ Flash</span>
          </div>
        </div>
      </div>

      {/* Decorative recipe pills */}
      <div className={styles.recipes}>
        {['Write weekly recap', 'Coach me', 'List recent todos'].map((label) => (
          <div key={label} className={styles.recipePill}>
            <span className={styles.recipePillIcon}>✦</span>
            {label}
          </div>
        ))}
        <div className={styles.allRecipes}>All recipes →</div>
      </div>

      <div className={styles.divider} />

      {/* Notes grouped by date */}
      {isLoading ? (
        <p style={{ color: 'var(--granola-text-secondary)', fontSize: 13 }}>Loading notes…</p>
      ) : (
        dateGroups.map(([dateLabel, groupNotes]) => (
          <div key={dateLabel}>
            <div className={styles.dateLabel}>{dateLabel}</div>
            {groupNotes.map((note) => {
              const attendee = getAttendeeSubtitle(note)
              const timeStr = note.calendar_event?.scheduled_start_time
                ? formatTime(note.calendar_event.scheduled_start_time)
                : formatTime(note.created_at)

              return (
                <div
                  key={note.id}
                  className={styles.noteRow}
                  onClick={() => navigate(`/granola/notes/${note.id}`)}
                >
                  <div className={styles.noteIcon}>📄</div>
                  <div className={styles.noteInfo}>
                    <div className={styles.noteTitle}>{note.title}</div>
                    {attendee && (
                      <div className={styles.noteSubtitle}>{attendee}</div>
                    )}
                  </div>
                  <div className={styles.noteRight}>
                    <span className={styles.noteTime}>{timeStr}</span>
                    <span className={styles.noteLock}>🔒</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
