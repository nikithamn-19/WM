import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { useTripContext } from '../context/TripContext'
import { ProposeActivityModal } from './ProposeActivityModal'

export interface TimelineSlotItem {
  itmId: string
  time: string
  title: string
  status: 'CONFIRMED' | 'ONGOING' | 'PROPOSED' | 'UNASSIGNED'
  description: string
  cost?: string
  currency?: string
  type?: string
  duration?: string
  isLocked?: boolean
  note?: string
}

export const TripHomeScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const { addToast } = useTripContext()

  // Active Day Tab
  const [activeDay, setActiveDay] = useState<number>(1)

  // Modal State
  const [isProposeOpen, setIsProposeOpen] = useState(false)
  const [activeSlotName, setActiveSlotName] = useState('New Activity Slot')

  // Stats drawer toggle (optional info from Image 1)
  const [showStats, setShowStats] = useState(false)

  // Day 1 Items (Matches Image 2 & 3 + Image 1 debate functionalities)
  const [day1Items] = useState<TimelineSlotItem[]>([
    {
      itmId: 'itm_b94582f9',
      time: '09:00',
      title: 'Breakfast at Artjuna',
      status: 'CONFIRMED',
      description: 'Gather the crew for coffee and croissants before heading out.',
      cost: '800.00',
      currency: '₹',
      type: 'Dining / Breakfast',
      duration: '60m',
      isLocked: true,
    },
    {
      itmId: 'itm_02',
      time: '12:00',
      title: 'Afternoon Activity',
      status: 'ONGOING',
      description: 'Group polls are actively underway between Anjuna Scuba diving and Chapora boat cruise.',
      cost: '200.00',
      currency: '₹',
      type: 'Poi / Sightseeing',
      duration: '75m',
    },
    {
      itmId: 'itm_03',
      time: '15:00',
      title: 'Candolim Beach + Fort Aguada',
      status: 'CONFIRMED',
      description: 'Relax at Candolim before visiting Fort Aguada in the afternoon.',
      cost: '200.00',
      currency: '₹',
      type: 'Poi / Beach',
      duration: '180m',
    },
    {
      itmId: 'itm_04_prop',
      time: '17:30',
      title: 'Backwater Sunset Shack & Dinner',
      status: 'PROPOSED',
      description: 'Fresh seafood dinner proposal submitted by group member; awaiting poll opening.',
      cost: '500.00',
      currency: '₹',
      type: 'Dining / Leisure',
      duration: '90m',
    },
    {
      itmId: 'itm_empty_1',
      time: '20:00',
      title: 'No activity planned yet',
      status: 'UNASSIGNED',
      description: 'No activity planned yet for this slot.',
    },
  ])

  // Day 2 Items
  const [day2Items] = useState<TimelineSlotItem[]>([
    {
      itmId: 'itm_04',
      time: '09:30',
      title: 'Tea Estate Trail & Nature Walk',
      status: 'CONFIRMED',
      description: 'Matches the budget style you described; slotted early to avoid crowds.',
      cost: '500.00',
      currency: '₹',
      type: 'Poi / Nature',
      duration: '180m',
      isLocked: true,
      note: 'Slotted early to avoid peak mid-day heat.',
    },
    {
      itmId: 'itm_05',
      time: '14:00',
      title: 'Kayaking in Sal River Backwaters',
      status: 'ONGOING',
      description: 'Polls are ongoing for group kayaking vs private motorboat cruise.',
      cost: '1200.00',
      currency: '₹',
      type: 'Activity / Adventure',
      duration: '120m',
    },
    {
      itmId: 'itm_06',
      time: '18:30',
      title: 'Sunset Cruise & Beach Shack Dinner',
      status: 'PROPOSED',
      description: 'Catamaran cruise proposal under initial review.',
      cost: '600.00',
      currency: '₹',
      type: 'Dining & Leisure',
      duration: '150m',
    },
    {
      itmId: 'itm_empty_2',
      time: '21:30',
      title: 'No activity planned yet',
      status: 'UNASSIGNED',
      description: 'No activity planned yet for this slot.',
    },
  ])

  // Day 3 Items
  const [day3Items] = useState<TimelineSlotItem[]>([
    {
      itmId: 'itm_07',
      time: '10:00',
      title: 'Old Goa Heritage Basilica & Spice Trail',
      status: 'CONFIRMED',
      description: 'Guided tour of historical Portuguese churches and organic spice plantations.',
      cost: '450.00',
      currency: '₹',
      type: 'Culture & Heritage',
      duration: '180m',
      isLocked: true,
    },
    {
      itmId: 'itm_08',
      time: '15:30',
      title: 'Anjuna Flea Market & Local Crafts',
      status: 'ONGOING',
      description: 'Polls are ongoing for afternoon market trip vs beach relaxation.',
      cost: '300.00',
      currency: '₹',
      type: 'Shopping & Market',
      duration: '120m',
    },
    {
      itmId: 'itm_09',
      time: '19:30',
      title: 'Farewell Dinner at Thalassa Waterfront',
      status: 'PROPOSED',
      description: 'Cliffside Greek dinner proposal pending group review.',
      cost: '1500.00',
      currency: '₹',
      type: 'Dining',
      duration: '120m',
    },
  ])

  // Get active items for current day
  const currentItems = activeDay === 1 ? day1Items : activeDay === 2 ? day2Items : day3Items

  // Helper for status badge styling
  const renderStatusBadge = (status: TimelineSlotItem['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full shrink-0">
            CONFIRMED
          </span>
        )
      case 'ONGOING':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full shrink-0">
            ONGOING
          </span>
        )
      case 'PROPOSED':
        return (
          <span className="bg-purple-100 text-purple-900 border border-purple-300 font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full shrink-0">
            PROPOSED
          </span>
        )
      default:
        return null
    }
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Goa Getaway">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
        {/* 1. Governance & Role Sub-Banner (Matches Image 2 & 3) */}
        <div className="bg-card border border-slate-light rounded-xl px-5 py-3 flex flex-wrap items-center justify-between shadow-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate font-medium">Governance Mode:</span>
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-0.5 rounded-full text-xs font-mono font-medium">
              Mode A (Admin-Led: Owner Decides)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-slate font-medium">
              Role: <strong className="text-ink font-semibold">Owner (Admin)</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowStats(!showStats)}
              className="text-xs font-mono text-route hover:underline"
            >
              {showStats ? 'Hide Stats ▲' : 'Trip Stats ▼'}
            </button>
          </div>
        </div>

        {/* Collapsible Stats Box from Image 1 (Total Cost, Carbon, Members) */}
        {showStats && (
          <div className="bg-card border border-slate-light rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono uppercase text-slate">Estimated Total Cost</span>
              <span className="text-xl font-mono font-bold text-ink mt-0.5">INR 8,450.00</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono uppercase text-slate">Carbon Footprint</span>
              <span className="text-xl font-mono font-bold text-emerald-700 mt-0.5">6.5 kg CO₂</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono uppercase text-slate">Trip Members</span>
              <span className="text-xs font-mono text-ink mt-1">usr_02b (editor) · usr_33d · Nikitha (owner)</span>
            </div>
          </div>
        )}

        {/* 2. Trip Title & Dates Header (Centered, Matches Image 2 & 3) */}
        <div className="flex flex-col items-center justify-center text-center gap-1 pt-2">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            Goa Getaway
          </h1>
          <p className="font-mono text-xs text-slate">
            June 12–15 · 6 members
          </p>

          {/* 3. Day Selector Pills (Centered Horizontal Tabs) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mt-4">
            <button
              type="button"
              onClick={() => setActiveDay(1)}
              className={`text-xs sm:text-sm px-4 py-1.5 rounded-[6px] font-sans transition-all ${
                activeDay === 1
                  ? 'bg-route text-card font-semibold shadow-xs'
                  : 'text-slate hover:text-ink font-medium hover:bg-paper'
              }`}
            >
              Day 1: Arrival
            </button>

            <button
              type="button"
              onClick={() => setActiveDay(2)}
              className={`text-xs sm:text-sm px-4 py-1.5 rounded-[6px] font-sans transition-all ${
                activeDay === 2
                  ? 'bg-route text-card font-semibold shadow-xs'
                  : 'text-slate hover:text-ink font-medium hover:bg-paper'
              }`}
            >
              Day 2: Beach
            </button>

            <button
              type="button"
              onClick={() => setActiveDay(3)}
              className={`text-xs sm:text-sm px-4 py-1.5 rounded-[6px] font-sans transition-all ${
                activeDay === 3
                  ? 'bg-route text-card font-semibold shadow-xs'
                  : 'text-slate hover:text-ink font-medium hover:bg-paper'
              }`}
            >
              Day 3: Explore
            </button>
          </div>
        </div>

        {/* 4. Timeline View Container (Matches Image 2 & 3 Layout) */}
        <div className="flex flex-col mt-4">
          {currentItems.map((slot, idx) => {
            const isLast = idx === currentItems.length - 1
            const isUnassigned = slot.status === 'UNASSIGNED'

            return (
              <div key={slot.itmId} className="flex items-stretch gap-3 sm:gap-4 relative group">
                {/* Time Label (Left) */}
                <div className="w-12 sm:w-14 text-right shrink-0 pt-6">
                  <span className="font-mono text-xs font-bold text-slate">
                    {slot.time}
                  </span>
                </div>

                {/* Timeline Axis & Dot */}
                <div className="relative flex flex-col items-center shrink-0 w-4">
                  {/* Timeline Dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1b4332] border-2 border-paper z-10 mt-[26px] shadow-2xs group-hover:scale-125 transition-transform" />
                  {/* Vertical Line */}
                  {!isLast && (
                    <div className="w-[1.5px] bg-slate-light/90 flex-1 my-1" />
                  )}
                </div>

                {/* Timeline Card (Right, Matches Image 2 & 3) */}
                <div className="bg-card border border-slate-light rounded-[12px] p-5 sm:p-6 shadow-xs flex-1 flex flex-col justify-between gap-3 mb-5 hover:border-route/60 transition-all">
                  <div className="flex flex-col gap-2">
                    {/* Card Header: Title + Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-ink">
                          {slot.title}
                        </h3>
                        {slot.isLocked && (
                          <span className="text-xs text-amber-600" title="Locked by Admin">
                            🔒
                          </span>
                        )}
                      </div>
                      {renderStatusBadge(slot.status)}
                    </div>

                    {/* Subtitle / Description */}
                    <p className="font-sans text-xs text-slate leading-relaxed">
                      {slot.description}
                      {slot.cost && (
                        <span className="font-mono font-medium text-ink/80 ml-1.5">
                          • {slot.currency} {slot.cost}
                        </span>
                      )}
                    </p>

                    {/* Meta Type & Duration if available */}
                    {slot.type && (
                      <p className="font-mono text-[11px] text-slate/80">
                        Type: {slot.type} {slot.duration ? `· Duration: ${slot.duration}` : ''}
                      </p>
                    )}

                    {slot.note && (
                      <p className="font-sans text-xs text-slate italic bg-paper p-2 rounded border border-slate-light/50">
                        "{slot.note}"
                      </p>
                    )}
                  </div>

                  {/* Card Actions (View Debate option for all activities listed) */}
                  <div className="flex items-center justify-between w-full pt-1">
                    {isUnassigned ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSlotName(`Day ${activeDay} - ${slot.time} Slot`)
                            setIsProposeOpen(true)
                          }}
                          className="text-xs font-mono font-semibold text-route hover:underline flex items-center gap-1"
                        >
                          <span>+ Propose Activity</span>
                        </button>
                        <Link
                          to={`/trips/${trpId}/slots/itm_b94582f9`}
                          className="text-xs font-mono font-semibold text-route hover:underline flex items-center gap-1"
                        >
                          <span>View Debate</span>
                          <span>&rarr;</span>
                        </Link>
                      </>
                    ) : (
                      <div className="flex items-center justify-end w-full">
                        <Link
                          to={`/trips/${trpId}/slots/${slot.itmId}`}
                          className="text-xs font-mono font-semibold text-route hover:underline flex items-center gap-1"
                        >
                          <span>View Debate</span>
                          <span>&rarr;</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal for Proposing / Adding New Activity Slot */}
        <ProposeActivityModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          trpId={trpId}
          slotTime={activeSlotName}
          onSuccess={() => {
            addToast('New activity slot submitted for group review!', 'success')
          }}
        />
      </div>
    </PageWrapper>
  )
}
