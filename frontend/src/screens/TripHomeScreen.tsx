import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { VoteModal } from './VoteModal'
import { ProposeActivityModal } from './ProposeActivityModal'
import type { ItineraryItem } from '../types/trip'
import { useTripContext } from '../context/TripContext'
import { getTrip, getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import { UserCheck, UserX, Clock, Users, Copy, KeyRound } from 'lucide-react'

export const TripHomeScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const navigate = useNavigate()
  const { addToast, trip, setTrip } = useTripContext()
  const { getToken } = useAuthContext()

  const [activeSlot, setActiveSlot] = useState<ItineraryItem | null>(null)
  const [isVoteOpen, setIsVoteOpen] = useState(false)
  const [isProposeOpen, setIsProposeOpen] = useState(false)
  const [selectedDayTab, setSelectedDayTab] = useState<'Day 1: Arrival' | 'Day 2: Beach' | 'Day 3: Explore' | 'Requests'>('Day 1: Arrival')
  const [pendingRequests, setPendingRequests] = useState<any[]>([])

  const day1Items: ItineraryItem[] = [
    {
      itmId: 'itm_d1_1',
      dayIndex: 1,
      sortOrder: 1,
      title: 'Breakfast at Artjuna',
      slotStatus: 'CONFIRMED',
      cost: '800.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_artjuna',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: true,
      status: 'confirmed',
      timeSlot: '09:00',
    },
    {
      itmId: 'itm_d1_2',
      dayIndex: 1,
      sortOrder: 2,
      title: 'Afternoon Activity',
      slotStatus: 'IN_CONSENSUS',
      cost: '2500.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_dudhsagar',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: false,
      status: 'proposed',
      timeSlot: '12:00',
    },
    {
      itmId: 'itm_d1_3',
      dayIndex: 1,
      sortOrder: 3,
      title: 'Candolim Beach + Fort Aguada',
      slotStatus: 'BRANCHED',
      cost: '1800.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_candolim',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: false,
      status: 'branched',
      timeSlot: '15:00',
    },
    {
      itmId: 'itm_d1_4',
      dayIndex: 1,
      sortOrder: 4,
      title: 'No activity planned yet',
      slotStatus: 'EMPTY',
      cost: '0.00',
      currency: 'INR',
      entityType: null,
      entityId: null,
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'free',
      locked: false,
      status: 'proposed',
      timeSlot: '19:00',
    },
  ]

  const day2Items: ItineraryItem[] = [
    {
      itmId: 'itm_d2_1',
      dayIndex: 2,
      sortOrder: 1,
      title: 'Baga Beach Paragliding & Jet Ski',
      slotStatus: 'CONFIRMED',
      cost: '1500.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_baga',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: true,
      status: 'confirmed',
      timeSlot: '09:00',
    },
    {
      itmId: 'itm_d2_2',
      dayIndex: 2,
      sortOrder: 2,
      title: 'Anjuna Flea Market Shopping',
      slotStatus: 'CONFIRMED',
      cost: '1000.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_anjuna_market',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: true,
      status: 'confirmed',
      timeSlot: '12:00',
    },
    {
      itmId: 'itm_d2_3',
      dayIndex: 2,
      sortOrder: 3,
      title: 'Chapora Fort Sunset Trail',
      slotStatus: 'IN_CONSENSUS',
      cost: '500.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_chapora',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: false,
      status: 'proposed',
      timeSlot: '15:00',
    },
    {
      itmId: 'itm_d2_4',
      dayIndex: 2,
      sortOrder: 4,
      title: "Tito's Lane Clubbing & Dinner",
      slotStatus: 'CONFIRMED',
      cost: '2000.00',
      currency: 'INR',
      entityType: 'meal',
      entityId: 'meal_titos',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'meal',
      locked: true,
      status: 'confirmed',
      timeSlot: '19:00',
    },
  ]

  const day3Items: ItineraryItem[] = [
    {
      itmId: 'itm_d3_1',
      dayIndex: 3,
      sortOrder: 1,
      title: 'Old Goa Basilica & Church Tour',
      slotStatus: 'CONFIRMED',
      cost: '600.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_old_goa',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: true,
      status: 'confirmed',
      timeSlot: '09:00',
    },
    {
      itmId: 'itm_d3_2',
      dayIndex: 3,
      sortOrder: 2,
      title: 'Tropical Spice Plantation & Goan Thali',
      slotStatus: 'CONFIRMED',
      cost: '1200.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_spice_plantation',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: true,
      status: 'confirmed',
      timeSlot: '12:00',
    },
    {
      itmId: 'itm_d3_3',
      dayIndex: 3,
      sortOrder: 3,
      title: 'Mandovi River Sunset Cruise',
      slotStatus: 'BRANCHED',
      cost: '2200.00',
      currency: 'INR',
      entityType: 'poi',
      entityId: 'poi_mandovi_cruise',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'poi',
      locked: false,
      status: 'branched',
      timeSlot: '15:00',
    },
    {
      itmId: 'itm_d3_4',
      dayIndex: 3,
      sortOrder: 4,
      title: 'Casino Cruise & Gala Dinner',
      slotStatus: 'CONFIRMED',
      cost: '3500.00',
      currency: 'INR',
      entityType: 'meal',
      entityId: 'meal_casino',
      itnId: 'itn_1',
      startsAt: null,
      endsAt: null,
      itemType: 'meal',
      locked: true,
      status: 'confirmed',
      timeSlot: '19:00',
    },
  ]

  const getCurrentDayItems = () => {
    if (selectedDayTab === 'Day 2: Beach') return day2Items
    if (selectedDayTab === 'Day 3: Explore') return day3Items
    return day1Items
  }

  const loadRequests = async () => {
    try {
      const reqs = await getJoinRequests(trpId, getToken)
      setPendingRequests(reqs.filter((r) => r.status === 'pending'))
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    if (!trpId) return
    getTrip(trpId, getToken)
      .then((t) => {
        if (t) setTrip(t)
      })
      .catch(() => null)

    loadRequests()
  }, [trpId, getToken, setTrip])

  const handleApprove = async (reqId: string) => {
    try {
      await approveJoinRequest(trpId, reqId, getToken)
      addToast('Join request approved! Member added.', 'success')
      loadRequests()
      getTrip(trpId, getToken).then((t) => t && setTrip(t))
    } catch (e: any) {
      addToast(e.message || 'Failed to approve request', 'error')
    }
  }

  const handleReject = async (reqId: string) => {
    try {
      await rejectJoinRequest(trpId, reqId, getToken)
      addToast('Join request declined.', 'info')
      loadRequests()
    } catch (e: any) {
      addToast(e.message || 'Failed to reject request', 'error')
    }
  }

  const handleProposalSuccess = () => {
    addToast('New proposal added to slot!', 'success')
  }

  const currentMode = trip?.mode || 'Mode A'

  return (
    <PageWrapper trpId={trpId} tripTitle={trip?.title || 'Goa Getaway'}>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Governance Mode Pill & Admin Indicator */}
        <div className="flex flex-col gap-3 bg-card border border-slate-light p-3.5 px-4 rounded-[10px] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate">Governance Mode:</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold ${
                  currentMode === 'Mode A'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                {currentMode === 'Mode A'
                  ? 'Mode A (Admin-Led: Owner Decides)'
                  : 'Mode NA (Collaborative: Group Voting & AI Consensus)'}
              </span>
            </div>

            <span className="font-mono text-xs text-slate">
              Role: <strong className="text-route">Owner (Admin)</strong>
            </span>
          </div>

          {/* Persistent Trip Share Code Banner */}
          <div className="flex flex-wrap items-center justify-between bg-paper border border-slate-light p-2 px-3 rounded-[8px] text-xs font-mono">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-slate">Team Access Code:</span>
              <span className="font-bold text-ink bg-card px-2 py-0.5 rounded border border-slate-light">{trpId}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(trpId)
                addToast(`Trip code "${trpId}" copied! Share with team members to join.`, 'info')
              }}
              className="text-route font-bold hover:underline flex items-center gap-1 bg-route/10 px-2.5 py-1 rounded text-[11px]"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Code</span>
            </button>
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
            {trip?.title || 'Goa Getaway'}
          </h1>
          <p className="font-mono text-xs text-slate">
            June 12–15 • {trip?.members?.length || 6} members
          </p>
        </div>

        {/* Day Tabs + Admin Requests Tab */}
        <div className="flex items-center justify-center gap-3 border-b border-slate-light pb-2">
          {(['Day 1: Arrival', 'Day 2: Beach', 'Day 3: Explore'] as const).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDayTab(day)}
              className={`px-4 py-2 font-mono text-xs font-semibold rounded-[8px] transition-all ${
                selectedDayTab === day
                  ? 'bg-route text-card shadow-xs'
                  : 'text-slate hover:text-ink hover:bg-slate-light/20'
              }`}
            >
              {day}
            </button>
          ))}

          {currentMode === 'Mode A' && pendingRequests.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDayTab('Requests')}
              className={`px-4 py-2 font-mono text-xs font-semibold rounded-[8px] transition-all flex items-center gap-1.5 ${
                selectedDayTab === 'Requests'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Requests</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-700 text-white">
                {pendingRequests.length}
              </span>
            </button>
          )}
        </div>

        {/* Pending Requests View for Owner */}
        {selectedDayTab === 'Requests' ? (
          <div className="flex flex-col gap-4 bg-card border border-slate-light p-6 rounded-[12px] shadow-xs">
            <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Join Requests ({pendingRequests.length})
            </h3>
            <p className="font-sans text-xs text-slate">
              As the trip owner of this Mode A trip, approve or decline requests from users wanting to join your trip.
            </p>

            <div className="flex flex-col gap-3 mt-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="p-4 bg-paper border border-slate-light rounded-[10px] flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-sans text-sm font-bold text-ink">
                      {req.displayName || req.userId || 'Traveler'}
                    </h4>
                    <p className="font-sans text-xs text-slate italic">
                      "{req.message || 'Wants to join your trip!'}"
                    </p>
                    <span className="font-mono text-[10px] text-slate/70">
                      User ID: {req.userId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleReject(req.requestId)}
                      className="py-1.5 px-3 text-xs border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(req.requestId)}
                      className="py-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Vertical Timeline Stream */
          <div className="flex flex-col gap-6 pl-4 border-l-2 border-slate-light/60 ml-4 relative my-4">
            {getCurrentDayItems().map((slot) => {
              const isConfirmed = slot.slotStatus === 'CONFIRMED'
              const isInConsensus = slot.slotStatus === 'IN_CONSENSUS'
              const isBranched = slot.slotStatus === 'BRANCHED'
              const isEmpty = slot.slotStatus === 'EMPTY'

              return (
                <div key={slot.itmId} className="relative flex items-start gap-6 group">
                  {/* Time Indicator Marker */}
                  <div className="font-mono text-xs font-bold text-slate w-12 shrink-0 -ml-10 bg-paper pr-2 text-right">
                    {slot.timeSlot || '12:00'}
                  </div>

                  {/* Timeline Dot */}
                  <span className="w-3 h-3 rounded-full bg-route border-2 border-card shadow-xs shrink-0 mt-1.5 -ml-7 z-10" />

                  {/* Slot Card */}
                  <div className="flex-1 bg-card border border-slate-light rounded-[12px] p-5 shadow-xs flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-ink">
                          {slot.title}
                        </h3>
                        {isConfirmed && (
                          <p className="font-sans text-xs text-slate mt-1">
                            Gather the crew for coffee and croissants before heading out. • ₹{slot.cost}
                          </p>
                        )}
                        {isInConsensus && (
                          <p className="font-sans text-xs text-slate mt-1">
                            The group is currently reviewing activity options for this time slot.
                          </p>
                        )}
                        {isBranched && (
                          <p className="font-sans text-xs text-slate mt-1">
                            Relax at Candolim before visiting Fort Aguada in the afternoon.
                          </p>
                        )}
                        {isEmpty && (
                          <p className="font-sans text-xs text-slate italic mt-1">
                            No activity planned yet for this slot.
                          </p>
                        )}
                      </div>

                      {/* PDF Design Status Tags */}
                      {isConfirmed && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                          CONFIRMED
                        </span>
                      )}
                      {isInConsensus && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300 shrink-0">
                          OPEN FOR DECISION
                        </span>
                      )}
                      {isBranched && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-300 shrink-0">
                          RESOLVED FROM POLL
                        </span>
                      )}
                    </div>

                    {/* Actions depending on slot status */}
                    {isInConsensus && (
                      <div className="pt-2">
                        <Button
                          onClick={() => navigate(`/trips/${trpId}/branches/${slot.itmId}`)}
                          className="py-1.5 px-4 text-xs font-semibold"
                        >
                          Go to Propose &amp; Resolve &rarr;
                        </Button>
                      </div>
                    )}

                    {isEmpty && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSlot(slot)
                            setIsProposeOpen(true)
                          }}
                          className="text-xs font-mono text-route font-bold hover:underline"
                        >
                          + Explore options in Propose &amp; Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modals */}
        <VoteModal
          isOpen={isVoteOpen}
          onClose={() => setIsVoteOpen(false)}
          item={activeSlot}
          mode={currentMode}
          currentUserRole="owner"
        />

        <ProposeActivityModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          trpId={trpId}
          itmId={activeSlot?.itmId}
          onSuccess={handleProposalSuccess}
        />
      </div>
    </PageWrapper>
  )
}
