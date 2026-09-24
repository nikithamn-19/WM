export interface User {
  usrId: string
  id?: string
  displayName: string
  email: string
  homeCityId: string
  locale: string
  budgetBand: string
  travelStyle: string
  travellerType: string
  clerkUserId?: string
  fullName?: string
  avatarUrl?: string
  bio?: string
  ageGroup?: string
  age?: number
  preferences?: UserPreferences | null
  isOnboarded?: boolean
}

export interface UserPreferences {
  preferenceId: string
  usrId: string
  preferredLanguages: string[]
  interests: string[]
  hashtags?: string[]
  preferredMode?: 'Mode A' | 'Mode NA'
  tripTypePreference?: 'solo' | 'group' | 'both'
  sameAgeGroupOnly?: boolean
  furtherPreferences?: string
  pace: string
  maxDailyBudget: string | null
  preferredCurrency: string
}
