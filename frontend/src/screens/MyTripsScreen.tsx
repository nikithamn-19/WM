import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { getTrips } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'
import type { Trip } from '../types/trip'

export function getTripStatus(trip: { startDate?: string; endDate?: string; status?: string }): 'Ongoing' | 'Finished' {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

  let tripEnd: Date | null = null

  if (trip.endDate) {
    const parsed = new Date(trip.endDate)
    if (!isNaN(parsed.getTime())) {
      tripEnd = parsed
    }
  }

  if (!tripEnd && trip.startDate) {
    const parsed = new Date(trip.startDate)
    if (!isNaN(parsed.getTime())) {
      tripEnd = parsed
    } else {
      // Handles e.g. "10-16 OCT" or "01-07 NOV" or "12-18 AUG 2024"
      const match = trip.startDate.match(/(?:(\d{1,2})\s*-\s*)?(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/)
      if (match) {
        const day = parseInt(match[2], 10)
        const monthStr = match[3]
        const year = match[4] ? parseInt(match[4], 10) : now.getFullYear()
        const parsedDate = new Date(`${monthStr} ${day}, ${year} 23:59:59`)
        if (!isNaN(parsedDate.getTime())) {
          tripEnd = parsedDate
        }
      }
    }
  }

  if (tripEnd) {
    const tripEndDay = new Date(tripEnd.getFullYear(), tripEnd.getMonth(), tripEnd.getDate(), 23, 59, 59)
    return tripEndDay < today ? 'Finished' : 'Ongoing'
  }

  if (trip.status && (trip.status.toLowerCase() === 'finished' || trip.status.toLowerCase() === 'completed')) {
    return 'Finished'
  }

  return 'Ongoing'
}

export const MyTripsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { getToken, currentUser } = useAuthContext()
  const { addToast } = useTripContext()

  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Join Trip Modal State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinError, setJoinError] = useState('')

  // Copy Code Feedback State
  const [copiedTrpId, setCopiedTrpId] = useState<string | null>(null)

  const dummyFallbackTrips = [
    {
      trpId: 'trp_goa_2026',
      ownerId: 'usr_owner',
      title: 'Goa Sunsets & Beach Getaway',
      destinationCityId: 'Goa',
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      partySize: 4,
      mode: 'Mode A',
      coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
      members: ['Alex', 'Priya', 'Jordan', 'Sam'],
    },
    {
      trpId: 'trp_kerala_2026',
      ownerId: 'usr_priya',
      title: 'Kerala Backwaters & Houseboat Retreat',
      destinationCityId: 'Kochi',
      startDate: '2026-11-01',
      endDate: '2026-11-07',
      partySize: 5,
      mode: 'Mode NA',
      coverImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80',
      members: ['Priya', 'Dev', 'Maya'],
    },
    {
      trpId: 'trp_manali_2024',
      ownerId: 'usr_nikitha',
      title: 'Manali & Kasol Mountain Trek',
      destinationCityId: 'Manali',
      startDate: '2024-08-12',
      endDate: '2024-08-18',
      partySize: 6,
      mode: 'Mode A',
      coverImage: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80',
      members: ['Nikitha', 'Rohan', 'Sneha'],
    },
  ]

  useEffect(() => {
    let isMounted = true
    setIsLoading(false)

    // Load any locally joined trips
    let localTrips: any[] = []
    try {
      const savedJoined = localStorage.getItem('wm_joined_trips')
      if (savedJoined) {
        localTrips = JSON.parse(savedJoined)
      }
    } catch (e) {
      console.error('Error loading joined trips', e)
    }

    getTrips(getToken)
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          const combined = [
            ...localTrips.filter((lt) => !data.some((d) => d.trpId === lt.trpId)),
            ...data,
          ]
          setTrips(combined)
        } else if (isMounted) {
          const combined = [
            ...localTrips.filter((lt) => !dummyFallbackTrips.some((d) => d.trpId === lt.trpId)),
            ...dummyFallbackTrips,
          ]
          setTrips(combined as any)
        }
      })
      .catch(() => {
        if (isMounted) {
          const combined = [
            ...localTrips.filter((lt) => !dummyFallbackTrips.some((d) => d.trpId === lt.trpId)),
            ...dummyFallbackTrips,
          ]
          setTrips(combined as any)
        }
      })
  }, [getToken])

  // Handle Copy Trip Code
  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = code
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedTrpId(code)
      addToast(`Trip code "${code}" copied to clipboard!`, 'success')
      setTimeout(() => setCopiedTrpId(null), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
      addToast('Failed to copy trip code', 'conflict')
    }
  }

  // Handle Join Trip Submission
  const handleJoinTripSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCodeInput.trim()
    if (!code) {
      setJoinError('Please enter a trip code.')
      return
    }

    // Check if the trip already exists in trips
    const existing = trips.find(
      (t) =>
        t.trpId.toLowerCase() === code.toLowerCase() ||
        (code.toUpperCase() === 'GOA-2026' && t.trpId === 'trp_goa_2026')
    )

    if (existing) {
      addToast(`Joined trip "${existing.title}" successfully!`, 'success')
      setIsJoinModalOpen(false)
      navigate(`/trips/${existing.trpId}`)
      return
    }

    // If it's a new trip code, create and add it to user's trips
    const formattedTitle =
      code
        .replace(/^trp_/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) + ' Getaway'

    const newTrip = {
      trpId: code,
      ownerId: currentUser?.usrId || 'usr_member',
      title: formattedTitle,
      destinationCityId: 'Destination',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      partySize: 4,
      mode: 'Mode A',
      coverImage:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      members: [currentUser?.displayName || 'Nikitha', 'Alex', 'Sam'],
    }

    const updated = [newTrip as any, ...trips]
    setTrips(updated)
    try {
      localStorage.setItem('wm_joined_trips', JSON.stringify(updated))
    } catch (err) {
      console.error('Error saving joined trip to localStorage', err)
    }

    addToast(`Successfully joined trip "${formattedTitle}" with code ${code}!`, 'success')
    setIsJoinModalOpen(false)
    navigate(`/trips/${code}`)
  }

  return (
    <PageWrapper currentUser={currentUser}>
      <div className="flex flex-col gap-6">
        {/* Header (My Trips Dashboard with Join Trip, Discover Trips, Create a Trip) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-light">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">My Trips Dashboard</h1>
            <p className="font-sans text-xs text-slate mt-0.5">
              Manage your group getaways, draft itineraries, and team access codes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Join Trip Button */}
            <button
              type="button"
              onClick={() => {
                setJoinCodeInput('')
                setJoinError('')
                setIsJoinModalOpen(true)
              }}
              className="text-xs px-3.5 py-1.5 min-h-[36px] border border-slate-light rounded-[8px] bg-card hover:bg-paper text-ink font-sans font-semibold flex items-center gap-1.5 shadow-2xs hover:border-route transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-route" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Join Trip</span>
            </button>

            {/* Discover Trips Button */}
            <button
              type="button"
              onClick={() => navigate('/solo-matches')}
              className="text-xs px-3.5 py-1.5 min-h-[36px] border border-slate-light rounded-[8px] bg-card hover:bg-paper text-ink font-sans font-semibold flex items-center gap-1.5 shadow-2xs hover:border-route transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13l3 6-6 3 3-6z" />
              </svg>
              <span>Discover Trips</span>
            </button>

            {/* Create a Trip Button */}
            <button
              type="button"
              onClick={() => navigate('/trips/new')}
              className="text-xs px-3.5 py-1.5 min-h-[36px] bg-route text-card font-sans font-semibold rounded-[8px] flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-all cursor-pointer"
            >
              <span>+ Create a Trip</span>
            </button>
          </div>
        </div>

        {/* Trips Grid */}
        {isLoading ? (
          <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="No trips found"
            message="Start planning your group vacation now or join one using a trip code!"
            actionLabel="+ Create First Trip"
            onAction={() => navigate('/trips/new')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip: any) => {
              const tripStatus = getTripStatus(trip)
              const isFinished = tripStatus === 'Finished'
              const dateDisplay = trip.endDate || trip.startDate || '2026-10-15'
              const memberList = trip.members || ['Alex', 'Priya', 'Jordan', 'Sam']
              const memberCount = memberList.length

              return (
                <div
                  key={trip.trpId}
                  className="bg-card border border-slate-light rounded-[14px] overflow-hidden shadow-xs hover:border-route transition-all flex flex-col justify-between group"
                >
                  <Link to={`/trips/${trip.trpId}`} className="block">
                    {/* Cover Image + Badges */}
                    <div className="relative aspect-[16/10] bg-paper overflow-hidden">
                      <img
                        src={
                          trip.coverImage ||
                          'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Top-Right Status Badge (PLANNING / FINISHED) */}
                      <span
                        className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isFinished
                            ? 'bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {isFinished ? 'FINISHED' : 'PLANNING'}
                      </span>

                      {/* Bottom-Left Trip Code Pill */}
                      <div className="absolute bottom-2.5 left-2.5 bg-ink/80 text-card text-[11px] font-mono font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 backdrop-blur-xs shadow-xs border border-white/10">
                        <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="font-semibold text-white/90">CODE:</span>
                        <span className="text-white font-mono">{trip.trpId}</span>
                      </div>
                    </div>
                  </Link>

                  {/* Card Details */}
                  <div className="p-4 flex flex-col gap-3">
                    <Link to={`/trips/${trip.trpId}`} className="block">
                      <h3 className="font-serif text-lg font-bold text-ink leading-snug group-hover:text-route transition-colors line-clamp-1">
                        {trip.title}
                      </h3>
                    </Link>

                    {/* Date + Copy Code Row */}
                    <div className="flex items-center justify-between gap-2 font-mono text-xs text-slate">
                      <div className="flex items-center gap-1.5 truncate">
                        <svg className="w-3.5 h-3.5 text-slate shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{dateDisplay}</span>
                      </div>

                      {/* Copy Code Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCopyCode(trip.trpId)
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate hover:text-ink bg-paper hover:bg-slate-light/60 border border-slate-light transition-all cursor-pointer shrink-0"
                        title="Copy Trip Code"
                      >
                        {copiedTrpId === trip.trpId ? (
                          <>
                            <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-emerald-700 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 text-slate hover:text-route" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bottom Row: Member Avatars + Workspace -> */}
                    <div className="flex items-center justify-between border-t border-slate-light/60 pt-3 text-xs font-sans text-slate">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          <div className="w-5 h-5 rounded-full bg-route text-card font-mono text-[9px] font-bold flex items-center justify-center border border-card shadow-2xs">
                            AG
                          </div>
                          <div className="w-5 h-5 rounded-full bg-slate text-card font-mono text-[9px] font-bold flex items-center justify-center border border-card shadow-2xs">
                            PS
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate">
                          {memberCount} members
                        </span>
                      </div>

                      <Link
                        to={`/trips/${trip.trpId}`}
                        className="text-route font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1 hover:underline text-xs"
                      >
                        Workspace &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Join Trip Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false)
          setJoinCodeInput('')
          setJoinError('')
        }}
        title="Join a Trip"
      >
        <form onSubmit={handleJoinTripSubmit} className="flex flex-col gap-4 mt-2">
          <p className="font-sans text-xs text-slate">
            Enter the unique Trip Code shared by your travel organizer to access the itinerary, group debate, and chat workspace.
          </p>

          <Input
            label="Trip Code"
            placeholder="e.g. trp_goa_2026 or GOA-2026"
            value={joinCodeInput}
            onChange={(e) => {
              setJoinCodeInput(e.target.value)
              if (joinError) setJoinError('')
            }}
            error={joinError}
            required
            autoFocus
          />

          <div className="bg-paper p-3 rounded-[8px] border border-slate-light flex flex-col gap-1">
            <span className="font-mono text-[11px] text-slate font-semibold uppercase">
              Available Demo Codes:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {['trp_goa_2026', 'trp_kerala_2026', 'trp_manali_2024'].map((demoCode) => (
                <button
                  key={demoCode}
                  type="button"
                  onClick={() => {
                    setJoinCodeInput(demoCode)
                    setJoinError('')
                  }}
                  className="px-2 py-0.5 bg-card border border-slate-light rounded text-[11px] font-mono text-route hover:bg-route/10 transition-colors cursor-pointer"
                >
                  {demoCode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-light">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsJoinModalOpen(false)
                setJoinCodeInput('')
                setJoinError('')
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" className="text-xs">
              Join Trip
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  )
}
