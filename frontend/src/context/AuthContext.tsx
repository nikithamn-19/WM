import React, { createContext, useContext } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import type { User } from '../types/user'

interface AuthContextValue {
  currentUser: User | null
  getToken: () => Promise<string | null>
  isLoaded: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder'
  const isPlaceholderKey = !CLERK_KEY || CLERK_KEY === 'pk_test_placeholder'

  let clerkUser = null
  let clerkAuthToken: () => Promise<string | null> = async () => 'dummy_token'
  let clerkLoaded = true

  if (!isPlaceholderKey) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { user, isLoaded } = useUser()
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { getToken } = useAuth()
      clerkUser = user
      clerkAuthToken = getToken
      clerkLoaded = isLoaded
    } catch {
      // Fallback if Clerk isn't initialized
    }
  }

  const currentUser: User = clerkUser
    ? {
        usrId: clerkUser.id,
        displayName: clerkUser.fullName || clerkUser.firstName || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || 'user@example.com',
        homeCityId: 'cty_bali',
        locale: 'en',
        budgetBand: 'mid',
        travelStyle: 'cultural',
        travellerType: 'friends',
        clerkUserId: clerkUser.id,
        avatarUrl: clerkUser.imageUrl,
      }
    : {
        usrId: 'usr_demo_owner',
        displayName: 'Alex Chen',
        email: 'alex@wandermatch.app',
        homeCityId: 'cty_bali',
        locale: 'en',
        budgetBand: 'mid',
        travelStyle: 'cultural',
        travellerType: 'friends',
      }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        getToken: clerkAuthToken,
        isLoaded: clerkLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
