import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { User } from '../../types/user'

export interface GlobalTopHeaderProps {
  currentUser?: User | null
}

export const GlobalTopHeader: React.FC<GlobalTopHeaderProps> = ({ currentUser }) => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="bg-card border-b border-slate-light sticky top-0 z-40 shadow-xs px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Brand Header — Increased font size */}
      <Link
        to="/trips"
        className="font-serif text-2xl sm:text-3xl font-bold text-route tracking-tight hover:opacity-90 transition-opacity"
      >
        WanderMatch
      </Link>

      {/* Centered Navigation Switcher */}
      <nav className="flex items-center gap-1 bg-paper p-1 rounded-[10px] border border-slate-light shadow-xs">
        <Link
          to="/trips"
          className={`px-4 py-1.5 rounded-[8px] font-sans text-sm font-medium transition-all ${
            isActive('/trips')
              ? 'bg-route text-card font-semibold shadow-xs'
              : 'text-slate hover:text-ink'
          }`}
        >
          My Trips
        </Link>
        <Link
          to="/solo"
          className={`px-4 py-1.5 rounded-[8px] font-sans text-sm font-medium transition-all ${
            isActive('/solo')
              ? 'bg-route text-card font-semibold shadow-xs'
              : 'text-slate hover:text-ink'
          }`}
        >
          Solo Matchmaker
        </Link>
      </nav>

      {/* Right User Actions */}
      <div className="flex items-center gap-3">
        <Link
          to="/sign-in"
          title="Account / Switch User"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper border border-slate-light text-xs font-mono text-ink hover:border-route transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-route text-card text-[10px] font-mono font-bold flex items-center justify-center">
            {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'ME'}
          </div>
          <span className="hidden sm:inline font-sans text-xs font-medium">
            {currentUser?.displayName || 'Alex Chen'}
          </span>
        </Link>
      </div>
    </header>
  )
}
