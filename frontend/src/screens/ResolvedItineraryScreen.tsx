import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { RouteLine } from '../components/itinerary/RouteLine'
import { EmptyState } from '../components/ui/EmptyState'
import { getTrip } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import type { Trip, ItineraryItem } from '../types/trip'

export const ResolvedItineraryScreen: React.FC = () => {
  const { trpId = 'trp_bali_2026' } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuthContext()

  const [trip, setTripData] = useState<Trip | null>(null)
  const [confirmedSlots, setConfirmedSlots] = useState<ItineraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const dummyConfirmedSlots: ItineraryItem[] = [
    {
      itmId: 'itm_b1',
      itnId: 'itn_1',
      dayIndex: 1,
      sortOrder: 1,
      title: 'Sacred Monkey Forest Sanctuary',
      cost: '25.00',
      currency: 'USD',
      slotStatus: 'CONFIRMED',
      locked: true,
      status: 'confirmed',
      itemType: 'poi',
      entityType: 'poi',
      entityId: 'poi_monkey_forest',
      startsAt: '2026-10-10T09:00:00Z',
      endsAt: '2026-10-10T12:00:00Z',
      timeSlot: '09:00 - 12:00 (Morning)',
    },
    {
      itmId: 'itm_b2_resolved',
      itnId: 'itn_1',
      dayIndex: 1,
      sortOrder: 2,
      title: 'Batur Thermal Springs & Spa',
      cost: '50.00',
      currency: 'USD',
      slotStatus: 'CONFIRMED',
      locked: true,
      status: 'confirmed',
      itemType: 'poi',
      entityType: 'poi',
      entityId: 'poi_batur_spa',
      startsAt: '2026-10-10T14:00:00Z',
      endsAt: '2026-10-10T17:00:00Z',
      timeSlot: '14:00 - 17:00 (Afternoon)',
    },
  ]

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getTrip(trpId, getToken)
      .then((data) => {
        if (isMounted && data) {
          setTripData(data)
          const confirmed = (data.itinerary?.items || []).filter(
            (item) => item.slotStatus === 'CONFIRMED'
          )
          setConfirmedSlots(confirmed.length > 0 ? confirmed : dummyConfirmedSlots)
        }
      })
      .catch(() => {
        setConfirmedSlots(dummyConfirmedSlots)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [trpId, getToken])

  const totalCost = confirmedSlots.reduce((acc, item) => acc + parseFloat(item.cost || '0'), 0)

  return (
    <PageWrapper mode={trip?.mode || 'Mode NA'} trpId={trpId} tripTitle="Confirmed Schedule">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-light pb-4">
          <div>
            <span className="text-xs font-mono text-amber font-bold uppercase tracking-wide">
              FINALIZED ITINERARY SCHEDULE
            </span>
            <h1 className="font-serif text-3xl font-bold text-ink mt-1">
              Confirmed Itinerary
            </h1>
            <p className="font-mono text-xs text-slate mt-0.5">
              Total Budget Committed: ${totalCost.toFixed(2)} USD
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/trips/${trpId}`)}>
            &larr; Back to Workspace
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
            Loading confirmed schedule...
          </div>
        ) : confirmedSlots.length === 0 ? (
          <EmptyState
            title="No confirmed slots yet"
            message="No slots have reached final consensus or confirmed status yet."
            actionLabel="Back to Trip"
            onAction={() => navigate(`/trips/${trpId}`)}
          />
        ) : (
          <div className="flex gap-4">
            {/* RouteLine rendering solid amber segments */}
            <RouteLine slots={confirmedSlots} />

            <div className="flex-1 flex flex-col gap-4">
              {confirmedSlots.map((item) => (
                <div
                  key={item.itmId}
                  className="bg-amber/5 border border-amber/40 border-l-2 border-l-amber rounded-[10px] p-5 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-amber font-bold uppercase">
                      CONFIRMED • {item.timeSlot || `Slot ${item.sortOrder}`}
                    </span>
                    <span className="font-mono text-sm text-amber font-semibold">
                      ${item.cost} {item.currency}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="font-sans font-medium text-ink text-lg">{item.title}</h3>
                    {item.entityType && (
                      <span className="text-xs font-mono text-slate capitalize">
                        Entity: {item.entityType} ({item.entityId || 'N/A'})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
