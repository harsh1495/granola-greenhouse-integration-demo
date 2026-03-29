import { useQuery } from '@tanstack/react-query'
import type { ListNotesOutput, Note, NoteSummary } from './types'

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchNotes(): Promise<ListNotesOutput> {
  const res = await fetch('/api/granola/notes')
  if (!res.ok) throw new Error('Failed to fetch notes')
  return res.json()
}

async function fetchNote(id: string): Promise<Note> {
  const res = await fetch(`/api/granola/notes/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch note ${id}`)
  return res.json()
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
    select: (data) => data.notes as Note[],
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => fetchNote(id),
    enabled: !!id,
  })
}

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: fetchNotes,
    select: (data): NoteSummary[] => {
      const now = new Date()
      return data.notes.filter((note) => {
        const event = (note as Note).calendar_event
        return event?.scheduled_start_time
          ? new Date(event.scheduled_start_time) >= now
          : false
      })
    },
  })
}
