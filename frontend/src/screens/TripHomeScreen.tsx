import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { useTripContext } from '../context/TripContext'

export interface TimelineSlotItem {
  itmId: string
  time: string // Start time, e.g. "09:00"
  endTime: string // End time, e.g. "10:00"
  title: string
  status: 'CONFIRMED' | 'ONGOING' | 'PROPOSED'
  description: string
  cost?: string
  currency?: string
  type?: string
  duration?: string
  isLocked?: boolean
  note?: string
  creatorRole?: 'owner' | 'member'
}

export interface DayInfo {
  dayNum: number
  label: string
}

// Time calculation helpers
export function parseTimeToMinutes(t: string): number {
  if (!t) return 0
  // Handles "09:00", "9:00", "09:00 AM"
  const clean = t.trim().toUpperCase()
  const isPM = clean.includes('PM')
  const isAM = clean.includes('AM')
  const parts = clean.replace(/[A-Z\s]/g, '').split(':')
  let h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  if (isPM && h < 12) h += 12
  if (isAM && h === 12) h = 0
  return h * 60 + m
}

export function calculateEndTime(startTime: string, durationStr?: string): string {
  if (!startTime) return '12:00'
  let durationMinutes = 60
  if (durationStr) {
    const match = durationStr.match(/(\d+)\s*m/)
    if (match) {
      durationMinutes = parseInt(match[1], 10)
    }
  }

  const startMin = parseTimeToMinutes(startTime)
  const totalMin = startMin + durationMinutes
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
}

export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a1 = parseTimeToMinutes(startA)
  const a2 = parseTimeToMinutes(endA)
  const b1 = parseTimeToMinutes(startB)
  const b2 = parseTimeToMinutes(endB)
  return Math.max(a1, b1) < Math.min(a2, b2)
}

