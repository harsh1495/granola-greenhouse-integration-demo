import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GHCandidate {
  id: number
  name: string
  email: string
}

export interface GHJob {
  id: number
  title: string
}

export interface GHInterview {
  id: number
  candidate_id: number
  job_id: number
  stage_name: string
  interviewer_name: string
  scheduled_at: string | null
  candidate: GHCandidate
  job: GHJob
  scorecard_status: 'pending' | 'draft' | 'submitted'
  granola_note: GHImportedNote | null
}

export interface GHImportedNote {
  id: number
  interview_id: number
  granola_note_id: string
  summary_markdown: string | null
  summary_text: string
  imported_at: string
  note_title?: string
}

export interface GHScorecard {
  id: number | null
  interview_id: number
  candidate_id: number
  interviewer_name: string
  status: 'pending' | 'draft' | 'submitted'
  submitted_at: string | null
  overall_recommendation: string | null
  key_takeaways: string
  notes: string
}

export interface GHAutofillResult {
  notes: string
  key_takeaways: string
  granola_note_id: string
  summary_markdown: string | null
  imported_at: string
}

// ── Fetchers ───────────────────────────────────────────────────────────────────

async function fetchInterviews(): Promise<GHInterview[]> {
  const res = await fetch('/api/greenhouse/interviews')
  if (!res.ok) throw new Error('Failed to fetch interviews')
  return res.json()
}

async function fetchInterview(id: number): Promise<GHInterview> {
  const res = await fetch(`/api/greenhouse/interviews/${id}`)
  if (!res.ok) throw new Error('Failed to fetch interview')
  return res.json()
}

async function fetchScorecard(interviewId: number): Promise<GHScorecard> {
  const res = await fetch(`/api/greenhouse/interviews/${interviewId}/scorecard`)
  if (!res.ok) throw new Error('Failed to fetch scorecard')
  return res.json()
}

async function postAutofill(interviewId: number): Promise<GHAutofillResult> {
  const res = await fetch(`/api/greenhouse/interviews/${interviewId}/autofill`, { method: 'POST' })
  if (!res.ok) throw new Error('No Granola note found for this interview')
  return res.json()
}

async function postScorecard(interviewId: number, data: Partial<GHScorecard>): Promise<GHScorecard> {
  const res = await fetch(`/api/greenhouse/interviews/${interviewId}/scorecard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save scorecard')
  return res.json()
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useInterviews() {
  return useQuery({ queryKey: ['gh-interviews'], queryFn: fetchInterviews })
}

export function useInterview(id: number) {
  return useQuery({
    queryKey: ['gh-interviews', id],
    queryFn: () => fetchInterview(id),
    enabled: !!id,
  })
}

export function useScorecard(interviewId: number) {
  return useQuery({
    queryKey: ['gh-scorecard', interviewId],
    queryFn: () => fetchScorecard(interviewId),
    enabled: !!interviewId,
  })
}

export function useAutofill(interviewId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postAutofill(interviewId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gh-interviews', interviewId] })
    },
  })
}

export function useSaveScorecard(interviewId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<GHScorecard>) => postScorecard(interviewId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gh-scorecard', interviewId] })
      qc.invalidateQueries({ queryKey: ['gh-interviews'] })
    },
  })
}
