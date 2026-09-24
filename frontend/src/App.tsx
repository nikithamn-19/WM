import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'

import { SignUpScreen } from './screens/SignUpScreen'
import { LoginScreen } from './screens/LoginScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { MyTripsScreen } from './screens/MyTripsScreen'
import { SoloOrGroupDecisionScreen } from './screens/SoloOrGroupDecisionScreen'
import { SoloMatchScreen } from './screens/SoloMatchScreen'
import { CreateTripScreen } from './screens/CreateTripScreen'
import { TripPreviewScreen } from './screens/TripPreviewScreen'
import { TripHomeScreen } from './screens/TripHomeScreen'
import { BranchViewScreen } from './screens/BranchViewScreen'
import { ResolvedItineraryScreen } from './screens/ResolvedItineraryScreen'
import { AuditHistoryScreen } from './screens/AuditHistoryScreen'
import { TripChatScreen } from './screens/TripChatScreen'
import { MemoriesScreen } from './screens/MemoriesScreen'
import { AccountScreen } from './screens/AccountScreen'

import { AuthProvider, useAuthContext } from './context/AuthContext'
import { TripProvider, useTripContext } from './context/TripContext'
import { Toast } from './components/ui/Toast'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder'

function ToastList() {
  const { toasts, dismissToast } = useTripContext()
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => dismissToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { currentUser, isLoaded } = useAuthContext()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-mono text-xs text-slate animate-pulse">
        Loading WanderMatch session...
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/sign-in" replace />
  }

  return children
}

function PublicAuthRoute({ children }: { children: React.JSX.Element }) {
  const { currentUser, isLoaded } = useAuthContext()

  if (isLoaded && currentUser) {
    return <Navigate to="/trips" replace />
  }

  return children
}

function RootRedirect() {
  const { currentUser, isLoaded } = useAuthContext()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-mono text-xs text-slate animate-pulse">
        Loading WanderMatch session...
      </div>
    )
  }

  if (currentUser) {
    return <Navigate to="/trips" replace />
  }

  return <Navigate to="/sign-in" replace />
}

export default function App() {
  const isPlaceholderKey =
    !CLERK_KEY ||
    CLERK_KEY === 'pk_test_placeholder' ||
    CLERK_KEY.includes('your_key_here') ||
    CLERK_KEY.includes('placeholder') ||
    !CLERK_KEY.startsWith('pk_')

  const routes = (
    <AuthProvider>
      <TripProvider>
        <ToastList />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signUpForceRedirectUrl="/onboarding" signInForceRedirectUrl="/trips" />} />
            <Route path="/sign-in" element={<PublicAuthRoute><LoginScreen /></PublicAuthRoute>} />
            <Route path="/sign-up" element={<PublicAuthRoute><SignUpScreen /></PublicAuthRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><OnboardingScreen /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountScreen /></ProtectedRoute>} />
            <Route path="/trips" element={<ProtectedRoute><MyTripsScreen /></ProtectedRoute>} />
            <Route path="/solo-or-group" element={<ProtectedRoute><SoloOrGroupDecisionScreen /></ProtectedRoute>} />
            <Route path="/solo-matches" element={<ProtectedRoute><SoloMatchScreen /></ProtectedRoute>} />
            <Route path="/solo" element={<ProtectedRoute><SoloMatchScreen /></ProtectedRoute>} />
            <Route path="/trips/new" element={<ProtectedRoute><CreateTripScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId/preview" element={<ProtectedRoute><TripPreviewScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId" element={<ProtectedRoute><TripHomeScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId/branches/:itmId" element={<ProtectedRoute><BranchViewScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId/resolved" element={<ProtectedRoute><ResolvedItineraryScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId/chat" element={<ProtectedRoute><TripChatScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId/memories" element={<ProtectedRoute><MemoriesScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId/photos" element={<ProtectedRoute><MemoriesScreen /></ProtectedRoute>} />
            <Route path="/trips/:trpId/history" element={<ProtectedRoute><AuditHistoryScreen /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TripProvider>
    </AuthProvider>
  )

  if (isPlaceholderKey) {
    return routes
  }

  return <ClerkProvider publishableKey={CLERK_KEY}>{routes}</ClerkProvider>
}

