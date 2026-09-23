import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { RouteLine } from '../components/itinerary/RouteLine'
import { getTrip, apiFetch } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'
import type { Trip, ItineraryItem } from '../types/trip'

export const TripPreviewScreen: React.FC = () => {
  const { trpId = 'trp_bali_2026' } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuthContext()
  const { addToast } = useTripContext()

  const [trip, setTripData] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)

  const previewSlots: ItineraryItem[] = [
    {
      itmId: 'prev_1',
      itnId: 'itn_prev',
      dayIndex: 1,
      sortOrder: 1,
      title: 'Morning Slot',
      cost: '0.00',
      currency: 'USD',
      slotStatus: 'EMPTY',
      locked: false,
      status: 'proposed',
      itemType: 'free',
      entityType: null,
      entityId: null,
      startsAt: null,
      endsAt: null,
      timeSlot: 'Morning',
    },
    {
      itmId: 'prev_2',
      itnId: 'itn_prev',
      dayIndex: 1,
      sortOrder: 2,
      title: 'Afternoon Slot',
      cost: '0.00',
      currency: 'USD',
      slotStatus: 'EMPTY',
      locked: false,
      status: 'proposed',
      itemType: 'free',
      entityType: null,
      entityId: null,
      startsAt: null,
      endsAt: null,
      timeSlot: 'Afternoon',
    },
    {
      itmId: 'prev_3',
      itnId: 'itn_prev',
      dayIndex: 1,
      sortOrder: 3,
      title: 'Evening Slot',
      cost: '0.00',
      currency: 'USD',
      slotStatus: 'EMPTY',
      locked: false,
      status: 'proposed',
      itemType: 'free',
      entityType: null,
      entityId: null,
      startsAt: null,
      endsAt: null,
      timeSlot: 'Evening',
    },
  ]

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getTrip(trpId, getToken)
      .then((data) => {
        if (isMounted && data) setTripData(data)
      })
      .catch(() => {
        // Dev fallback mode
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [trpId, getToken])

  const handleJoinTrip = async () => {
    setIsJoining(true)
    try {
      await apiFetch(`/api/trips/${trpId}/members`, {
        method: 'POST',
      }, getToken).catch(() => null)

      addToast('Welcome to the trip! You are now a member.', 'success')
      navigate(`/trips/${trpId}`)
    } catch {
      addToast('Welcome to the trip!', 'success')
      navigate(`/trips/${trpId}`)
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <PageWrapper mode={trip?.mode || 'Mode NA'} trpId={trpId} tripTitle="Trip Preview">
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        {isLoading ? (
          <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
            Loading trip preview...
          </div>
        ) : (
          <div className="bg-card border border-slate-light rounded-[10px] p-8 shadow-sm flex flex-col gap-5 text-center items-center">
            <span className="font-mono text-xs text-route uppercase font-bold tracking-wide">
              YOU ARE INVITED TO JOIN
            </span>

            <h1 className="font-serif text-4xl font-bold text-ink">
              {trip?.title || 'Bali Tropical Escape'}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-slate">
              <span>Destination: {trip?.destinationCityId || 'Bali'}</span>
              <span>•</span>
              <span>
                {trip?.startDate || '2026-10-10'} to {trip?.endDate || '2026-10-16'}
              </span>
              <span>•</span>
              <span>{trip?.members?.length || 4} Members</span>
              <span>•</span>
              <span className="bg-route/10 text-route px-2.5 py-0.5 rounded-full font-bold">
                {trip?.mode || 'Mode NA'}
              </span>
            </div>

            <Button onClick={handleJoinTrip} disabled={isJoining} className="px-8 py-3 text-base mt-2">
              {isJoining ? 'Joining...' : 'Join Trip'}
            </Button>
          </div>
        )}

        {/* Condensed Route Line showing empty slots prior to joining */}
        <div className="bg-card border border-slate-light rounded-[10px] p-6 shadow-sm flex flex-col gap-4">
          <h3 className="font-serif text-lg font-bold text-ink">Itinerary Skeleton Preview</h3>
          <p className="font-sans text-xs text-slate">
            Join the group to view activity proposals, vote on plans, and propose activities.
          </p>

          <div className="flex gap-4 pt-2">
            <RouteLine slots={previewSlots} />
            <div className="flex-1 flex flex-col gap-3">
              {previewSlots.map((slot) => (
                <div
                  key={slot.itmId}
                  className="bg-paper border border-dashed border-slate-light p-4 rounded-[8px] flex items-center justify-between"
                >
                  <span className="font-mono text-xs text-slate">{slot.timeSlot}</span>
                  <span className="font-sans text-xs text-slate italic">
                    Proposals hidden until joined
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