export const TripHomeScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const { addToast } = useTripContext()

  // Governance & Permissions State
  const [governanceMode, setGovernanceMode] = useState<'Mode A' | 'Mode NA'>('Mode A')
  const [userRole, setUserRole] = useState<'Owner (Admin)' | 'Member'>('Owner (Admin)')
  const [isItinerarySaved, setIsItinerarySaved] = useState<boolean>(true)

  // Dynamic Days List (Default 3 days, user can customize and add more)
  const [daysList, setDaysList] = useState<DayInfo[]>([
    { dayNum: 1, label: 'Day 1: Arrival' },
    { dayNum: 2, label: 'Day 2: Beach' },
    { dayNum: 3, label: 'Day 3: Explore' },
  ])
  const [activeDay, setActiveDay] = useState<number>(1)

  // Items per day map
  const [dayItemsMap, setDayItemsMap] = useState<Record<number, TimelineSlotItem[]>>({
    1: [
      {
        itmId: 'itm_b94582f9',
        time: '09:00',
        endTime: '10:00',
        title: 'Breakfast at Artjuna',
        status: 'CONFIRMED',
        description: 'Gather the crew for coffee and croissants before heading out.',
        cost: '800.00',
        currency: '₹',
        type: 'Dining / Breakfast',
        duration: '60m',
        isLocked: true,
        creatorRole: 'owner',
      },
      {
        itmId: 'itm_02',
        time: '12:00',
        endTime: '13:15',
        title: 'Afternoon Activity',
        status: 'ONGOING',
        description: 'Group polls are actively underway between Anjuna Scuba diving and Chapora boat cruise.',
        cost: '200.00',
        currency: '₹',
        type: 'Poi / Sightseeing',
        duration: '75m',
        creatorRole: 'owner',
      },
      {
        itmId: 'itm_03',
        time: '15:00',
        endTime: '18:00',
        title: 'Candolim Beach + Fort Aguada',
        status: 'CONFIRMED',
        description: 'Relax at Candolim before visiting Fort Aguada in the afternoon.',
        cost: '200.00',
        currency: '₹',
        type: 'Poi / Beach',
        duration: '180m',
        creatorRole: 'owner',
      },
    ],
    2: [
      {
        itmId: 'itm_04',
        time: '09:30',
        endTime: '12:30',
        title: 'Tea Estate Trail & Nature Walk',
        status: 'CONFIRMED',
        description: 'Matches the budget style you described; slotted early to avoid crowds.',
        cost: '500.00',
        currency: '₹',
        type: 'Poi / Nature',
        duration: '180m',
        isLocked: true,
        note: 'Slotted early to avoid peak mid-day heat.',
        creatorRole: 'owner',
      },
      {
        itmId: 'itm_05',
        time: '14:00',
        endTime: '16:00',
        title: 'Kayaking in Sal River Backwaters',
        status: 'ONGOING',
        description: 'Polls are ongoing for group kayaking vs private motorboat cruise.',
        cost: '1200.00',
        currency: '₹',
        type: 'Activity / Adventure',
        duration: '120m',
        creatorRole: 'owner',
      },
      {
        itmId: 'itm_06',
        time: '18:30',
        endTime: '21:00',
        title: 'Sunset Cruise & Beach Shack Dinner',
        status: 'PROPOSED',
        description: 'Catamaran cruise proposal under initial review.',
        cost: '600.00',
        currency: '₹',
        type: 'Dining & Leisure',
        duration: '150m',
        creatorRole: 'member',
      },
    ],
    3: [
      {
        itmId: 'itm_07',
        time: '10:00',
        endTime: '13:00',
        title: 'Old Goa Heritage Basilica & Spice Trail',
        status: 'CONFIRMED',
        description: 'Guided tour of historical Portuguese churches and organic spice plantations.',
        cost: '450.00',
        currency: '₹',
        type: 'Culture & Heritage',
        duration: '180m',
        isLocked: true,
        creatorRole: 'owner',
      },
      {
        itmId: 'itm_08',
        time: '15:30',
        endTime: '17:30',
        title: 'Anjuna Flea Market & Local Crafts',
        status: 'ONGOING',
        description: 'Polls are ongoing for afternoon market trip vs beach relaxation.',
        cost: '300.00',
        currency: '₹',
        type: 'Shopping & Market',
        duration: '120m',
        creatorRole: 'owner',
      },
      {
        itmId: 'itm_09',
        time: '19:30',
        endTime: '21:30',
        title: 'Farewell Dinner at Thalassa Waterfront',
        status: 'PROPOSED',
        description: 'Cliffside Greek dinner proposal pending group review.',
        cost: '1500.00',
        currency: '₹',
        type: 'Dining',
        duration: '120m',
        creatorRole: 'member',
      },
    ],
  })

  // Trip Code & Copy State
  const [copiedTripCode, setCopiedTripCode] = useState(false)
  const tripCode = trpId

  // Lookup trip information (Dynamic member count based on joined travelers)
  const [tripInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('wm_joined_trips')
      if (saved) {
        const list = JSON.parse(saved)
        const found = list.find((t: any) => t.trpId === trpId)
        if (found) {
          return {
            title: found.title,
            dates: found.startDate ? `${found.startDate} to ${found.endDate || found.startDate}` : 'June 12–15',
            membersCount: found.members?.length || 1,
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
    return {
      title: trpId === 'trp_goa_2026' ? 'Goa Getaway' : trpId.replace(/^trp_/, '').replace(/[_-]/g, ' '),
      dates: 'June 12–15',
      membersCount: 6,
    }
  })

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
      addToast(`Team access code "${tripCode}" copied to clipboard!`, 'success')
      setTimeout(() => setCopiedTripCode(false), 2000)
    } catch (err) {
      console.error('Failed to copy trip code', err)
      addToast('Failed to copy team access code', 'conflict')
    }
  }

  // Create Activity Modal Form State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newActivityName, setNewActivityName] = useState('')
  const [newActivityDay, setNewActivityDay] = useState<number>(1)
  const [newActivityTime, setNewActivityTime] = useState('11:00')
  const [newActivityEndTime, setNewActivityEndTime] = useState('12:00')
  const [newActivityDescription, setNewActivityDescription] = useState('')
  const [newActivityBudget, setNewActivityBudget] = useState('500.00')

  // Conflict Proposal Modal Card State
  const [conflictModalData, setConflictModalData] = useState<{
    isOpen: boolean
    newItem: TimelineSlotItem
    conflictWith: TimelineSlotItem
    dayNum: number
  } | null>(null)

  // Current items for active day
  const currentItems = dayItemsMap[activeDay] || []

  // Add a dynamic new day
  const handleAddDay = () => {
    const nextDay = daysList.length + 1
    const newDayObj: DayInfo = { dayNum: nextDay, label: `Day ${nextDay}` }
    setDaysList((prev) => [...prev, newDayObj])
    setDayItemsMap((prev) => ({ ...prev, [nextDay]: [] }))
    setActiveDay(nextDay)
    addToast(`Day ${nextDay} added to your itinerary!`, 'success')
  }

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

  // Handle Create Activity with Smart Conflict Detection
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newActivityName.trim()) {
      addToast('Please enter an activity name', 'conflict')
      return
    }

    const startTime = newActivityTime.trim() || '11:00'
    const endTime = newActivityEndTime.trim() || calculateEndTime(startTime, '60m')

    const newItem: TimelineSlotItem = {
      itmId: `itm_${Date.now()}`,
      time: startTime,
      endTime: endTime,
      title: newActivityName.trim(),
      status: 'CONFIRMED',
      description: newActivityDescription.trim() || 'Custom activity scheduled for trip.',
      cost: newActivityBudget.trim() || '0.00',
      currency: '₹',
      type: 'Activity',
      duration: `${Math.max(15, parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime))}m`,
      creatorRole: userRole === 'Owner (Admin)' ? 'owner' : 'member',
    }

    // Inspect if this new activity conflicts with any existing slot on the chosen day
    const dayItems = dayItemsMap[newActivityDay] || []
    const conflictItem = dayItems.find((existing) => {
      const existingEnd = existing.endTime || calculateEndTime(existing.time, existing.duration)
      return isTimeOverlapping(startTime, endTime, existing.time, existingEnd)
    })

    if (conflictItem) {
      // SCENARIO 1: Same person / editor making a scheduling mistake in their draft session
      // Give side pop-up toast notification of the conflict (no proposal prompt needed).
      if (!isItinerarySaved || (userRole === 'Owner (Admin)' && governanceMode === 'Mode A' && !conflictItem.isLocked)) {
        addToast(
          `⚠️ Time Conflict: "${newItem.title}" (${startTime} – ${endTime}) overlaps with "${conflictItem.title}" (${conflictItem.time} – ${conflictItem.endTime}). Please choose a different time slot.`,
          'conflict'
        )
        return
      }

      // SCENARIO 2: Itinerary is already SAVED, or another member creates a conflicting activity
      // Display dedicated center card modal asking: "Do you want to create a proposal for that particular time?"
      setIsCreateModalOpen(false)
      setConflictModalData({
        isOpen: true,
        newItem: { ...newItem, status: 'PROPOSED' },
        conflictWith: conflictItem,
        dayNum: newActivityDay,
      })
      return
    }

    // No conflict detected -> save slot directly
    setDayItemsMap((prev) => ({
      ...prev,
      [newActivityDay]: [...(prev[newActivityDay] || []), newItem].sort((a, b) =>
        a.time.localeCompare(b.time)
      ),
    }))

    setActiveDay(newActivityDay)
    setIsItinerarySaved(false)
    addToast(`Activity "${newItem.title}" added to Day ${newActivityDay}!`, 'success')

    // Reset Form & Close Modal
    setNewActivityName('')
    setNewActivityDescription('')
    setNewActivityBudget('500.00')
    setNewActivityTime('11:00')
    setNewActivityEndTime('12:00')
    setIsCreateModalOpen(false)
  }

  // Handle Confirm Add Proposal from the Conflict Card Modal
  const handleConfirmAddProposal = () => {
    if (!conflictModalData) return
    const { newItem, dayNum, conflictWith } = conflictModalData

    const proposedItem: TimelineSlotItem = {
      ...newItem,
      status: 'PROPOSED',
      note: `Proposed alternative against confirmed "${conflictWith.title}" (${conflictWith.time} – ${conflictWith.endTime}). Member debate is open.`,
    }

    setDayItemsMap((prev) => ({
      ...prev,
      [dayNum]: [...(prev[dayNum] || []), proposedItem].sort((a, b) =>
        a.time.localeCompare(b.time)
      ),
    }))

    setActiveDay(dayNum)
    setConflictModalData(null)
    addToast(
      `Proposal created for "${proposedItem.title}"! Group debate and voting is now live.`,
      'success'
    )
  }

  return (
    <PageWrapper trpId={trpId} tripTitle={tripInfo.title}>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
        {/* 1. Governance & Role Sub-Banner with Team Access Code Bar (Matching Image) */}
        <div className="bg-card border border-slate-light rounded-xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-xs">
          {/* Top Row: Governance Mode & Role Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate font-medium">Governance Mode:</span>
              <button
                type="button"
                onClick={() => {
                  const nextMode = governanceMode === 'Mode A' ? 'Mode NA' : 'Mode A'
                  setGovernanceMode(nextMode)
                  addToast(
                    `Switched to ${nextMode} (${
                      nextMode === 'Mode A' ? 'Admin-Led: Owner Decides' : 'Democratic: All Decide'
                    })`,
                    'info'
                  )
                }}
                className="bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 px-3 py-0.5 rounded-full text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Click to toggle Governance Mode"
              >
                {governanceMode === 'Mode A'
                  ? 'Mode A (Admin-Led: Owner Decides)'
                  : 'Mode NA (Democratic: All Decide)'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate font-medium">Role:</span>
              <button
                type="button"
                onClick={() => {
                  const nextRole = userRole === 'Owner (Admin)' ? 'Member' : 'Owner (Admin)'
                  setUserRole(nextRole)
                  addToast(`Switched active role to ${nextRole}`, 'info')
                }}
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                  userRole === 'Owner (Admin)'
                    ? 'bg-route/15 text-route border-route/30'
                    : 'bg-paper text-slate border-slate-light'
                }`}
                title="Click to toggle between Owner (Admin) and Member"
              >
                {userRole}
              </button>
            </div>
          </div>

          {/* Inner Full-Width Bar: Team Access Code Bar */}
          <div className="bg-paper border border-slate-light rounded-[10px] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="font-sans text-xs sm:text-sm font-medium text-slate">
                Team Access Code:
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-ink tracking-wide">
                {trpId}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyTripCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-slate-light bg-card hover:bg-paper text-slate hover:text-ink font-mono text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              {copiedTripCode ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate hover:text-route transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Trip Title & Dates Header (Centered with Edit Icon) */}
        <div className="flex flex-col items-center justify-center text-center gap-1 pt-2">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              {tripInfo.title}
            </h1>
            <button
              type="button"
              className="text-slate hover:text-ink transition-colors cursor-pointer"
              title="Edit Trip Title"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          <p className="font-mono text-xs text-slate">
            {tripInfo.dates} · {tripInfo.membersCount} members
          </p>

          {/* 3. Day Selector Pills (Dynamic Days with "+ Add Day" button) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mt-4">
            {daysList.map((d) => (
              <button
                key={d.dayNum}
                type="button"
                onClick={() => setActiveDay(d.dayNum)}
                className={`text-xs sm:text-sm px-4 py-1.5 rounded-[6px] font-sans transition-all cursor-pointer ${
                  activeDay === d.dayNum
                    ? 'bg-route text-card font-semibold shadow-xs'
                    : 'text-slate hover:text-ink font-medium hover:bg-paper'
                }`}
              >
                {d.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleAddDay}
              className="text-xs px-3 py-1.5 rounded-[6px] font-sans font-semibold text-route border border-dashed border-route/40 hover:border-route hover:bg-route/5 transition-all cursor-pointer flex items-center gap-1"
              title="Add another day to trip itinerary"
            >
              <span>+ Add Day</span>
            </button>
          </div>
        </div>

        {/* Top-Right Header Bar Above Activities: Day Title, Save/Draft Status, Create Activity */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-2 border-b border-slate-light/60">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg font-bold text-ink">
              Day {activeDay} Itinerary
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                isItinerarySaved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {isItinerarySaved ? '● Saved' : '○ Draft Changes'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Save Itinerary Button */}
            <button
              type="button"
              onClick={() => {
                if (governanceMode === 'Mode A' && userRole !== 'Owner (Admin)') {
                  addToast(
                    'In Mode A (Admin-Led), only the Trip Owner can save confirmed changes. Members can submit proposals.',
                    'conflict'
                  )
                  return
                }
                setIsItinerarySaved(true)
                addToast('Itinerary saved successfully! Changes are confirmed for all members.', 'success')
              }}
              className="text-xs font-sans font-semibold px-3 py-1.5 rounded-[8px] border border-slate-light bg-card hover:bg-paper text-slate hover:text-ink transition-all cursor-pointer shadow-2xs"
            >
              💾 Save Itinerary
            </button>

            {/* Create Activity Button */}
            <button
              type="button"
              onClick={() => {
                setNewActivityDay(activeDay)
                setNewActivityName('')
                setNewActivityTime('11:00')
                setNewActivityEndTime('12:00')
                setNewActivityDescription('')
                setNewActivityBudget('500.00')
                setIsCreateModalOpen(true)
              }}
              className="bg-route text-card font-sans font-semibold text-xs px-4 py-2 rounded-[8px] hover:opacity-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Create Activity</span>
            </button>
          </div>
        </div>

        {/* 4. Timeline View Container */}
        <div className="flex flex-col mt-2">
          {currentItems.length === 0 ? (
            <div className="bg-card border border-slate-light/60 rounded-[12px] p-8 text-center my-4">
              <p className="font-sans text-sm text-slate">No activities scheduled for Day {activeDay}.</p>
              <button
                type="button"
                onClick={() => {
                  setNewActivityDay(activeDay)
                  setNewActivityTime('11:00')
                  setNewActivityEndTime('12:00')
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
              const endTimeDisplay = slot.endTime || calculateEndTime(slot.time, slot.duration)

              return (
                <div key={slot.itmId} className="flex items-stretch gap-3 sm:gap-4 relative group">
                  {/* Time Label (Left Column: Start Time AND End Time) */}
                  <div className="w-20 sm:w-24 text-right shrink-0 pt-6 flex flex-col items-end">
                    <span className="font-mono text-xs font-bold text-ink">
                      {slot.time}
                    </span>
                    <span className="font-mono text-[10px] text-slate font-medium">
                      – {endTimeDisplay}
                    </span>
                  </div>

                  {/* Timeline Axis & Dot */}
                  <div className="relative flex flex-col items-center shrink-0 w-4">
                    {/* Timeline Dot */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full border-2 border-paper z-10 mt-[26px] shadow-2xs group-hover:scale-125 transition-transform ${
                        slot.status === 'PROPOSED'
                          ? 'bg-purple-600'
                          : slot.status === 'ONGOING'
                          ? 'bg-emerald-600'
                          : 'bg-[#1b4332]'
                      }`}
                    />
                    {/* Vertical Line */}
                    {!isLast && <div className="w-[1.5px] bg-slate-light/90 flex-1 my-1" />}
                  </div>

                  {/* Timeline Card */}
                  <div
                    className={`bg-card border rounded-[12px] p-5 sm:p-6 shadow-xs flex-1 flex flex-col justify-between gap-3 mb-5 transition-all ${
                      slot.status === 'PROPOSED'
                        ? 'border-purple-300 bg-purple-50/20 hover:border-purple-400'
                        : 'border-slate-light hover:border-route/60'
                    }`}
                  >
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
                          Type: {slot.type}{' '}
                          {slot.duration ? `· Duration: ${slot.duration}` : ''}
                        </p>
                      )}

                      {slot.note && (
                        <p className="font-sans text-xs text-purple-900 bg-purple-50 p-2 rounded border border-purple-200 italic">
                          ℹ️ {slot.note}
                        </p>
                      )}
                    </div>

                    {/* Card Actions (View Debate option for all activities listed) */}
                    <div className="flex items-center justify-between w-full pt-1 border-t border-slate-light/50">
                      <span className="font-mono text-[11px] text-slate">
                        Slot: {slot.time} – {endTimeDisplay}
                      </span>
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

        {/* Modal 1: Create New Activity (Start & End Time, Day, 1-line description, budget) */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-slate-light rounded-[16px] max-w-lg w-full p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-slate-light pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-ink">
                    Create New Activity
                  </h3>
                  <p className="font-sans text-xs text-slate mt-0.5">
                    Schedule an activity with start &amp; end timings.
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
                    placeholder="e.g. Scuba Diving at Grand Island"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-route"
                  />
                </div>

                {/* Day, Start Time, End Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-slate font-medium">Trip Day</label>
                    <select
                      value={newActivityDay}
                      onChange={(e) => setNewActivityDay(Number(e.target.value))}
                      className="bg-paper border border-slate-light rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-route"
                    >
                      {daysList.map((d) => (
                        <option key={d.dayNum} value={d.dayNum}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-slate font-medium">Start Time</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 11:00"
                      value={newActivityTime}
                      onChange={(e) => {
                        const val = e.target.value
                        setNewActivityTime(val)
                        if (val && val.length >= 4 && !newActivityEndTime) {
                          setNewActivityEndTime(calculateEndTime(val, '60m'))
                        }
                      }}
                      className="bg-paper border border-slate-light rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-route"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-slate font-medium">End Time</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12:30"
                      value={newActivityEndTime}
                      onChange={(e) => setNewActivityEndTime(e.target.value)}
                      className="bg-paper border border-slate-light rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-route"
                    />
                  </div>
                </div>

                {/* 1-Line Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate font-medium">1-Line Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Explore exotic coral reefs with certified dive instructors."
                    value={newActivityDescription}
                    onChange={(e) => setNewActivityDescription(e.target.value)}
                    className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-route"
                  />
                </div>

                {/* Budget */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate font-medium">Budget / Estimated Cost (INR ₹)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500.00"
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

        {/* Modal 2: Central Schedule Conflict Proposal Card (Card in center of screen) */}
        {conflictModalData?.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border-2 border-amber-300 rounded-[16px] max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center gap-2.5 text-amber-800 pb-2 border-b border-slate-light/80">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    Schedule Conflict Detected
                  </h3>
                  <span className="font-mono text-[11px] text-amber-700 font-semibold uppercase">
                    Competing Time Slot
                  </span>
                </div>
              </div>

              {/* Conflict Context */}
              <div className="flex flex-col gap-3 text-xs font-sans text-slate">
                <p className="leading-relaxed">
                  The activity you chose, <strong className="text-ink font-semibold">"{conflictModalData.newItem.title}"</strong> ({conflictModalData.newItem.time} – {conflictModalData.newItem.endTime}), conflicts with an already confirmed itinerary plan on Day {conflictModalData.dayNum}:
                </p>

                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-[10px] flex flex-col gap-1 text-ink shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-ink">
                      {conflictModalData.conflictWith.title}
                    </span>
                    <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                      CONFIRMED
                    </span>
                  </div>
                  <span className="font-mono text-xs text-amber-950 font-medium mt-0.5">
                    🕒 Confirmed Slot: {conflictModalData.conflictWith.time} – {conflictModalData.conflictWith.endTime || calculateEndTime(conflictModalData.conflictWith.time, conflictModalData.conflictWith.duration)}
                  </span>
                </div>

                <p className="text-ink font-medium leading-relaxed">
                  Do you want to add this as a proposal for this time slot so all group members can debate and vote on it?
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-light">
                <button
                  type="button"
                  onClick={() => setConflictModalData(null)}
                  className="px-4 py-2 text-xs font-sans font-medium text-slate hover:text-ink border border-slate-light rounded-[8px] hover:bg-paper transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddProposal}
                  className="px-4 py-2 text-xs font-sans font-bold bg-route hover:opacity-90 text-card rounded-[8px] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+ Add Proposal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
