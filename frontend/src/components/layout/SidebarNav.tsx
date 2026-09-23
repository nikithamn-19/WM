import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'

export interface SidebarNavProps {
  trpId?: string
  tripTitle?: string
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  trpId,
  tripTitle,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuthContext()

  const handleSignOut = () => {
    navigate('/sign-in')
  }

  const content = (
    <aside className="w-64 bg-card border-r border-slate-light flex flex-col justify-between h-full p-4 shrink-0 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between md:hidden pb-2 border-b border-slate-light">
          <span className="font-serif font-bold text-ink text-sm truncate">
            {tripTitle || 'Trip Navigation'}
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="text-slate hover:text-ink font-mono text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Top Back Button to Dashboard */}
        <Link
          to="/trips"
          onClick={onCloseMobile}
          className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-paper border border-slate-light text-xs font-sans font-semibold text-route hover:border-route transition-all"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>

        {/* Active Trip Title */}
        {tripTitle && (
          <div className="px-2 pt-1 font-serif font-bold text-ink text-base truncate">
            {tripTitle}
          </div>
        )}

        {/* Active Trip Nav Items (Exact Order: Itinerary, Branches, Confirmed Schedule, Trip Chat, Photos, Audit Log) */}
        <div className="flex flex-col gap-1 mt-1">
          {/* 1. Itinerary Timeline */}
          <Link
            to={`/trips/${trpId}`}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] font-sans text-sm font-medium transition-all min-h-[40px] ${
              location.pathname === `/trips/${trpId}`
                ? 'bg-route text-card font-semibold shadow-xs'
                : 'text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Itinerary Timeline</span>
          </Link>

          {/* 2. Parallel Branches */}
          <Link
            to={`/trips/${trpId}/branches/itm_b4`}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] font-sans text-sm font-medium transition-all min-h-[40px] ${
              location.pathname.includes('/branches')
                ? 'bg-route text-card font-semibold shadow-xs'
                : 'text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>Parallel Branches</span>
          </Link>

          {/* 3. Confirmed Schedule */}
          <Link
            to={`/trips/${trpId}/resolved`}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] font-sans text-sm font-medium transition-all min-h-[40px] ${
              location.pathname.includes('/resolved')
                ? 'bg-route text-card font-semibold shadow-xs'
                : 'text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Confirmed Schedule</span>
          </Link>

          {/* 4. Trip Chat */}
          <Link
            to={`/trips/${trpId}/chat`}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] font-sans text-sm font-medium transition-all min-h-[40px] ${
              location.pathname.includes('/chat')
                ? 'bg-route text-card font-semibold shadow-xs'
                : 'text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Trip Chat</span>
          </Link>

          {/* 5. Photos */}
          <Link
            to={`/trips/${trpId}/photos`}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] font-sans text-sm font-medium transition-all min-h-[40px] ${
              location.pathname.includes('/photos')
                ? 'bg-route text-card font-semibold shadow-xs'
                : 'text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Photos</span>
          </Link>

          {/* 6. Audit Log */}
          <Link
            to={`/trips/${trpId}/history`}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] font-sans text-sm font-medium transition-all min-h-[40px] ${
              location.pathname.includes('/history')
                ? 'bg-route text-card font-semibold shadow-xs'
                : 'text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Audit Log</span>
          </Link>
        </div>
      </div>

      {/* Footer: User Profile & Auth */}
      <div className="pt-3 border-t border-slate-light flex flex-col gap-3">
        <div className="flex items-center gap-3 p-2 bg-paper rounded-[8px] border border-slate-light">
          <div className="w-8 h-8 rounded-full bg-route text-card font-mono text-xs font-bold flex items-center justify-center shrink-0">
            {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'ME'}
          </div>
          <div className="flex flex-col truncate">
            <span className="font-sans text-xs font-medium text-ink truncate">
              {currentUser?.displayName || 'Alex Chen'}
            </span>
            <span className="font-mono text-[10px] text-slate uppercase font-bold">
              {(currentUser as any)?.role || 'Owner'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-slate-light/30 hover:bg-clay/10 text-slate hover:text-clay rounded-[8px] font-mono text-xs font-medium transition-all min-h-[36px]"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out / Switch User</span>
        </button>
      </div>
    </aside>
  )

  if (isMobileOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-ink/50 flex md:hidden">
        {content}
      </div>
    )
  }

  return <div className="hidden md:block h-screen sticky top-0">{content}</div>
}
