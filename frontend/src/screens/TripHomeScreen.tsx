import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { useTripContext } from '../context/TripContext'

export interface TimelineSlotItem {
  itmId: string
  time: string
  title: string
  status: 'CONFIRMED' | 'ONGOING' | 'PROPOSED'
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

  // Trip Code & Copy State
  const [copiedTripCode, setCopiedTripCode] = useState(false)
  const tripCode = trpId === 'trp_goa_2026' ? 'GOA-2026' : trpId.toUpperCase().replace('TRP_', '')

  const handleCopyTripCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tripCode)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = tripCode
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedTripCode(true)
      addToast(`Trip code "${tripCode}" copied to clipboard!`, 'success')
      setTimeout(() => setCopiedTripCode(false), 2000)
    } catch (err) {
      console.error('Failed to copy trip code', err)
      addToast('Failed to copy trip code', 'conflict')
    }
  }

  // Create Activity Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newActivityName, setNewActivityName] = useState('')
  const [newActivityDay, setNewActivityDay] = useState<number>(1)
  const [newActivityTime, setNewActivityTime] = useState('16:00')
  const [newActivityDescription, setNewActivityDescription] = useState('')
  const [newActivityBudget, setNewActivityBudget] = useState('800.00')

  // Day 1 Items
  const [day1Items, setDay1Items] = useState<TimelineSlotItem[]>([
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
  ])

  // Day 2 Items
  const [day2Items, setDay2Items] = useState<TimelineSlotItem[]>([
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
  ])

  // Day 3 Items
  const [day3Items, setDay3Items] = useState<TimelineSlotItem[]>([
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

  // Handle Create Activity
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newActivityName.trim()) {
      addToast('Please enter an activity name', 'conflict')
      return
    }

    const newItem: TimelineSlotItem = {
      itmId: `itm_${Date.now()}`,
      time: newActivityTime || '16:00',
      title: newActivityName.trim(),
      status: 'PROPOSED',
      description: newActivityDescription.trim() || 'Custom activity proposed by group member.',
      cost: newActivityBudget.trim() || '0.00',
      currency: '₹',
      type: 'Activity',
      duration: '60m',
    }

    if (newActivityDay === 1) {
      setDay1Items((prev) => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)))
    } else if (newActivityDay === 2) {
      setDay2Items((prev) => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)))
    } else {
      setDay3Items((prev) => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)))
    }

    setActiveDay(newActivityDay)
    addToast(`Activity "${newItem.title}" created for Day ${newActivityDay}!`, 'success')

    // Reset & Close
    setNewActivityName('')
    setNewActivityDescription('')
    setNewActivityBudget('800.00')
    setNewActivityTime('16:00')
    setIsCreateModalOpen(false)
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Goa Getaway">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
        {/* 1. Governance & Role Sub-Banner (Stats removed as requested) */}
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
          </div>
        </div>

        {/* 2. Trip Title & Dates Header (Centered, Matches Image 2 & 3) */}
        <div className="relative flex flex-col items-center justify-center text-center gap-1 pt-2">
          {/* Top-Right Corner Copy Trip Code Button (Above Create Activity, beside Goa Getaway heading) */}
          <div className="sm:absolute sm:right-0 sm:top-2 flex items-center justify-end mb-2 sm:mb-0">
            <button
              type="button"
              onClick={handleCopyTripCode}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-light bg-card hover:bg-paper text-slate hover:text-ink transition-all shadow-2xs group cursor-pointer text-xs"
              title="Click to copy trip code"
            >
              <span className="text-slate font-sans text-xs">Trip Code:</span>
              <span className="font-bold text-ink bg-route/10 text-route px-2 py-0.5 rounded font-mono text-xs border border-route/20">
                {tripCode}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-route font-sans font-semibold group-hover:underline ml-0.5">
                {copiedTripCode ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate group-hover:text-route transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Trip Code</span>
                  </>
                )}
              </span>
            </button>
          </div>

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
              className={`text-xs sm:text-sm px-4 py-1.5 rounded-[6px] font-sans transition-all cursor-pointer ${
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
              className={`text-xs sm:text-sm px-4 py-1.5 rounded-[6px] font-sans transition-all cursor-pointer ${
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
              className={`text-xs sm:text-sm px-4 py-1.5 rounded-[6px] font-sans transition-all cursor-pointer ${
                activeDay === 3
                  ? 'bg-route text-card font-semibold shadow-xs'
                  : 'text-slate hover:text-ink font-medium hover:bg-paper'
              }`}
            >
              Day 3: Explore
            </button>
          </div>
        </div>

        {/* Top-Right Header Bar Above Activities: "Create Activity" Button */}
        <div className="flex items-center justify-between pt-3 pb-1 border-b border-slate-light/60">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold text-ink">
              Day {activeDay} Itinerary
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewActivityDay(activeDay)
              setIsCreateModalOpen(true)
            }}
            className="bg-route text-card font-sans font-semibold text-xs px-4 py-2 rounded-[8px] hover:opacity-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>Create Activity</span>
          </button>
        </div>

        {/* 4. Timeline View Container (Matches Image 2 & 3 Layout) */}
        <div className="flex flex-col mt-2">
          {currentItems.length === 0 ? (
            <div className="bg-card border border-slate-light/60 rounded-[12px] p-8 text-center my-4">
              <p className="font-sans text-sm text-slate">No activities scheduled for Day {activeDay}.</p>
              <button
                type="button"
                onClick={() => {
                  setNewActivityDay(activeDay)
                  setIsCreateModalOpen(true)
                }}
                className="mt-3 text-xs font-mono font-semibold text-route hover:underline cursor-pointer"
              >
                + Create Activity
              </button>
            </div>
          ) : (
            currentItems.map((slot, idx) => {
              const isLast = idx === currentItems.length - 1

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
                    <div className="flex items-center justify-end w-full pt-1">
                      <Link
                        to={`/trips/${trpId}/slots/${slot.itmId}`}
                        className="text-xs font-mono font-semibold text-route hover:underline flex items-center gap-1"
                      >
                        <span>View Debate</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal for Creating New Activity (Activity details, day, time, 1-line description, budget) */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-slate-light rounded-[16px] max-w-lg w-full p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-slate-light pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-ink">
                    Create New Activity
                  </h3>
                  <p className="font-sans text-xs text-slate mt-0.5">
                    Add a new activity to your group trip timeline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate hover:text-ink text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateActivity} className="flex flex-col gap-3.5">
                {/* 1. Activity Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate font-medium">Activity Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunset Kayaking at Palolem Beach"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-route"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 2. What Day of the Trip */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-slate font-medium">What Day of the Trip?</label>
                    <select
                      value={newActivityDay}
                      onChange={(e) => setNewActivityDay(Number(e.target.value))}
                      className="bg-paper border border-slate-light rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-route"
                    >
                      <option value={1}>Day 1: Arrival</option>
                      <option value={2}>Day 2: Beach</option>
                      <option value={3}>Day 3: Explore</option>
                    </select>
                  </div>

                  {/* 3. Time */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-slate font-medium">Time</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 16:30 or 04:30 PM"
                      value={newActivityTime}
                      onChange={(e) => setNewActivityTime(e.target.value)}
                      className="bg-paper border border-slate-light rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-route"
                    />
                  </div>
                </div>

                {/* 4. 1-line Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate font-medium">1-Line Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Guided paddle through calm coastal waters to watch the sunset."
                    value={newActivityDescription}
                    onChange={(e) => setNewActivityDescription(e.target.value)}
                    className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-route"
                  />
                </div>

                {/* 5. Budget */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate font-medium">Budget / Estimated Cost (INR ₹)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 800.00"
                    value={newActivityBudget}
                    onChange={(e) => setNewActivityBudget(e.target.value)}
                    className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-route"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-light">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-xs px-4 py-2 border border-slate-light rounded-md text-slate hover:bg-paper cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-4 py-2 bg-route text-card rounded-md font-semibold hover:opacity-95 shadow-xs cursor-pointer"
                  >
                    Create Activity
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
