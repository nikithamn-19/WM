import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useUser, useAuth, useClerk } from '@clerk/clerk-react'
import type { User } from '../types/user'
import { getMe } from '../lib/api'

interface AuthContextValue {
  currentUser: User | null
  getToken: () => Promise<string | null>
  isLoaded: boolean
  isOnboarded: boolean
  refreshDbUser: () => Promise<void>
  signInLocal: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder'
  const isPlaceholderKey = !CLERK_KEY || CLERK_KEY === 'pk_test_placeholder'

  let clerkUser: any = null
  let clerkAuthToken: () => Promise<string | null> = async () => 'dummy_token'
  let clerkLoaded = true
  let clerkSignOut: (() => Promise<void>) | null = null

  if (!isPlaceholderKey) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { user, isLoaded } = useUser()
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { getToken } = useAuth()
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { signOut } = useClerk()
      clerkUser = user
      clerkAuthToken = getToken
      clerkLoaded = isLoaded
      clerkSignOut = signOut
    } catch {
      // Fallback if Clerk isn't initialized
    }
  }

  const [localUserId, setLocalUserId] = useState<string | null>(() => {
    return localStorage.getItem('wm_user_id') || null
  })
  const [dbUser, setDbUser] = useState<any>(null)
  const [dbLoaded, setDbLoaded] = useState<boolean>(false)

  const getToken = useCallback(async () => {
    if (clerkUser) {
      return await clerkAuthToken()
    }
    return localUserId || null
  }, [clerkUser, clerkAuthToken, localUserId])

  const fetchDbUser = useCallback(async () => {
    const activeId = clerkUser?.id || localUserId
    if (!activeId) {
      setDbUser(null)
      setDbLoaded(true)
      return
    }
    try {
      const data = await getMe(async () => activeId)
      setDbUser(data)
    } catch (err) {
      console.warn('Could not fetch DB profile:', err)
      setDbUser(null)
    } finally {
      setDbLoaded(true)
    }
  }, [clerkUser, localUserId])

  useEffect(() => {
    if (clerkLoaded) {
      fetchDbUser()
    }
  }, [clerkLoaded, fetchDbUser])

  const signInLocal = async (userId: string) => {
    localStorage.setItem('wm_user_id', userId)
    setLocalUserId(userId)
    try {
      const data = await getMe(async () => userId)
      setDbUser(data)
    } catch (err) {
      console.warn('Local sign in fetch failed:', err)
    }
  }

  const handleSignOut = async () => {
    localStorage.removeItem('wm_user_id')
    setLocalUserId(null)
    setDbUser(null)
    if (clerkSignOut) {
      await clerkSignOut()
    }
  }

  // Derive final user profile & onboarding status
  let currentUser: User | null = null
  let isOnboarded = false

  const activeUser = clerkUser || dbUser

  if (activeUser) {
    const prefs = dbUser?.preferences
    const hasPrefs = Boolean(prefs && prefs.age && (prefs.interests?.length > 0 || prefs.preferredLanguages?.length > 0))
    isOnboarded = hasPrefs

    const userId = dbUser?.usrId || clerkUser?.id || localUserId
    if (!userId) {
      currentUser = null
    } else {
      currentUser = {
        usrId: userId,
        displayName: dbUser?.displayName || clerkUser?.fullName || clerkUser?.firstName || 'Wanderer',
        email: dbUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || 'user@example.com',
        homeCityId: dbUser?.homeCityId || 'cty_bali',
        locale: 'en',
        budgetBand: dbUser?.budgetBand || 'mid',
        travelStyle: dbUser?.travelStyle || 'cultural',
        travellerType: dbUser?.travellerType || 'friends',
        clerkUserId: clerkUser?.id || undefined,
        avatarUrl: dbUser?.avatarUrl || clerkUser?.imageUrl,
        bio: dbUser?.bio || '',
        ageGroup: prefs?.ageGroup || undefined,
        age: prefs?.age || undefined,
        isOnboarded,
        preferences: prefs ? {
          preferenceId: `prf_${userId}`,
          usrId: userId,
          preferredLanguages: prefs.preferredLanguages || [],
          interests: prefs.interests || [],
          hashtags: prefs.hashtags || [],
          preferredMode: prefs.preferredMode || 'Mode NA',
          tripTypePreference: prefs.tripTypePreference || 'both',
          sameAgeGroupOnly: Boolean(prefs.sameAgeGroupOnly),
          furtherPreferences: prefs.furtherPreferences || '',
          pace: prefs.pace || 'relaxed',
          maxDailyBudget: prefs.maxDailyBudget || null,
          preferredCurrency: 'USD',
        } : null,
      }
    }

  } else {
    currentUser = null
    isOnboarded = false
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        getToken,
        isLoaded: clerkLoaded && dbLoaded,
        isOnboarded,
        refreshDbUser: fetchDbUser,
        signInLocal,
        signOut: handleSignOut,
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

