import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { getTrips, joinByCode } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'
import type { Trip } from '../types/trip'
import { Copy, Plus, Compass, KeyRound, Check } from 'lucide-react'

export const MyTripsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { getToken } = useAuthContext()
  const { addToast } = useTripContext()

  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Join Modal State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchUserTrips = () => {
    setIsLoading(true)
    getTrips(getToken)
      .then((data) => {
        setTrips(data || [])
      })
      .catch(() => {
        setTrips([])
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchUserTrips()
  }, [getToken])

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedId(code)
    addToast(`Trip join code "${code}" copied to clipboard!`, 'info')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = joinCode.trim()
    if (!cleanCode) {
      addToast('Please enter a trip join code', 'conflict')
      return
    }

    setIsSubmittingJoin(true)
    try {
      const res = await joinByCode(cleanCode, 'Joining via trip code', getToken)
      if (res.status === 'already_member') {
        addToast('You are already a member of this trip!', 'info')
        setIsJoinModalOpen(false)
        navigate(`/trips/${res.tripId}`)
      } else if (res.autoApproved || res.status === 'joined' || res.status === 'approved') {
        addToast('Trip joined successfully!', 'success')
        setIsJoinModalOpen(false)
        fetchUserTrips()
        navigate(`/trips/${res.tripId}`)
      } else {
        addToast('Join request sent to trip admin — waiting for approval', 'info')
        setIsJoinModalOpen(false)
        navigate(`/trips/${res.tripId}/preview`)
      }
    } catch (err: any) {
      addToast(err.message || 'Invalid or expired join code', 'error')
    } finally {
      setIsSubmittingJoin(false)
    }
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-light">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">My Trips Dashboard</h1>
            <p className="font-sans text-xs text-slate mt-0.5">Manage your group getaways, draft itineraries, and team access codes</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => setIsJoinModalOpen(true)}
              className="text-xs px-3.5 py-1.5 min-h-[36px] flex items-center gap-1.5 border-route/30 text-route hover:bg-route/10"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Join Trip</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/solo-or-group')}
              className="text-xs px-3.5 py-1.5 min-h-[36px] flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Discover Trips</span>
            </Button>
            <Button
              onClick={() => navigate('/trips/new')}
              className="text-xs px-3.5 py-1.5 min-h-[36px] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create a Trip</span>
            </Button>
          </div>
        </div>

        {/* Trips Grid Layout */}
        {isLoading ? (
          <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
            Loading your trip dashboard...
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="No trips found"
            message="Start planning your getaway or join an existing trip with a code!"
            actionLabel="+ Create First Trip"
            onAction={() => navigate('/trips/new')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip: any) => (
              <Link
                key={trip.trpId}
                to={`/trips/${trip.trpId}`}
                className="bg-card border border-slate-light rounded-[12px] overflow-hidden shadow-xs hover:border-route transition-all flex flex-col justify-between group"
              >
                {/* Cover Image + Status & Mode Pills */}
                <div className="relative aspect-[16/10] bg-paper overflow-hidden">
                  <img
                    src={
                      trip.coverImage ||
                      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={trip.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        trip.status === 'Draft' || trip.status === 'draft'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {trip.status || 'Planning'}
                    </span>
                  </div>

                  {/* Trip Code Pill Badge Overlay */}
                  <div className="absolute bottom-3 left-3 bg-ink/80 text-card text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 border border-card/20 backdrop-blur-xs">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>CODE: {trip.trpId}</span>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg font-bold text-ink leading-snug">
                      {trip.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between font-mono text-xs text-slate">
                    <span>{trip.startDate}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(e, trip.trpId)}
                      className="text-[10px] text-route font-bold hover:underline flex items-center gap-1 bg-route/10 px-2 py-0.5 rounded"
                      title="Copy trip join code to share with team"
                    >
                      {copiedId === trip.trpId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === trip.trpId ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-light/60 pt-3 text-xs font-sans text-slate">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-route text-card font-mono text-[9px] font-bold flex items-center justify-center border border-card">
                          AC
                        </div>
                        <div className="w-5 h-5 rounded-full bg-slate text-card font-mono text-[9px] font-bold flex items-center justify-center border border-card">
                          PS
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate">{trip.partySize || 4} members</span>
                    </div>

                    <span className="text-route font-bold group-hover:translate-x-0.5 transition-transform">
                      Workspace &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* JOIN TRIP MODAL */}
        <Modal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          title="Join a Trip with Code"
        >
          <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
            <p className="font-sans text-xs text-slate">
              Enter the Trip Code provided by the trip owner or admin to access the workspace.
            </p>
            <Input
              label="Trip Code / ID"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. trp_goa_2026"
              required
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsJoinModalOpen(false)}
                className="py-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingJoin}
                className="py-2 text-xs font-semibold"
              >
                {isSubmittingJoin ? 'Joining...' : 'Join Trip Workspace →'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageWrapper>
  )
}
