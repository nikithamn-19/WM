import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useTripContext } from '../context/TripContext'

export interface PickedTrip {
  id: string
  title: string
  matchPercentage: number
  dates: string
  location: string
  tags: string[]
  membersCount: number
}

export const SoloMatchScreen: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useTripContext()

  const [destinationFilter, setDestinationFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const pickedTrips: PickedTrip[] = [
    {
      id: 'trp_goa_2026',
      title: 'Goa Sunsets & Beach Getaway',
      matchPercentage: 94,
      dates: '14-22 OCT',
      location: 'Goa, India',
      tags: ['Shared: Beach', 'Same age group', 'Overlapping dates'],
      membersCount: 3,
    },
    {
      id: 'trp_kerala_2026',
      title: 'Kerala Backwaters & Houseboat Retreat',
      matchPercentage: 88,
      dates: '05-12 SEP',
      location: 'Kochi, Kerala',
      tags: ['Shared: Culture', 'Foodies', 'Relaxed Pace'],
      membersCount: 2,
    },
    {
      id: 'trp_jaipur_2026',
      title: 'Jaipur Heritage & Forts Trail',
      matchPercentage: 85,
      dates: '10-20 NOV',
      location: 'Jaipur, Rajasthan',
      tags: ['Photography', 'Same age group'],
      membersCount: 4,
    },
  ]

  const handleRequestJoin = (tripTitle: string) => {
    addToast(`Request to join "${tripTitle}" sent to trip owner!`, 'success')
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Page Header (PDF Page 8 Design) */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Trips picked for you</h1>
          <p className="font-sans text-xs text-slate mt-1">
            Based on your travel preferences
          </p>
        </div>

        {/* Informational banner */}
        <div className="bg-paper border border-slate-light p-3.5 rounded-[8px] text-xs font-mono text-slate">
          ⚡ These trips are ranked by how well they match your selected interests, age group, and preferred travel pace from your profile.
        </div>

        {/* Filter Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card border border-slate-light p-4 rounded-[10px] shadow-xs">
          <Input
            label="Destination"
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            placeholder="e.g. Goa, Kerala"
          />
          <Input
            label="Dates"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="e.g. Oct 2026"
          />
        </div>

        {/* Ranked Trip Cards Grid (PDF Page 8 Card Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pickedTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-card border border-slate-light rounded-[12px] p-5 shadow-xs flex flex-col justify-between gap-5 hover:border-route transition-all"
            >
              <div className="flex flex-col gap-3">
                {/* Header Title + Match Badge */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold text-ink leading-snug">
                    {trip.title}
                  </h3>
                  <span className="bg-emerald-100 text-emerald-900 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
                    {trip.matchPercentage}% Match
                  </span>
                </div>

                {/* Dates & Location */}
                <div className="font-mono text-xs text-slate flex flex-col gap-1">
                  <span>📅 {trip.dates}</span>
                  <span>📍 {trip.location}</span>
                </div>

                {/* Shared Interest Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {trip.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-paper border border-slate-light text-slate text-[10px] font-sans px-2.5 py-1 rounded-[6px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-light/60">
                <Button
                  onClick={() => handleRequestJoin(trip.title)}
                  className="w-full py-2 text-xs"
                >
                  Request to join
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/trips/${trip.id}/preview`)}
                  className="w-full py-2 text-xs"
                >
                  View Trip
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
