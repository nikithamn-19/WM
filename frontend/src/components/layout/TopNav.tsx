import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import type { TripMember } from '../../types/trip'
import type { User } from '../../types/user'
import { useTripContext } from '../../context/TripContext'

export interface TopNavProps {
  mode?: 'Mode A' | 'Mode NA' | null
  onlineMembers?: TripMember[]
  currentUser?: User | null
  trpId?: string
  tripTitle?: string
  onToggleChat?: () => void
  onToggleMobileSidebar?: () => void
  unreadCount?: number
}

export const TopNav: React.FC<TopNavProps> = ({
  mode,
  onlineMembers = [],
  currentUser,
  trpId,
  onToggleChat,
  onToggleMobileSidebar,
  unreadCount = 2,
}) => {
  const { toasts } = useTripContext()
  const [showNotifications, setShowNotifications] = useState(false)

  const displayMembers = onlineMembers.slice(0, 4)
  const remainingCount = onlineMembers.length > 4 ? onlineMembers.length - 4 : 0

  return (
    <header className="bg-card border-b border-slate-light px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Left section: Mobile menu toggle */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate hover:text-ink rounded-[8px] bg-paper border border-slate-light"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Chat Toggle Button */}
        {trpId && onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper border border-slate-light text-xs font-mono font-medium text-ink hover:border-route transition-all min-h-[36px]"
          >
            <svg className="w-4 h-4 text-route" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-route text-card text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Member Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-paper border border-slate-light text-slate hover:text-ink relative transition-all"
            title="Member Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {toasts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-clay text-card text-[10px] font-bold flex items-center justify-center animate-pulse">
                {toasts.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-slate-light rounded-[10px] shadow-lg p-4 z-50 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-light pb-2">
                <span className="font-serif font-bold text-sm text-ink">Notifications</span>
                <span className="font-mono text-[10px] text-slate font-bold uppercase">
                  {toasts.length} Recent
                </span>
              </div>

              {toasts.length === 0 ? (
                <p className="text-xs font-mono text-slate text-center py-4">
                  No unread notifications
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {toasts.map((toast) => (
                    <div
                      key={toast.id}
                      className="p-2.5 bg-paper border border-slate-light/60 rounded-[8px] text-xs font-sans text-ink flex items-start gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-route shrink-0 mt-1" />
                      <span>{toast.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mode Pill */}
        {mode && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
              mode === 'Mode A'
                ? 'bg-route/10 text-route border border-route/20'
                : 'bg-slate/10 text-slate border border-slate-light'
            }`}
          >
            {mode === 'Mode A' ? 'Mode A (Admin)' : mode === 'Mode NA' ? 'Mode NA (Collab)' : mode}
          </span>
        )}

        {/* Online Avatar Stack */}
        {onlineMembers.length > 0 && (
          <div className="hidden lg:flex items-center -space-x-2">
            {displayMembers.map((member) => (
              <div
                key={member.tmbId}
                title={member.displayName}
                className="w-8 h-8 rounded-full bg-route text-card text-xs font-mono font-bold flex items-center justify-center border-2 border-card"
              >
                {member.displayName.slice(0, 2).toUpperCase()}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="w-8 h-8 rounded-full bg-slate-light text-slate text-xs font-mono font-bold flex items-center justify-center border-2 border-card">
                +{remainingCount}
              </div>
            )}
          </div>
        )}

        {/* Profile Avatar */}
        <Link
          to="/account"
          title="User Account & Preferences"
          className="w-8 h-8 rounded-full bg-route text-card text-xs font-mono font-bold flex items-center justify-center border border-route hover:opacity-90 transition-all"
        >
          {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'ME'}
        </Link>
      </div>
    </header>
  )
}
