import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { SlotCard } from '../components/itinerary/SlotCard'
import { ConflictResolutionPanel, dummyBlendedPlan } from '../components/itinerary/ConflictResolutionPanel'
import { RouteLine } from '../components/itinerary/RouteLine'
import { Button } from '../components/ui/Button'
import { VoteModal } from './VoteModal'
import { ProposeActivityModal } from './ProposeActivityModal'
import type { ItineraryItem, SlotStatus } from '../types/trip'
import { useTripContext } from '../context/TripContext'
import { getTrip, apiFetch } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'

export const TripHomeScreen: React.FC = () => {
  const { trpId = 'trp_bali_2026' } = useParams()
  const navigate = useNavigate()
  const { addToast, trip, setTrip } = useTripContext()
  const { getToken } = useAuthContext()

  const [activeSlot, setActiveSlot] = useState<ItineraryItem | null>(null)
  const [isVoteOpen, setIsVoteOpen] = useState(false)
  const [isProposeOpen, setIsProposeOpen] = useState(false)
  const [tripMode, setTripMode] = useState<'Mode A' | 'Mode NA'>('Mode A')
  const [userRole] = useState<'owner' | 'editor' | 'viewer'>('owner')
  const [isLoading, setIsLoading] = useState(true)

  // Map of itmId -> AI blended plan
  const [aiPlans, setAiPlans] = useState<Record<string, typeof dummyBlendedPlan.blendedPlan>>({
    itm_b2: dummyBlendedPlan.blendedPlan,
  })

  const dummyFallbackItems: ItineraryItem[] = [
    {
      itmId: 'itm_b1',
      dayIndex: 1,
      sortOrder: 1,
      title: 'Sacred Monkey Forest',
      slotStatus: 'CONFIRMED',
      cost: '25.00',
      currency: 'USD',
      entityType: 'poi',
      entityId: 'poi_monkey_forest',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: false,
      status: 'confirmed',
      timeSlot: 'Morning',
    },
    {
      itmId: 'itm_b2',
      dayIndex: 1,
      sortOrder: 2,
      title: 'Mount Batur Trek',
      slotStatus: 'IN_CONSENSUS',
      cost: '65.00',
      currency: 'USD',
      entityType: 'poi',
      entityId: 'poi_batur',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: false,
      status: 'proposed',
      timeSlot: 'Afternoon',
    },
    {
      itmId: 'itm_b3',
      dayIndex: 1,
      sortOrder: 3,
      title: 'Evening Activity',
      slotStatus: 'EMPTY',
      cost: '0.00',
      currency: 'USD',
      entityType: null,
      entityId: null,
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'free',
      locked: false,
      status: 'proposed',
      timeSlot: 'Evening',
    },
    {
      itmId: 'itm_b4',
      dayIndex: 1,
      sortOrder: 4,
      title: 'Dinner Options',
      slotStatus: 'BRANCHED',
      cost: '30.00',
      currency: 'USD',
      entityType: 'meal',
      entityId: 'meal_dinner',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'meal',
      locked: false,
      status: 'branched',
      timeSlot: 'Night',
    },
  ]

  const [items, setItems] = useState<ItineraryItem[]>(dummyFallbackItems)

  const dummyMembers = [
    { tmbId: 'tmb_1', trpId: 'trp_bali_2026', usrId: 'usr_1', displayName: 'Alex Chen', role: 'owner' as const, joinedAt: '2026-01-01' },
    { tmbId: 'tmb_2', trpId: 'trp_bali_2026', usrId: 'usr_2', displayName: 'Priya Sharma', role: 'editor' as const, joinedAt: '2026-01-01' },
    { tmbId: 'tmb_3', trpId: 'trp_bali_2026', usrId: 'usr_3', displayName: 'Jordan Lee', role: 'editor' as const, joinedAt: '2026-01-01' },
    { tmbId: 'tmb_4', trpId: 'trp_bali_2026', usrId: 'usr_4', displayName: 'Sam Rivera', role: 'editor' as const, joinedAt: '2026-01-01' },
  ]

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getTrip(trpId, getToken)
      .then((data) => {
        if (isMounted && data) {
          setTrip(data)
          if (data.mode) setTripMode(data.mode)
          if (data.itinerary?.items && data.itinerary.items.length > 0) {
            setItems(data.itinerary.items)
          }
        }
      })
      .catch(() => {
        // Fallback for Phase 4 dev mode
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [trpId, getToken, setTrip])

  // Synchronize items if context trip updates via WS
  useEffect(() => {
    if (trip?.itinerary?.items) {
      setItems(trip.itinerary.items)
    }
  }, [trip?.itinerary?.items])

  const handleProposalSuccess = () => {
    if (activeSlot) {
      setItems((prev) =>
        prev.map((item) =>
          item.itmId === activeSlot.itmId
            ? { ...item, slotStatus: 'IN_CONSENSUS' as SlotStatus }
            : item
        )
      )
    }
  }

  const handleInvokeAI = async (itmId: string) => {
    try {
      await apiFetch('/api/consensus/reconcile', {
        method: 'POST',
        body: JSON.stringify({ itmId, trpId }),
      }, getToken).catch(() => null)

      setAiPlans((prev) => ({
        ...prev,
        [itmId]: dummyBlendedPlan.blendedPlan,
      }))
      addToast('AI Consensus generated blended plan!', 'success')
    } catch {
      addToast('Failed to generate AI plan', 'conflict')
    }
  }

  return (
    <PageWrapper
      mode={tripMode}
      trpId={trpId}
      tripTitle={trip?.title || 'Bali Tropical Escape'}
      onlineMembers={trip?.members || dummyMembers}
    >
      <div className="flex flex-col md:flex-row relative">
        {/* Left column: Itinerary Timeline */}
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          {/* Hero header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-ink">
                {trip?.title || 'Bali Tropical Escape'}
              </h1>
              <p className="font-mono text-sm text-slate mt-1">
                {trip?.startDate || '12 Oct'} – {trip?.endDate || '16 Oct'} · {tripMode}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTripMode((prev) => (prev === 'Mode A' ? 'Mode NA' : 'Mode A'))}
                className="text-xs font-mono px-3 py-1.5 rounded-full border border-slate-light text-slate hover:bg-slate-light/20"
              >
                Switch to {tripMode === 'Mode A' ? 'Mode NA' : 'Mode A'}
              </button>

              <Button
                onClick={() => {
                  setActiveSlot(items.find((i) => i.slotStatus === 'EMPTY') || items[2])
                  setIsProposeOpen(true)
                }}
              >
                + Propose Activity
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
              Loading itinerary...
            </div>
          ) : (
            <div className="flex gap-4">
              <RouteLine slots={items} />

              <div className="flex-1 flex flex-col gap-4">
                {items.map((item) => {
                  const hasAiPlan = item.slotStatus === 'IN_CONSENSUS' && aiPlans[item.itmId]

                  return (
                    <div key={item.itmId} className="flex flex-col gap-2">
                      <SlotCard
                        item={item}
                        isAdmin={userRole === 'owner'}
                        currentUserRole={userRole}
                        mode={tripMode}
                        onVote={() => {
                          setActiveSlot(item)
                          setIsVoteOpen(true)
                        }}
                        onPropose={() => {
                          setActiveSlot(item)
                          setIsProposeOpen(true)
                        }}
                        onViewBranches={() => navigate(`/trips/${trpId}/branches/${item.itmId}`)}
                        onInvokeAI={() => handleInvokeAI(item.itmId)}
                      />

                      {/* Inline Conflict Resolution Panel */}
                      {hasAiPlan && (
                        <ConflictResolutionPanel
                          currentRound={2}
                          blendedPlan={aiPlans[item.itmId]}
                          mode={tripMode}
                          currentUserRole={userRole}
                          itmId={item.itmId}
                          prpId={item.activeProposal?.prpId}
                          onAccept={() => addToast('Accepted blended plan for slot', 'success')}
                          onForceBranch={() => addToast('Forced branching for slot', 'conflict')}
                          onExtend={() => addToast('Extended round for consensus', 'info')}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating sticky + Propose button on mobile */}
      <div className="md:hidden fixed bottom-4 right-4 z-30">
        <Button
          onClick={() => {
            setActiveSlot(items.find((i) => i.slotStatus === 'EMPTY') || items[2])
            setIsProposeOpen(true)
          }}
          className="shadow-lg"
        >
          + Propose
        </Button>
      </div>

      {/* Modals */}
      <VoteModal
        isOpen={isVoteOpen}
        onClose={() => setIsVoteOpen(false)}
        item={activeSlot}
        mode={tripMode}
        currentUserRole={userRole}
      />

      <ProposeActivityModal
        isOpen={isProposeOpen}
        onClose={() => setIsProposeOpen(false)}
        trpId={trpId}
        itmId={activeSlot?.itmId}
        onSuccess={handleProposalSuccess}
      />
    </PageWrapper>
  )
}
