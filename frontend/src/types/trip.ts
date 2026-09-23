import type { Proposal } from './proposal'

export type SlotStatus = 'EMPTY' | 'IN_CONSENSUS' | 'BRANCHED' | 'CONFIRMED'

export interface TripMember {
  tmbId: string
  trpId: string
  usrId: string
  displayName: string
  role: 'owner' | 'editor' | 'viewer'
  joinedAt: string
}

export interface ItineraryItem {
  itmId: string
  itnId: string
  dayIndex: number
  sortOrder: number
  startsAt: string | null
  endsAt: string | null
  itemType: string
  entityType: string | null
  entityId: string | null
  title: string
  cost: string // money as string e.g. "65.00"
  currency: string
  slotStatus: SlotStatus
  locked: boolean
  status: string
  timeSlot?: string
  currentRound?: number
  consensusCycle?: number
  activeProposal?: Proposal
}

export interface Itinerary {
  itnId: string
  trpId: string
  version: number // MONOTONIC
  isActive: boolean
  totalCost: string // money as string
  currency: string
  items: ItineraryItem[]
}

export interface Trip {
  trpId: string
  ownerId: string
  title: string
  destinationCityId: string
  startDate: string
  endDate: string
  partySize: number
  mode: 'Mode A' | 'Mode NA'
  status: string
  homeCurrency: string
  members: TripMember[]
  itinerary?: Itinerary
}
