// ── Shared ────────────────────────────────────────────────────────────────────

export interface User {
  name: string | null
  email: string
}

// ── Granola — List Notes (/api/granola/notes) ─────────────────────────────────

export interface NoteSummary {
  id: string                  // "not_xxxxxxxxxxxxxx"
  object: 'note'
  title: string | null
  owner: User
  created_at: string
  updated_at: string
}

export interface ListNotesOutput {
  notes: NoteSummary[]
  hasMore: boolean
  cursor: string | null
}

// ── Granola — Get Note (/api/granola/notes/:id) ───────────────────────────────

export interface CalendarInvitee {
  email: string
}

export interface CalendarEvent {
  event_title: string | null
  invitees: CalendarInvitee[]
  organiser: string | null
  calendar_event_id: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
}

export interface Folder {
  id: string                  // "fol_xxxxxxxxxxxxxx"
  object: 'folder'
  name: string
}

export interface Speaker {
  source: 'microphone' | 'speaker'
}

export interface Transcript {
  speaker: Speaker
  text: string
  start_time: string
  end_time: string
}

export interface Note extends NoteSummary {
  calendar_event: CalendarEvent | null
  attendees: User[]
  folder_membership: Folder[]
  summary_text: string
  summary_markdown: string | null
  transcript: Transcript[] | null
  sent_to_greenhouse?: boolean
}

// ── Integrations ──────────────────────────────────────────────────────────────

export type IntegrationType = 'slack' | 'zapier' | 'notion' | 'attio' | 'hubspot' | 'greenhouse'

export type IntegrationStatus = 'connected' | 'disconnected'

export interface IIntegration {
  id: number
  integration: IntegrationType
}

export interface IIntegrationDetail {
  id: number
  integration: IntegrationType
  status: IntegrationStatus
  created_at: Date
  updated_at: Date
}
