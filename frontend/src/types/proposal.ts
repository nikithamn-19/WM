import type { Vote } from './vote'

export interface Proposal {
  prpId: string
  itnId: string
  proposedByUserId: string
  proposedByDisplayName: string
  action: string
  entityType: string | null
  entityId: string | null
  title: string
  rationale: string // NOT description
  costDelta: string // money as string, NOT estimatedCost
  currency: string
  closesAt: string | null
  status: 'open' | 'accepted' | 'rejected' | 'expired'
  currentRound: number
  votes: Vote[]
}
