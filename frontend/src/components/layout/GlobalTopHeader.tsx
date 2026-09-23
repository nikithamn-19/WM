import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { User } from '../../types/user'

export interface GlobalTopHeaderProps {
  currentUser?: User | null
  trpId?: string
  tripTitle?: string
}

export const GlobalTopHeader: React.FC<GlobalTopHeaderProps> = ({
  currentUser,
  trpId,
  tripTitle,
}) => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path
  const isInsideTrip = Boolean(trpId)

  return (
    <header className="bg-card border-b border-slate-light sticky top-0 z-40 shadow-xs px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Brand Header */}
      <div className="flex items-center gap-6">
        <Link
          to="/trips"
          className="font-serif text-2xl sm:text-3xl font-bold text-route tracking-tight hover:opacity-90 transition-opacity"
        >
          WanderMatch
        </Link>
      </div>

      {/* Centered Navigation Tabs: Plan, Propose & Resolve, Chat, Memories */}
      <nav className="flex items-center gap-6 sm:gap-8">
        {!isInsideTrip ? (
          /* Global Navigation Tabs */
          <>
            <Link
              to="/trips"
              className={`font-sans text-sm sm:text-base font-semibold transition-all py-1 border-b-2 ${
                isActive('/trips')
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              My Trips
            </Link>
            <Link
              to="/solo-matches"
              className={`font-sans text-sm sm:text-base font-semibold transition-all py-1 border-b-2 ${
                isActive('/solo-matches') || isActive('/solo')
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              Explore &amp; Matching
            </Link>
          </>
        ) : (
          /* Active Trip Navigation Tabs: Plan, Propose & Resolve, Chat, Memories */
          <>
            <Link
              to={`/trips/${trpId}`}
              className={`font-sans text-sm sm:text-base font-semibold transition-all py-1 border-b-2 ${
                location.pathname === `/trips/${trpId}`
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              Plan
            </Link>
            <Link
              to={`/trips/${trpId}/slots/itm_b94582f9`}
              className={`font-sans text-sm sm:text-base font-semibold transition-all py-1 border-b-2 ${
                location.pathname.includes('/branches') || location.pathname.includes('/slots')
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              Propose &amp; Resolve
            </Link>
            <Link
              to={`/trips/${trpId}/chat`}
              className={`font-sans text-sm sm:text-base font-semibold transition-all py-1 border-b-2 ${
                location.pathname.includes('/chat')
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              Chat
            </Link>
            <Link
              to={`/trips/${trpId}/memories`}
              className={`font-sans text-sm sm:text-base font-semibold transition-all py-1 border-b-2 ${
                location.pathname.includes('/memories') || location.pathname.includes('/photos')
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              Memories
            </Link>
          </>
        )}
      </nav>

      {/* Right User & Trip Actions */}
      <div className="flex items-center gap-3">
        {isInsideTrip && (
          <span className="hidden lg:inline font-mono text-xs text-slate truncate max-w-[150px]">
            {tripTitle || 'Goa Getaway'}
          </span>
        )}

        <Link
          to="/sign-in"
          title="Account / Switch User"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper border border-slate-light text-xs font-mono text-ink hover:border-route transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-route text-card text-[10px] font-mono font-bold flex items-center justify-center">
            {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'N'}
          </div>
          <span className="hidden sm:inline font-sans text-xs font-medium">
            {currentUser?.displayName || 'Nikitha'}
          </span>
        </Link>
      </div>
    </header>
  )
}
