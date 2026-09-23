import React from 'react'
import { GlobalTopHeader } from './GlobalTopHeader'
import type { TripMember } from '../../types/trip'
import type { User } from '../../types/user'

export interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  hideSidebar?: boolean
  trpId?: string
  tripTitle?: string
  mode?: 'Mode A' | 'Mode NA' | null
  onlineMembers?: TripMember[]
  currentUser?: User | null
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  className = '',
  hideSidebar = false,
  trpId,
  tripTitle,
  currentUser,
}) => {
  if (hideSidebar) {
    return (
      <div className={`min-h-screen bg-paper text-ink font-sans ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col">
      {/* Top Header Navigation (No sidebars for professional clean layout) */}
      <GlobalTopHeader
        currentUser={currentUser}
        trpId={trpId}
        tripTitle={tripTitle}
      />

      {/* Main Content Body */}
      <main className={`flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto ${className}`}>
        {children}
      </main>
    </div>
  )
}
