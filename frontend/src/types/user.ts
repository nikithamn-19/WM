export interface User {
  usrId: string
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
  ageGroup?: string
}

export interface UserPreferences {
  preferenceId: string
  usrId: string
  preferredLanguages: string[]
  interests: string[]
  pace: string
  maxDailyBudget: string | null
  preferredCurrency: string
}
