import type { Trip } from './trip'

export interface GroupMatch {
  trip: Trip
  compatibilityScore: number // integer 0-100
  ageGroupMatch: boolean
  sharedLanguages: string[]
  sharedInterests: string[]
  dateOverlapDays: number
}

export interface TourGuide {
  gidId: string
  cityId: string
  displayName: string
  languages: string[]
  specialisation: string
  dayRate: string
  halfDayRate: string
  currency: string
  rating: number | null
  reviewCount: number
  certified: boolean
  bio: string
}

export interface GuideMatch {
  guide: TourGuide
  compatibilityScore: number // integer 0-100
  sharedLanguages: string[]
  sharedSpecialisations: string[]
}
