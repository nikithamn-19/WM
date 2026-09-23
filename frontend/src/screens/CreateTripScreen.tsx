import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useTripContext } from '../context/TripContext'

export const CreateTripScreen: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useTripContext()

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [partySize, setPartySize] = useState('4')
  const [mode, setMode] = useState<'Mode A' | 'Mode NA'>('Mode NA')
  const [notes, setNotes] = useState('')
  const [dateError, setDateError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setDateError('End date must be strictly after start date')
      return
    }
    setDateError('')

    addToast('Trip created successfully!', 'success')
    navigate('/trips/trp_bali_2026')
  }

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto p-6 flex flex-col justify-center">
        <form onSubmit={handleSubmit} className="bg-card border border-slate-light rounded-[10px] p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">Create a Group Trip</h2>
            <p className="text-xs font-mono text-slate mt-1">Setup trip itinerary parameters &amp; governance mode</p>
          </div>

          <Input
            label="Trip Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Bali Tropical Escape"
          />

          <Input
            label="Destination City"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            placeholder="e.g. Bali"
          />

          <div className="grid grid-cols-2 gap-3">
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
              error={dateError}
            />
          </div>

          <Input
            label="Party Size"
            type="number"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            required
            min="1"
          />

          {/* Mode Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate font-sans">Trip Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('Mode A')}
                className={`p-3 rounded-[8px] border text-left flex flex-col gap-1 transition-colors ${
                  mode === 'Mode A'
                    ? 'border-route bg-route/10 text-route font-semibold'
                    : 'border-slate-light bg-paper text-ink'
                }`}
              >
                <div className="font-sans font-semibold text-sm">Mode A (Admin-Led)</div>
                <div className="text-[11px] font-sans font-normal opacity-90">
                  One person (you) has final authority. AI recommends, you decide.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('Mode NA')}
                className={`p-3 rounded-[8px] border text-left flex flex-col gap-1 transition-colors ${
                  mode === 'Mode NA'
                    ? 'border-route bg-route/10 text-route font-semibold'
                    : 'border-slate-light bg-paper text-ink'
                }`}
              >
                <div className="font-sans font-semibold text-sm">Mode NA (Collaborative)</div>
                <div className="text-[11px] font-sans font-normal opacity-90">
                  Fully democratic. The group votes and AI helps find consensus automatically.
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate font-sans">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for trip members..."
              className="w-full bg-paper border border-slate-light rounded-[8px] p-3 text-sm text-ink font-sans focus:border-route focus:outline-none min-h-[80px]"
            />
          </div>

          <Button type="submit" className="mt-2">
            Create Trip
          </Button>
        </form>
      </div>
    </PageWrapper>
  )
}
