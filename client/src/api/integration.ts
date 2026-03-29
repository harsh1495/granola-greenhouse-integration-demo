import { useQuery } from '@tanstack/react-query'
import type { IIntegration, IIntegrationDetail, IntegrationType } from './types'

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchIntegrations(): Promise<IIntegration[]> {
  const res = await fetch('/api/granola/integration')
  if (!res.ok) throw new Error('Failed to fetch integrations')
  return res.json()
}

async function fetchIntegration(integration: IntegrationType): Promise<IIntegrationDetail> {
  const res = await fetch(`/api/granola/integration/${integration}`)
  if (!res.ok) throw new Error(`Failed to fetch ${integration} integration status`)
  return res.json()
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: fetchIntegrations,
  })
}

export function useIntegrationStatus(integration: IntegrationType) {
  return useQuery({
    queryKey: ['integrations', integration, 'status'],
    queryFn: () => fetchIntegration(integration),
  })
}
