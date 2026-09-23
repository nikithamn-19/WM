import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { useTripContext } from '../context/TripContext'
import { ProposeActivityModal } from './ProposeActivityModal'

export interface ItineraryItemData {
  itmId: string
  dayIndex: number
  title: string
  status: 'confirmed' | 'proposed' | 'in_consensus' | 'branched'
  type: string
  cost: string
  currency: string
  duration: string
  note?: string
  isLocked?: boolean
}

export const TripHomeScreen: React.FC = () => {
  const { trpId = 'trp_b0a35602' } = useParams()
  const { addToast } = useTripContext()

  const [isProposeOpen, setIsProposeOpen] = useState(false)
  const [activeSlotName, setActiveSlotName] = useState('New Activity Slot')

  const [members] = useState([
    { id: 'usr_02b3a36d', role: 'editor' },
    { id: 'usr_33d905c7', role: 'editor' },
    { id: 'usr_8ed02105', role: 'owner' },
  ])

  const [day1Items, setDay1Items] = useState<ItineraryItemData[]>([
    {
      itmId: 'itm_b94582f9',
      dayIndex: 1,
      title: 'The Verandah Heritage',
      status: 'confirmed',
      type: 'Hotel',
      cost: '5000.00',
      currency: 'INR',
      duration: '0m',
      isLocked: false,
    },
    {
      itmId: 'itm_02',
      dayIndex: 1,
      title: 'Watchtower Terrace',
      status: 'proposed',
      type: 'Poi',
      cost: '200.00',
      currency: 'INR',
      duration: '75m',
      isLocked: false,
    },
    {
      itmId: 'itm_03',
      dayIndex: 1,
      title: 'Backwater Channel',
      status: 'proposed',
      type: 'Poi',
      cost: '50.00',
      currency: 'INR',
      duration: '180m',
      isLocked: false,
    },
  ])

  const [day2Items, setDay2Items] = useState<ItineraryItemData[]>([
    {
      itmId: 'itm_04',
      dayIndex: 2,
      title: 'Tea Estate Trail',
      status: 'confirmed',
      type: 'Poi',
      cost: '500.00',
      currency: 'INR',
      duration: '180m',
      note: 'Matches the budget style you described; slotted early to avoid crowds.',
      isLocked: true,
    },
  ])

  const handleConfirmItem = (itmId: string, day: 1 | 2) => {
    if (day === 1) {
      setDay1Items((prev) =>
        prev.map((it) => (it.itmId === itmId ? { ...it, status: 'confirmed' } : it))
      )
    } else {
      setDay2Items((prev) =>
        prev.map((it) => (it.itmId === itmId ? { ...it, status: 'confirmed' } : it))
      )
    }
    addToast('Slot confirmed and locked into itinerary!', 'success')
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Trip Workspace">
      <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-16">
        {/* Trip Members Card (Matching Photo 1) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-700">Trip Members:</span>
            {members.map((m) => (
              <span
                key={m.id}
                className={`text-xs font-mono px-2.5 py-0.5 rounded border ${
                  m.role === 'owner'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {m.id} <span className="text-[10px] text-gray-500">({m.role})</span>
              </span>
            ))}
          </div>

          <span className="text-[11px] font-sans text-gray-500">
            Share weights: 1.000 (PS-11 largest-remainder split ready)
          </span>
        </div>

        {/* 3 Stats Boxes (Matching Photo 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Estimated Total Cost */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500">Estimated Total Cost</span>
            <span className="text-2xl font-bold text-gray-900 mt-2 font-mono">
              INR 8450.00
            </span>
          </div>

          {/* Card 2: Carbon Footprint */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500">Carbon Footprint</span>
            <span className="text-2xl font-bold text-emerald-600 mt-2 font-mono flex items-baseline gap-1">
              <span>6.5</span>
              <span className="text-sm font-semibold text-emerald-700">kg CO₂</span>
            </span>
          </div>

          {/* Card 3: Itinerary Generator */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500">Itinerary Generator</span>
            <div className="flex items-center gap-1.5 text-purple-700 font-bold text-base mt-2">
              <span>🪄</span>
              <span>User</span>
            </div>
          </div>
        </div>

        {/* Section Title & Action Button (Matching Photo 1) */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Day-by-Day Shared Itinerary
          </h2>
          <button
            type="button"
            onClick={() => {
              setActiveSlotName('New Activity Slot')
              setIsProposeOpen(true)
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            <span>+</span>
            <span>Add Activity Slot</span>
          </button>
        </div>

        {/* Day 1 Section (Matching Photo 1) */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-sm text-gray-900">Day 1</h3>
            <button
              type="button"
              onClick={() => {
                setActiveSlotName('Day 1 Activity Slot')
                setIsProposeOpen(true)
              }}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>+</span>
              <span>Add to Day 1</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {day1Items.map((item) => (
              <div
                key={item.itmId}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/40 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-gray-900">{item.title}</h4>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.2 rounded-full border ${
                        item.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.isLocked && <span className="text-xs text-amber-600">🔒</span>}
                  </div>
                  <p className="text-xs text-gray-500 font-sans">
                    Type: {item.type} · Cost: {item.currency} {item.cost} · Duration: {item.duration}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'proposed' && (
                    <button
                      type="button"
                      onClick={() => handleConfirmItem(item.itmId, 1)}
                      className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1 flex items-center gap-1 transition-colors"
                    >
                      <span>✓</span>
                      <span>Confirm</span>
                    </button>
                  )}

                  {/* Click to open debate in Photo 2 */}
                  <Link
                    to={`/trips/${trpId}/slots/${item.itmId}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                  >
                    <span>View Debate</span>
                    <span>&gt;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day 2 Section (Matching Photo 1) */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-sm text-gray-900">Day 2</h3>
            <button
              type="button"
              onClick={() => {
                setActiveSlotName('Day 2 Activity Slot')
                setIsProposeOpen(true)
              }}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>+</span>
              <span>Add to Day 2</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {day2Items.map((item) => (
              <div
                key={item.itmId}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/40 transition-colors"
              >
                <div className="flex flex-col gap-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-gray-900">{item.title}</h4>
                    <span className="text-[10px] font-medium px-2 py-0.2 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                      {item.status}
                    </span>
                    {item.isLocked && <span className="text-xs text-amber-600">🔒</span>}
                  </div>
                  <p className="text-xs text-gray-500 font-sans">
                    Type: {item.type} · Cost: {item.currency} {item.cost} · Duration: {item.duration}
                  </p>
                  {item.note && (
                    <p className="text-xs text-gray-500 italic mt-0.5">
                      "{item.note}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to={`/trips/${trpId}/slots/${item.itmId}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                  >
                    <span>View Debate</span>
                    <span>&gt;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Propose Activity Modal Triggered */}
        <ProposeActivityModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          trpId={trpId}
          slotTime={activeSlotName}
          onSuccess={() => {
            addToast('New activity slot submitted!', 'success')
          }}
        />

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 mt-10 pt-4 border-t border-gray-200">
          WanderMatch · KogniVera Hackathon 2026 · PS-11 Real Architecture
        </footer>
      </div>
    </PageWrapper>
  )
}
