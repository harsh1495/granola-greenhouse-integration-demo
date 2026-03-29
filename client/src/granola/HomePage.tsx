import { useNavigate } from 'react-router-dom'
import { useNotes, useMeetings } from '../api/granola'
import type { Note } from '../api/types'
import styles from './HomePage.module.css'

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

export default function HomePage() {
  const navigate = useNavigate()
  const today = new Date()

  const { data: notes = [], isLoading } = useNotes()
  const { data: meetings = [] } = useMeetings()

  const dateGroups = groupByDate(notes as Note[])

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Coming up</h2>

      {/* Calendar card */}
      <div className={styles.calendarCard}>
        <div className={styles.calendarDate}>
          <span className={styles.calendarDay}>{today.getDate()}</span>
          <span className={styles.calendarMonth}>
            <span className={styles.calendarDot} />
            {today.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className={styles.calendarDayName}>
            {today.toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>

        <div className={styles.calendarDivider} />

        {meetings.length > 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            {(meetings as Note[]).map((meeting) => (
              <div
                key={meeting.id}
                className={styles.noteRow}
                onClick={() => navigate(`/granola/notes/${meeting.id}`)}
              >
                <div className={styles.noteIconDoc}>📄</div>
                <div className={styles.noteInfo}>
                  <div className={styles.noteTitle}>{meeting.title}</div>
                  {meeting.calendar_event?.scheduled_start_time && (
                    <div className={styles.noteSubtitle}>
                      {formatTime(meeting.calendar_event.scheduled_start_time)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.calendarEmpty}>
            <span className={styles.calendarEmptyIcon}>📅</span>
            <span className={styles.calendarEmptyText}>Nothing coming up today</span>
            <button className={styles.calendarSettingsLink}>Open calendar settings</button>
          </div>
        )}
      </div>

      {/* Past notes grouped by date */}
      {isLoading ? (
        <p style={{ color: 'var(--granola-text-secondary)', fontSize: 13 }}>Loading notes…</p>
      ) : (
        dateGroups.map(([dateLabel, groupNotes]) => (
          <div key={dateLabel} className={styles.dateGroup}>
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
                  <div className={attendee ? styles.noteIconAvatar : styles.noteIconDoc}>
                    {attendee ? attendee.slice(0, 2).toUpperCase() : '📄'}
                  </div>
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

      {/* Decorative chat bar */}
      <div className={styles.chatBar}>
        <span className={styles.chatBarPlaceholder}>Ask anything</span>
        <div className={styles.chatBarRecipe}>
          <span className={styles.chatBarRecipeIcon}>✦</span>
          Write follow up email
        </div>
      </div>
    </div>
  )
}
