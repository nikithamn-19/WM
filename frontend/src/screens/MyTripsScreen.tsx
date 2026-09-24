import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { getTrips } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
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

  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const dummyFallbackTrips = [
    {
      trpId: 'trp_goa_2026',
      ownerId: 'usr_owner',
      title: 'Goa Sunsets & Beach Getaway',
      destinationCityId: 'Goa',
      startDate: '10-16 OCT',
      endDate: '2026-10-16',
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
      startDate: '01-07 NOV',
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
      startDate: '12-18 AUG',
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
    getTrips(getToken)
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setTrips(data)
        } else if (isMounted) {
          setTrips(dummyFallbackTrips as any)
        }
      })
      .catch(() => {
        if (isMounted) setTrips(dummyFallbackTrips as any)
      })
  }, [getToken])

  return (
    <PageWrapper currentUser={currentUser}>
      <div className="flex flex-col gap-6">
        {/* Header (PDF Page 6 Design) */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-light">
          <h1 className="font-serif text-3xl font-bold text-ink">My Trips</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/solo-matches')}
              className="text-xs px-3.5 py-1.5 min-h-[36px]"
            >
              Discover Trips
            </Button>
            <Button
              onClick={() => navigate('/trips/new')}
              className="text-xs px-3.5 py-1.5 min-h-[36px]"
            >
              Create a Trip
            </Button>
          </div>
        </div>

        {/* Trips Grid (PDF Page 6 Card Layout) */}
        {isLoading ? (
          <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="No trips found"
            message="Start planning your group vacation now!"
            actionLabel="+ Create First Trip"
            onAction={() => navigate('/trips/new')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip: any) => {
              const tripStatus = getTripStatus(trip)
              const isFinished = tripStatus === 'Finished'

              return (
                <Link
                  key={trip.trpId}
                  to={`/trips/${trip.trpId}`}
                  className="bg-card border border-slate-light rounded-[12px] overflow-hidden shadow-xs hover:border-route transition-all flex flex-col justify-between group"
                >
                  {/* Cover Image + Status Badge */}
                  <div className="relative aspect-[16/10] bg-paper overflow-hidden">
                    <img
                      src={
                        trip.coverImage ||
                        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={trip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isFinished
                          ? 'bg-slate-200 text-slate-700 border border-slate-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {tripStatus}
                    </span>
                  </div>

                {/* Card Details */}
                <div className="p-4 flex flex-col gap-3">
                  <h3 className="font-serif text-lg font-bold text-ink leading-snug">
                    {trip.title}
                  </h3>

                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{trip.startDate}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-light/60 pt-3 text-xs font-sans text-slate">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-route text-card font-mono text-[9px] font-bold flex items-center justify-center border border-card">
                          AC
                        </div>
                        <div className="w-5 h-5 rounded-full bg-slate text-card font-mono text-[9px] font-bold flex items-center justify-center border border-card">
                          PS
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate">+2 members</span>
                    </div>

                    <span className="text-route font-bold group-hover:translate-x-0.5 transition-transform">
                      View &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
