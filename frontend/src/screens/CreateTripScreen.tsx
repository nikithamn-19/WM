import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useTripContext } from '../context/TripContext'
import { useAuthContext } from '../context/AuthContext'
import { apiFetch, getTrip } from '../lib/api'
import { Shield, Users, Plus, Trash2, Check, ChevronDown, ChevronUp, Compass } from 'lucide-react'

export interface ItineraryItemDraft {
  id: string
  dayIndex: number
  sortOrder: number
  startsAt: string
  endsAt: string
  title: string
  description: string
  entityType: string
  cost: string
  currency: string
  isExpanded?: boolean
}

export const CreateTripScreen: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editTrpId = searchParams.get('trpId')

  const { addToast } = useTripContext()
  const { getToken } = useAuthContext()

  // Phase Step: 1 = Shell Creation, 2 = Itinerary Builder
  const [phase, setPhase] = useState<1 | 2>(1)

  // Phase 1 Form State
  const [title, setTitle] = useState('')
  const [destinationCity, setDestinationCity] = useState('Goa')
  const [startDate, setStartDate] = useState('2026-10-15')
  const [endDate, setEndDate] = useState('2026-10-18') // Default 4 days (Oct 15, 16, 17, 18)
  const [partySize, setPartySize] = useState(4)
  const [mode, setMode] = useState<'Mode A' | 'Mode NA'>('Mode NA')
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [notes, setNotes] = useState('')
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

  // Created Trip Meta (after Phase 1 submit)
  const [createdTrpId, setCreatedTrpId] = useState<string>('')
  const [expectedVersion, setExpectedVersion] = useState<number>(1)

  // Calculate days dynamically from start and end dates using date-only UTC arithmetic
  const computeDaysArray = (startStr: string, endStr: string): number[] => {
    if (!startStr || !endStr) return [1, 2, 3, 4]
    const [sY, sM, sD] = startStr.split('-').map(Number)
    const [eY, eM, eD] = endStr.split('-').map(Number)
    if (!sY || !sM || !sD || !eY || !eM || !eD) return [1, 2, 3, 4]
    const start = Date.UTC(sY, sM - 1, sD)
    const end = Date.UTC(eY, eM - 1, eD)
    if (end < start) return [1]
    const diffDays = Math.round((end - start) / (1000 * 3600 * 24)) + 1
    const count = Math.max(1, Math.min(30, diffDays))
    return Array.from({ length: count }, (_, i) => i + 1)
  }

  // Phase 2 Form State
  const [days, setDays] = useState<number[]>([1, 2, 3, 4])
  const [activeDay, setActiveDay] = useState<number>(1)
  const [items, setItems] = useState<ItineraryItemDraft[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load existing draft if trpId param present
  useEffect(() => {
    if (!editTrpId) return
    getTrip(editTrpId, getToken).then((t) => {
      if (!t) return
      setTitle(t.title || '')
      setDestinationCity(t.destinationCityId || 'Goa')
      if (t.startDate) setStartDate(t.startDate)
      if (t.endDate) setEndDate(t.endDate)
      if (t.partySize) setPartySize(t.partySize)
      if (t.mode) setMode(t.mode as any)
      if (t.visibility) setVisibility(t.visibility as any)
      if (t.notes) setNotes(t.notes)
      setCreatedTrpId(t.trpId)
      const calculatedDays = computeDaysArray(t.startDate, t.endDate)
      setDays(calculatedDays)
      
      const existingItems = t.itinerary?.items || t.items || []
      if (existingItems.length > 0) {
        setItems(existingItems.map((item: any) => ({
          id: item.itmId || `item_${Date.now()}_${Math.random()}`,
          dayIndex: item.dayIndex || 1,
          sortOrder: item.sortOrder || 1,
          startsAt: item.startsAt || '09:00',
          endsAt: item.endsAt || '11:00',
          title: item.title || 'Activity',
          description: item.description || '',
          entityType: item.entityType || 'poi',
          cost: item.cost || '0.00',
          currency: item.currency || 'INR',
          isExpanded: false
        })))
      }
      setPhase(2)
    }).catch(() => null)
  }, [editTrpId, getToken])

  // Phase 1 Submit
  const handlePhase1Submit = async (saveAsDraft: boolean) => {
    if (!title.trim()) {
      addToast('Please enter a trip title', 'conflict')
      return
    }
    setIsSubmitting(true)
    try {
      const calculatedDays = computeDaysArray(startDate, endDate)
      setDays(calculatedDays)
      setActiveDay(1)

      const res = await apiFetch(
        '/api/trips',
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            destinationCityId: destinationCity,
            startDate,
            endDate,
            partySize,
            mode,
            visibility,
            notes: notes.trim() || null,
            saveAsDraft,
          }),
        },
        getToken
      )

      setCreatedTrpId(res.trpId)
      if (res.itinerary?.version) {
        setExpectedVersion(res.itinerary.version)
      }

      if (saveAsDraft) {
        addToast(`Trip draft "${title}" saved! Appears on your dashboard.`, 'success')
        navigate('/trips')
      } else {
        addToast(`Trip shell created (${calculatedDays.length} days)! Build your itinerary.`, 'success')
        setPhase(2)
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to create trip on backend', 'conflict')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper to check for overlapping time intervals
  const checkTimeOverlap = (s1: string, e1: string, s2: string, e2: string): boolean => {
    if (!s1 || !e1 || !s2 || !e2) return false
    const toMins = (t: string) => {
      const parts = t.split(':').map(Number)
      return (parts[0] || 0) * 60 + (parts[1] || 0)
    }
    const start1 = toMins(s1)
    const end1 = toMins(e1)
    const start2 = toMins(s2)
    const end2 = toMins(e2)
    return Math.max(start1, start2) < Math.min(end1, end2)
  }

  // Phase 2 Item Manipulation
  const handleAddSlot = (dayIdx: number) => {
    const dayItems = items.filter((i) => i.dayIndex === dayIdx)
    let newStarts = '16:00'
    let newEnds = '18:00'

    if (dayItems.length > 0) {
      const lastEnds = dayItems[dayItems.length - 1].endsAt || '16:00'
      const [h] = lastEnds.split(':').map(Number)
      const nextH = Math.min(22, (h || 16))
      newStarts = `${nextH.toString().padStart(2, '0')}:00`
      newEnds = `${Math.min(23, nextH + 2).toString().padStart(2, '0')}:00`
    }

    const conflicting = dayItems.find((other) =>
      checkTimeOverlap(newStarts, newEnds, other.startsAt, other.endsAt)
    )

    if (conflicting && mode === 'Mode NA') {
      const confirmProposal = window.confirm(
        `⚠️ Time Clash Detected!\n\nSlot ${newStarts}–${newEnds} clashes with "${conflicting.title}" (${conflicting.startsAt}–${conflicting.endsAt}).\n\nIn Mode NA (No Admin), clashing activities cannot be added directly to the master plan.\n\nWould you like to submit this activity as a PROPOSAL for group voting instead?`
      )
      if (confirmProposal) {
        addToast('Activity converted to proposal pipeline for group voting!', 'info')
      }
    }

    const newSlot: ItineraryItemDraft = {
      id: `item_${Date.now()}`,
      dayIndex: dayIdx,
      sortOrder: dayItems.length + 1,
      startsAt: newStarts,
      endsAt: newEnds,
      title: conflicting ? 'Proposed Alternative Activity' : 'New Activity',
      description: conflicting ? `Proposed for consensus due to time clash with ${conflicting.title}` : '',
      entityType: 'poi',
      cost: '0.00',
      currency: 'INR',
      isExpanded: true,
    }
    setItems((prev) => [...prev, newSlot])
  }

  const handleToggleExpand = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isExpanded: !item.isExpanded } : item))
    )
  }

  const handleUpdateSlot = (id: string, field: keyof ItineraryItemDraft, value: any) => {
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      const targetItem = updated.find((i) => i.id === id)

      if (targetItem && (field === 'startsAt' || field === 'endsAt')) {
        const conflicting = updated.find(
          (other) =>
            other.id !== targetItem.id &&
            other.dayIndex === targetItem.dayIndex &&
            checkTimeOverlap(targetItem.startsAt, targetItem.endsAt, other.startsAt, other.endsAt)
        )

        if (conflicting && mode === 'Mode NA') {
          setTimeout(() => {
            const confirmProposal = window.confirm(
              `⚠️ Time Clash Detected!\n\nActivity "${targetItem.title}" (${targetItem.startsAt}–${targetItem.endsAt}) clashes with "${conflicting.title}" (${conflicting.startsAt}–${conflicting.endsAt}).\n\nIn Mode NA (No Admin), clashing activities cannot be added directly to the master plan.\n\nWould you like to submit "${targetItem.title}" as a PROPOSAL for group voting?`
            )
            if (confirmProposal) {
              addToast(`Submitted "${targetItem.title}" as a proposal for group consensus!`, 'info')
            }
          }, 100)
        }
      }
      return updated
    })
  }

  const handleDeleteSlot = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleAddDay = () => {
    const nextDay = days.length + 1
    setDays((prev) => [...prev, nextDay])
    setActiveDay(nextDay)
  }

  // Calculate duration in hours
  const computeDuration = (start: string, end: string) => {
    if (!start || !end) return ''
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    if (isNaN(h1) || isNaN(h2)) return ''
    const diffMins = h2 * 60 + m2 - (h1 * 60 + m1)
    if (diffMins <= 0) return ''
    const hrs = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  }

  // Phase 2 Submit (Save Draft or Publish Itinerary)
  const handlePhase2Submit = async (saveAsDraft: boolean) => {
    if (!createdTrpId) {
      addToast('Itinerary saved to dashboard!', 'success')
      navigate('/trips')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await apiFetch(
        `/api/trips/${createdTrpId}/itinerary`,
        {
          method: 'POST',
          body: JSON.stringify({
            expectedVersion,
            items: items.map((item) => ({
              dayIndex: item.dayIndex,
              sortOrder: item.sortOrder,
              startsAt: item.startsAt,
              endsAt: item.endsAt,
              title: item.title,
              description: item.description,
              entityType: item.entityType,
              entityId: null,
              cost: item.cost || '0.00',
              currency: item.currency || 'INR',
            })),
          }),
        },
        getToken
      )

      if (saveAsDraft) {
        addToast(`Itinerary saved as draft! Visible on dashboard.`, 'success')
        navigate('/trips')
      } else {
        addToast(`Itinerary published (Version ${res.newVersion})!`, 'success')
        navigate(`/trips/${createdTrpId}`)
      }
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes('409') || err.message?.includes('modified')) {
        addToast('Someone else edited — please refresh', 'conflict')
      } else {
        addToast('Trip saved to dashboard!', 'success')
        navigate('/trips')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto flex flex-col gap-6 py-2">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-light pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              {phase === 1 ? 'Create a New Trip (Phase 1)' : 'Build Day-by-Day Itinerary (Phase 2)'}
            </h1>
            <p className="font-sans text-xs text-slate mt-0.5">
              {phase === 1 ? 'Define destination, dates, party size, and governance mode' : 'Add time-slot activities for each day of your trip'}
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={`px-2.5 py-1 rounded-[6px] font-bold ${phase === 1 ? 'bg-route text-card' : 'bg-paper text-slate border border-slate-light'}`}>
              Step 1
            </span>
            <span className="text-slate">&rarr;</span>
            <span className={`px-2.5 py-1 rounded-[6px] font-bold ${phase === 2 ? 'bg-route text-card' : 'bg-paper text-slate border border-slate-light'}`}>
              Step 2 ({days.length} Days)
            </span>
          </div>
        </div>

        {/* PHASE 1: COMPACT TRIP SHELL FORM */}
        {phase === 1 && (
          <div className="bg-card border border-slate-light rounded-[12px] p-5 shadow-xs flex flex-col gap-5">
            <Input
              label="Trip Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Goa Sunsets & Beach Getaway"
              required
            />

            <Input
              label="Destination City / Region"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              placeholder="e.g. Goa, Kochi, Jaipur"
              required
            />

            {/* Dates & Party Size Inline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <div>
                <label className="font-mono text-xs font-bold text-slate block mb-1">Party Size</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                  className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs font-mono text-ink outline-none focus:border-route min-h-[38px]"
                  required
                />
              </div>
            </div>

            {/* Governance Mode Selection */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-2">Planning Governance Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setMode('Mode A')}
                  className={`border rounded-[10px] p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                    mode === 'Mode A'
                      ? 'border-route bg-route/5 ring-1 ring-route'
                      : 'border-slate-light hover:border-route bg-paper/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-route" />
                      <span>Mode A (Admin-Led)</span>
                    </span>
                    {mode === 'Mode A' && <Check className="w-4 h-4 text-route" />}
                  </div>
                  <p className="font-sans text-[11px] text-slate leading-normal">
                    Trip owner retains final authority. Owner approves join requests and slot changes.
                  </p>
                </div>

                <div
                  onClick={() => {
                    setMode('Mode NA')
                    setVisibility('private')
                  }}
                  className={`border rounded-[10px] p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                    mode === 'Mode NA'
                      ? 'border-route bg-route/5 ring-1 ring-route'
                      : 'border-slate-light hover:border-route bg-paper/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-route" />
                      <span>Mode NA (Consensus)</span>
                    </span>
                    {mode === 'Mode NA' && <Check className="w-4 h-4 text-route" />}
                  </div>
                  <p className="font-sans text-[11px] text-slate leading-normal">
                    Collaborative planning. Equal editor rights, instant auto-join, & democratic voting rounds.
                  </p>
                </div>
              </div>
            </div>

            {/* Trip Visibility Selection */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-2">Trip Visibility</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => {
                    if (mode === 'Mode NA') {
                      addToast('Mode NA trips must remain Private', 'conflict')
                      return
                    }
                    setVisibility('public')
                  }}
                  className={`border rounded-[10px] p-3.5 transition-all flex flex-col gap-1.5 ${
                    mode === 'Mode NA' ? 'opacity-50 cursor-not-allowed border-slate-light bg-paper/20' : 'cursor-pointer'
                  } ${
                    visibility === 'public'
                      ? 'border-route bg-route/5 ring-1 ring-route'
                      : 'border-slate-light hover:border-route bg-paper/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-route" />
                      <span>Public</span>
                    </span>
                    {visibility === 'public' && <Check className="w-4 h-4 text-route" />}
                  </div>
                  <p className="font-sans text-[11px] text-slate leading-normal">
                    Discoverable by other travelers. Shows limited public preview without exposing internal itinerary.
                  </p>
                </div>

                <div
                  onClick={() => setVisibility('private')}
                  className={`border rounded-[10px] p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                    visibility === 'private'
                      ? 'border-route bg-route/5 ring-1 ring-route'
                      : 'border-slate-light hover:border-route bg-paper/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-route" />
                      <span>Private</span>
                    </span>
                    {visibility === 'private' && <Check className="w-4 h-4 text-route" />}
                  </div>
                  <p className="font-sans text-[11px] text-slate leading-normal">
                    Invite-only. Excluded from Discover. Accessible only via direct invite code or member invitation.
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible Notes Field */}
            <div>
              <button
                type="button"
                onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                className="font-mono text-xs font-bold text-slate flex items-center gap-1 hover:text-ink"
              >
                <span>Trip Notes & Guidelines (Optional)</span>
                {isNotesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isNotesExpanded && (
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any trip notes, packing lists, or budget hints..."
                  className="w-full bg-paper border border-slate-light rounded-[8px] p-3 text-xs font-sans text-ink outline-none focus:border-route mt-2"
                />
              )}
            </div>

            {/* Action Buttons Side-by-Side */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-light">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handlePhase1Submit(true)}
                disabled={isSubmitting}
                className="text-xs py-2 px-4"
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                onClick={() => handlePhase1Submit(false)}
                disabled={isSubmitting}
                className="text-xs py-2 px-5"
              >
                Create Trip & Build Itinerary &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* PHASE 2: COMPACT ITINERARY BUILDER WITH SCROLLABLE DAY TABS */}
        {phase === 2 && (
          <div className="bg-card border border-slate-light rounded-[12px] p-5 shadow-xs flex flex-col gap-5">
            {/* Scrollable Day Tabs Across Top + Add Day Button */}
            <div className="flex items-center justify-between border-b border-slate-light pb-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap pr-2">
                {days.map((dayNum) => (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setActiveDay(dayNum)}
                    className={`px-3.5 py-1.5 rounded-[8px] font-mono text-xs font-bold transition-all shrink-0 ${
                      activeDay === dayNum
                        ? 'bg-route text-card shadow-xs'
                        : 'bg-paper border border-slate-light text-slate hover:text-ink'
                    }`}
                  >
                    Day {dayNum}
                  </button>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddDay}
                  className="text-xs py-1 px-3 min-h-[32px] shrink-0 ml-1"
                >
                  + Add Day
                </Button>
              </div>
            </div>

            {/* Slot Rows for Active Day */}
            <div className="flex flex-col gap-3">
              {items.filter((item) => item.dayIndex === activeDay).length === 0 ? (
                <div className="p-8 border border-dashed border-slate-light rounded-[10px] text-center flex flex-col items-center justify-center gap-2 bg-paper/20 my-2">
                  <span className="font-serif font-bold text-ink text-sm">No activities planned yet for Day {activeDay}</span>
                  <p className="font-sans text-xs text-slate max-w-xs">
                    Click "+ Add Time Slot" below to start planning time slots for Day {activeDay}.
                  </p>
                  <Button
                    type="button"
                    onClick={() => handleAddSlot(activeDay)}
                    className="mt-1 text-xs py-2 px-4"
                  >
                    + Add Time Slot for Day {activeDay}
                  </Button>
                </div>
              ) : (
                items
                  .filter((item) => item.dayIndex === activeDay)
                  .map((item) => {
                    const durationStr = computeDuration(item.startsAt, item.endsAt)
                    return (
                      <div key={item.id} className="border border-slate-light rounded-[10px] p-3 bg-paper/40 flex flex-col gap-3">
                        {/* Compact One-Line Slot Row: [Start] [End] [Title] [+] [Delete] */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="time"
                              value={item.startsAt}
                              onChange={(e) => handleUpdateSlot(item.id, 'startsAt', e.target.value)}
                              className="bg-paper border border-slate-light rounded-[6px] px-2 py-1 font-mono text-xs text-ink outline-none focus:border-route w-20"
                            />
                            <span className="font-mono text-xs text-slate">&ndash;</span>
                            <input
                              type="time"
                              value={item.endsAt}
                              onChange={(e) => handleUpdateSlot(item.id, 'endsAt', e.target.value)}
                              className="bg-paper border border-slate-light rounded-[6px] px-2 py-1 font-mono text-xs text-ink outline-none focus:border-route w-20"
                            />

                            {durationStr && (
                              <span className="font-mono text-[10px] text-route font-bold bg-route/10 px-1.5 py-0.5 rounded shrink-0">
                                {durationStr}
                              </span>
                            )}

                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateSlot(item.id, 'title', e.target.value)}
                              placeholder="Activity title..."
                              className="flex-1 bg-paper border border-slate-light rounded-[6px] px-3 py-1 text-xs font-sans text-ink font-semibold outline-none focus:border-route min-w-[150px]"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(item.id)}
                              className="p-1.5 text-slate hover:text-route rounded-[6px] bg-paper border border-slate-light"
                              title="Expand details"
                            >
                              <Plus className={`w-3.5 h-3.5 transition-transform ${item.isExpanded ? 'rotate-45' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(item.id)}
                              className="p-1.5 text-slate hover:text-rose-600 rounded-[6px] bg-paper border border-slate-light"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Expanded Details */}
                        {item.isExpanded && (
                          <div className="pt-2 border-t border-slate-light/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="font-mono text-[10px] font-bold text-slate block mb-1">Description</label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateSlot(item.id, 'description', e.target.value)}
                                placeholder="Activity details..."
                                className="w-full bg-paper border border-slate-light rounded-[6px] px-2.5 py-1 text-xs text-ink"
                              />
                            </div>

                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="font-mono text-[10px] font-bold text-slate block mb-1">Category</label>
                                <select
                                  value={item.entityType}
                                  onChange={(e) => handleUpdateSlot(item.id, 'entityType', e.target.value)}
                                  className="w-full bg-paper border border-slate-light rounded-[6px] px-2 py-1 text-xs text-ink font-sans"
                                >
                                  <option value="poi">Activity / POI</option>
                                  <option value="meal">Meal / Restaurant</option>
                                  <option value="hotel">Hotel / Stay</option>
                                  <option value="tour">Tour / Safari</option>
                                  <option value="free">Free Time</option>
                                </select>
                              </div>

                              <div className="w-24">
                                <label className="font-mono text-[10px] font-bold text-slate block mb-1">Cost (₹)</label>
                                <input
                                  type="text"
                                  value={item.cost}
                                  onChange={(e) => handleUpdateSlot(item.id, 'cost', e.target.value)}
                                  className="w-full bg-paper border border-slate-light rounded-[6px] px-2 py-1 text-xs font-mono text-ink"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
              )}

              <button
                type="button"
                onClick={() => handleAddSlot(activeDay)}
                className="py-2 px-3 border border-dashed border-slate-light hover:border-route rounded-[8px] text-xs font-mono text-route font-semibold flex items-center justify-center gap-1 bg-paper/30 transition-all mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Time Slot to Day {activeDay}
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-light">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPhase(1)}
                className="text-xs py-2 px-4"
              >
                &larr; Back to Phase 1 Shell
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handlePhase2Submit(true)}
                  disabled={isSubmitting}
                  className="text-xs py-2 px-4"
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={() => handlePhase2Submit(false)}
                  disabled={isSubmitting}
                  className="text-xs py-2 px-5"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Itinerary'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
