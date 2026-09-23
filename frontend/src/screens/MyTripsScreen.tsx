import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { getTrips } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import type { Trip } from '../types/trip'

export const MyTripsScreen: React.FC = () => {
  const { getToken } = useAuthContext()

  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dummyFallbackTrips: Trip[] = [
    {
      trpId: 'trp_goa_2026',
      ownerId: 'usr_owner',
      title: 'Goa Sunsets, Beaches & Heritage Getaway',
      destinationCityId: 'Goa',
      startDate: '2026-10-10',
      endDate: '2026-10-16',
      partySize: 4,
      mode: 'Mode A',
      status: 'active',
      homeCurrency: 'INR',
      members: [
        {
          tmbId: 'tmb_1',
          trpId: 'trp_goa_2026',
          usrId: 'usr_owner',
          displayName: 'Alex Chen',
          role: 'owner',
          joinedAt: '2026-01-01',
        },
      ],
    },
    {
      trpId: 'trp_kerala_2026',
      ownerId: 'usr_priya',
      title: 'Kerala Backwaters & Spice Trail',
      destinationCityId: 'Kochi',
      startDate: '2026-11-01',
      endDate: '2026-11-07',
      partySize: 5,
      mode: 'Mode NA',
      status: 'active',
      homeCurrency: 'INR',
      members: [
        {
          tmbId: 'tmb_2',
          trpId: 'trp_kerala_2026',
          usrId: 'usr_editor',
          displayName: 'Priya Sharma',
          role: 'editor',
          joinedAt: '2026-01-01',
        },
      ],
    },
  ]

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getTrips(getToken)
      .then((data) => {
        if (isMounted) {
          setTrips(data && data.length > 0 ? data : dummyFallbackTrips)
          setError(null)
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback to dummy data if server isn't running yet in Phase 4
          setTrips(dummyFallbackTrips)
          setError(null)
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [getToken])

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">My Trips</h1>
          </div>
          <Link to="/trips/new">
            <Button>+ Create Trip</Button>
          </Link>
        </div>

        {isLoading && (
          <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
            Loading trips...
          </div>
        )}

        {!isLoading && error && (
          <EmptyState
            title="Could not load trips"
            message="Please check your connection and refresh the page."
            actionLabel="Refresh"
            onAction={() => window.location.reload()}
          />
        )}

        {!isLoading && !error && trips.length === 0 && (
          <EmptyState
            title="No trips found"
            message="Start planning your group vacation now!"
            actionLabel="+ Create First Trip"
            onAction={() => {
              window.location.href = '/trips/new'
            }}
          />
        )}

        {!isLoading && !error && trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => {
              const role = trip.members?.[0]?.role || 'owner'

              return (
                <Link
                  key={trip.trpId}
                  to={`/trips/${trip.trpId}`}
                  className="bg-card border border-slate-light rounded-[10px] p-5 shadow-sm hover:border-route transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-slate capitalize">
                        {trip.destinationCityId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                          trip.mode === 'Mode A'
                            ? 'bg-route/10 text-route border border-route/20'
                            : 'bg-slate/10 text-slate border border-slate-light'
                        }`}
                      >
                        {trip.mode}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-ink leading-snug">
                      {trip.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-light/40 pt-3 font-mono text-xs text-slate">
                    <span>
                      {trip.startDate} - {trip.endDate}
                    </span>
                    <span className="font-semibold text-route uppercase">{role}</span>
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
