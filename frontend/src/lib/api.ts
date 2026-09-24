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
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = isFormData
    ? {}
    : {
        'Content-Type': 'application/json',
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

// POST join request
export async function postJoinRequest(
  trpId: string,
  message: string = '',
  getToken: () => Promise<string | null>
): Promise<{ status: string; reqId?: string }> {
  return apiFetch<{ status: string; reqId?: string }>(`/api/trips/${trpId}/join-request`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, getToken)
}

// GET my join status
export async function getMyJoinStatus(
  trpId: string,
  getToken: () => Promise<string | null>
): Promise<{ status: 'member' | 'pending' | 'rejected' | 'none'; role?: string }> {
  return apiFetch<{ status: 'member' | 'pending' | 'rejected' | 'none'; role?: string }>(
    `/api/trips/${trpId}/my-join-status`,
    {},
    getToken
  )
}

// GET pending join requests (for owner)
export async function getJoinRequests(
  trpId: string,
  getToken: () => Promise<string | null>
): Promise<Array<{ requestId: string; userId: string; displayName?: string; message?: string; status: string; createdAt?: string }>> {
  return apiFetch(`/api/trips/${trpId}/join-requests`, {}, getToken)
}

// POST approve join request
export async function approveJoinRequest(
  trpId: string,
  reqId: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  return apiFetch(`/api/trips/${trpId}/join-requests/${reqId}/approve`, {
    method: 'POST',
  }, getToken)
}

// POST reject join request
export async function rejectJoinRequest(
  trpId: string,
  reqId: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  return apiFetch(`/api/trips/${trpId}/join-requests/${reqId}/reject`, {
    method: 'POST',
  }, getToken)
}

// POST save itinerary (Phase 2)
export async function saveItinerary(
  trpId: string,
  items: any[],
  expectedVersion: number = 1,
  getToken: () => Promise<string | null>
): Promise<any> {
  return apiFetch(`/api/trips/${trpId}/itinerary`, {
    method: 'POST',
    body: JSON.stringify({ items, expectedVersion }),
  }, getToken)
}

// POST auth preferences
export async function updateAuthPreferences(
  data: { age: number; languages: string[]; interests: string[]; pace: string },
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; ageGroup?: string }> {
  return apiFetch('/api/auth/preferences', {
    method: 'POST',
    body: JSON.stringify(data),
  }, getToken)
}

// PATCH auth profile
export async function updateProfile(
  data: { displayName?: string; travelStyle?: string; budgetBand?: string; homeCityId?: string },
  getToken: () => Promise<string | null>
): Promise<any> {
  return apiFetch('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, getToken)
}

// GET auth profile & preferences (/api/auth/me)
export async function getMe(getToken: () => Promise<string | null>): Promise<any> {
  return apiFetch('/api/auth/me', {}, getToken)
}

// POST generate or regenerate invite code for a trip
export async function generateInviteCode(
  trpId: string,
  getToken: () => Promise<string | null>
): Promise<{ inviteCode: string; expiresAt?: string }> {
  return apiFetch<{ inviteCode: string; expiresAt?: string }>(`/api/trips/${trpId}/invite-code`, {
    method: 'POST',
  }, getToken)
}

// POST join trip by code
export async function joinByCode(
  code: string,
  message: string = '',
  getToken: () => Promise<string | null>
): Promise<{ status: string; tripId: string; autoApproved?: boolean; requestId?: string }> {
  return apiFetch<{ status: string; tripId: string; autoApproved?: boolean; requestId?: string }>('/api/trips/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ code, message }),
  }, getToken)
}

// GET discover public trips preview
export async function getDiscoverTrips(getToken: () => Promise<string | null>): Promise<Trip[]> {
  return apiFetch<Trip[]>('/api/trips/discover', {}, getToken)
}

// POST register user directly to DB
export async function registerUser(data: {
  displayName: string
  email: string
  password?: string
  age?: number
  languages?: string[]
  interests?: string[]
  pace?: string
}): Promise<any> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// POST login user directly from DB
export async function loginUser(data: { email: string; password?: string }): Promise<any> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// POST face registration
export async function registerFace(
  formData: FormData,
  getToken?: () => Promise<string | null>
): Promise<any> {
  return apiFetch('/api/face/register', {
    method: 'POST',
    body: formData,
  }, getToken)
}

// GET user face status
export async function getFaceStatus(
  usrId: string,
  getToken?: () => Promise<string | null>
): Promise<{ registered: boolean; status?: string; details?: any }> {
  return apiFetch<{ registered: boolean; status?: string; details?: any }>(
    `/api/face/status/${usrId}`,
    {},
    getToken
  ).catch(() => ({ registered: false }))
}

// GET trip memories boards
export async function getMemoriesBoards(
  trpId: string,
  usrId?: string,
  getToken?: () => Promise<string | null>
): Promise<any> {
  const query = usrId ? `?usrId=${encodeURIComponent(usrId)}` : ''
  return apiFetch(`/api/photos/memories/${trpId}${query}`, {}, getToken).catch(() => ({
    boards: { all: [], my: [], folders: {} },
  }))
}

// GET trip photos
export async function getTripPhotos(
  trpId: string,
  folder?: string,
  taggedUserId?: string,
  getToken?: () => Promise<string | null>
): Promise<any[]> {
  const params = new URLSearchParams()
  if (folder) params.append('folder', folder)
  if (taggedUserId) params.append('taggedUserId', taggedUserId)
  const queryString = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<any[]>(`/api/photos/${trpId}${queryString}`, {}, getToken).catch(() => [])
}

// POST upload trip photo
export async function uploadTripPhoto(
  formData: FormData,
  getToken?: () => Promise<string | null>
): Promise<any> {
  return apiFetch('/api/photos', {
    method: 'POST',
    body: formData,
  }, getToken)
}




