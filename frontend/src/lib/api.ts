import type { Trip } from '../types/trip'
import type { Proposal } from '../types/proposal'
import type { Vote } from '../types/vote'
import type { Branch } from '../types/branch'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  getToken?: () => Promise<string | null>
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (getToken) {
    const token = await getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${errorText || res.statusText}`)
  }
  return res.json()
}

export interface CreateTripInput {
  title: string
  destinationCity: string
  startDate: string
  endDate: string
  partySize: number
  mode: 'Mode A' | 'Mode NA'
  notes?: string
}

export interface CreateProposalInput {
  itmId: string
  trpId: string
  title: string
  rationale: string // field name is rationale NOT description
  entityType: string
  entityId: string
  costDelta: string // costDelta NOT estimatedCost, sent as string
  currency: string
}

export interface CastVoteInput {
  prpId: string
  usrId: string
  value: 'yes' | 'no'
  comment: string | null
}

export interface ReconcileResult {
  action: 'BLENDED' | 'BRANCHED'
  blendedPlan?: {
    title: string
    rationale: string
    costDelta: string
    currency: string
    constraintStatus: 'satisfied' | 'regenerated'
  }
  currentRound?: number
}

export interface ChatMessage {
  msgId: string
  trpId: string
  usrId: string
  displayName: string
  text: string
  sentAt: string
  proposalId?: string
}

export interface SendMessageInput {
  trpId: string
  text: string
}

export interface ProposeChatResult {
  prpId: string
  status: string
}

// GET all trips for current user
export async function getTrips(getToken: () => Promise<string | null>): Promise<Trip[]> {
  return apiFetch<Trip[]>('/api/trips', {}, getToken)
}

// GET single trip with full itinerary + members + proposals
export async function getTrip(trpId: string, getToken: () => Promise<string | null>): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${trpId}`, {}, getToken)
}

// POST create trip
export async function createTrip(
  body: CreateTripInput,
  getToken: () => Promise<string | null>
): Promise<Trip> {
  return apiFetch<Trip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify(body),
  }, getToken)
}

// POST create proposal
export async function createProposal(
  body: CreateProposalInput,
  getToken: () => Promise<string | null>
): Promise<Proposal & { status?: string }> {
  return apiFetch('/api/proposals', {
    method: 'POST',
    body: JSON.stringify(body),
  }, getToken)
}

// POST cast vote
export async function castVote(
  body: CastVoteInput,
  getToken: () => Promise<string | null>
): Promise<Vote> {
  return apiFetch<Vote>('/api/votes', {
    method: 'POST',
    body: JSON.stringify(body),
  }, getToken)
}

// POST consensus reconcile
export async function reconcile(
  prpId: string,
  getToken: () => Promise<string | null>
): Promise<ReconcileResult> {
  return apiFetch<ReconcileResult>('/api/consensus/reconcile', {
    method: 'POST',
    body: JSON.stringify({ prpId }),
  }, getToken)
}

// GET branches for a slot
export async function getBranches(
  itmId: string,
  getToken: () => Promise<string | null>
): Promise<Branch[]> {
  return apiFetch<Branch[]>(`/api/items/${itmId}/branches`, {}, getToken)
}

// POST confirm branch
export async function confirmBranch(
  brcId: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  return apiFetch<void>(`/api/branches/${brcId}/confirm`, {
    method: 'POST',
  }, getToken)
}

// POST modify branch — body: { comment: string }
export async function modifyBranch(
  brcId: string,
  comment: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  return apiFetch<void>(`/api/branches/${brcId}/modify`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  }, getToken)
}

// GET chat messages
export async function getChatMessages(
  trpId: string,
  getToken: () => Promise<string | null>
): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/api/trips/${trpId}/messages`, {}, getToken)
}

// POST chat message
export async function sendChatMessage(
  body: SendMessageInput,
  getToken: () => Promise<string | null>
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>('/api/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  }, getToken)
}

// POST propose chat message as plan
export async function proposeChatMessage(
  msgId: string,
  getToken: () => Promise<string | null>
): Promise<ProposeChatResult> {
  return apiFetch<ProposeChatResult>(`/api/messages/${msgId}/propose`, {
    method: 'POST',
  }, getToken)
}

// --- Face & Memories Endpoints ---

export async function getMemoriesBoards(trpId: string, getToken?: () => Promise<string | null>) {
  return apiFetch<any>(`/api/memories/${trpId}`, {}, getToken)
}

export async function getTripPhotos(trpId: string, usrId?: string, getToken?: () => Promise<string | null>) {
  const query = usrId ? `?usrId=${encodeURIComponent(usrId)}` : ''
  return apiFetch<any[]>(`/api/photos/${trpId}${query}`, {}, getToken)
}

export async function getFaceStatus(usrId: string, getToken?: () => Promise<string | null>) {
  return apiFetch<{ registered: boolean; usrId?: string; fcpId?: string; modelVersion?: string }>(`/api/face/status/${usrId}`, {}, getToken)
}

export async function uploadTripPhoto(formData: FormData, getToken?: () => Promise<string | null>) {
  return apiFetch<any>('/api/photos', {
    method: 'POST',
    body: formData,
  }, getToken)
}

export async function registerFace(formData: FormData, getToken?: () => Promise<string | null>) {
  return apiFetch<any>('/api/face/register', {
    method: 'POST',
    body: formData,
  }, getToken)
}
