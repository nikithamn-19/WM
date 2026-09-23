import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'

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

import { AuthProvider } from './context/AuthContext'
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

export default function App() {
  const isPlaceholderKey = !CLERK_KEY || CLERK_KEY === 'pk_test_placeholder'

  const routes = (
    <AuthProvider>
      <TripProvider>
        <ToastList />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/trips" replace />} />
            <Route path="/sign-in" element={<LoginScreen />} />
            <Route path="/sign-up" element={<SignUpScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/trips" element={<MyTripsScreen />} />
            <Route path="/solo-or-group" element={<SoloOrGroupDecisionScreen />} />
            <Route path="/solo-matches" element={<SoloMatchScreen />} />
            <Route path="/solo" element={<SoloMatchScreen />} />
            <Route path="/trips/new" element={<CreateTripScreen />} />
            <Route path="/trips/:trpId/preview" element={<TripPreviewScreen />} />
            <Route path="/trips/:trpId" element={<TripHomeScreen />} />
            <Route path="/trips/:trpId/branches/:itmId" element={<BranchViewScreen />} />
            <Route path="/trips/:trpId/resolved" element={<ResolvedItineraryScreen />} />
            <Route path="/trips/:trpId/chat" element={<TripChatScreen />} />
            <Route path="/trips/:trpId/memories" element={<MemoriesScreen />} />
            <Route path="/trips/:trpId/photos" element={<MemoriesScreen />} />
            <Route path="/trips/:trpId/history" element={<AuditHistoryScreen />} />
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
