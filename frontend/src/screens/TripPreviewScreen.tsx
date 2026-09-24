import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useTripContext } from '../context/TripContext'
import { useAuthContext } from '../context/AuthContext'
import { getTrip, postJoinRequest, getMyJoinStatus } from '../lib/api'
import { CheckCircle2, Clock, MapPin, Calendar, Users, ArrowRight, Shield } from 'lucide-react'

export const TripPreviewScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const navigate = useNavigate()
  const { addToast } = useTripContext()
  const { getToken } = useAuthContext()

  const [trip, setTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joinStatus, setJoinStatus] = useState<'member' | 'pending' | 'rejected' | 'none'>('none')
  const [submitting, setSubmitting] = useState(false)

  // Load trip info & current user's join status
  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        const t = await getTrip(trpId, getToken).catch(() => null)
        if (isMounted && t) setTrip(t)

        const st = await getMyJoinStatus(trpId, getToken).catch(() => ({ status: 'none' as const }))
        if (isMounted) setJoinStatus(st.status as any)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [trpId, getToken])

  // Polling for Mode A join approval (every 10 seconds if pending)
  useEffect(() => {
    if (joinStatus !== 'pending') return

    const interval = setInterval(async () => {
      try {
        const res = await getMyJoinStatus(trpId, getToken)
        if (res.status === 'member') {
          setJoinStatus('member')
          addToast("You've been approved!", 'success')
          navigate(`/trips/${trpId}`)
        } else if (res.status === 'rejected') {
          setJoinStatus('rejected')
          addToast('Your join request was declined.', 'error')
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [joinStatus, trpId, getToken, addToast, navigate])

  const handleJoinClick = async () => {
    setSubmitting(true)
    try {
      const mode = trip?.mode || 'Mode A'
      const res = await postJoinRequest(trpId, 'I would love to join this trip!', getToken)
      if (mode === 'Mode NA' || res.status === 'approved') {
        setJoinStatus('member')
        addToast("You've joined!", 'success')
        navigate(`/trips/${trpId}`)
      } else {
        setJoinStatus('pending')
        addToast('Request sent — waiting for admin approval', 'info')
      }
    } catch (e: any) {
      addToast(e.message || 'Failed to submit join request', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const mode = trip?.mode || 'Mode A'

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col items-center gap-6">
        {/* Status Header */}
        {joinStatus === 'member' ? (
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="font-mono text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
              JOIN REQUEST ACCEPTED
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
              Welcome aboard.
            </h1>
          </div>
        ) : joinStatus === 'pending' ? (
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <span className="font-mono text-[11px] text-amber-800 font-bold uppercase tracking-wider">
              REQUEST PENDING APPROVAL
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
              Request sent — waiting for admin approval
            </h1>
            <p className="font-sans text-xs text-slate max-w-md">
              The trip owner will review your join request. We are polling automatically for updates...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-300 text-blue-800 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-mono text-[11px] text-slate font-bold uppercase tracking-wider">
              TRIP PREVIEW ({mode})
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
              {trip?.title || 'Goa Sunsets & Beach Getaway'}
            </h1>
          </div>
        )}

        {/* Hero Card Banner */}
        <div className="w-full bg-card border border-slate-light rounded-[16px] overflow-hidden shadow-sm flex flex-col gap-6">
          <div className="relative aspect-[16/8] bg-paper overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80"
              alt="Goa Getaway"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent flex items-end p-6">
              <div className="flex items-center justify-between w-full text-card">
                <div>
                  <h2 className="font-serif text-2xl font-bold">
                    {trip?.title || 'Goa Sunsets & Beach Getaway'}
                  </h2>
                  <div className="flex items-center gap-3 font-mono text-xs text-card/90 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {trip?.destinationCity || 'Goa, India'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {trip?.startDate ? `${trip.startDate} - ${trip.endDate}` : 'OCT 12 – OCT 18, 2026'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-ink/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-card/20">
                  <Users className="w-4 h-4" />
                  <span className="font-mono text-xs font-bold">
                    {trip?.members?.length || 4} / {trip?.partySize || 6}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itinerary Preview Section */}
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate uppercase tracking-wider">
                ITINERARY PREVIEW
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-light/40 text-slate">
                {mode === 'Mode A' ? 'Admin Approval Required' : 'Instant Auto-Join'}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-4 bg-paper border border-slate-light rounded-[10px] flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-sm font-bold text-ink">
                    Baga Beach Water Sports &amp; Arrival
                  </h4>
                  <span className="font-mono text-xs text-slate">
                    Calangute • 14:00
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Confirmed
                </span>
              </div>

              <div className="p-4 bg-paper border border-slate-light rounded-[10px] flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-sm font-bold text-ink">
                    Dudhsagar Jeep Safari &amp; Trek
                  </h4>
                  <span className="font-mono text-xs text-slate">
                    Mollem • 09:00 - 16:00
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Needs Vote
                </span>
              </div>

              <div className="p-4 bg-paper border border-slate-light rounded-[10px] flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-sm font-bold text-ink">
                    Anjuna Beach Shack Sunset Dinner
                  </h4>
                  <span className="font-mono text-xs text-slate">
                    Anjuna • 19:30
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Confirmed
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => navigate('/solo-matches')}
                className="flex-1 py-2.5"
              >
                Back to Discover
              </Button>

              {joinStatus === 'member' ? (
                <Button
                  onClick={() => navigate(`/trips/${trpId}`)}
                  className="flex-1 py-2.5"
                >
                  Enter Trip Workspace <ArrowRight className="w-4 h-4 ml-1 inline" />
                </Button>
              ) : joinStatus === 'pending' ? (
                <Button disabled className="flex-1 py-2.5 bg-amber-500 text-white cursor-not-allowed">
                  Waiting for Admin Approval...
                </Button>
              ) : (
                <Button
                  onClick={handleJoinClick}
                  disabled={submitting || loading}
                  className="flex-1 py-2.5"
                >
                  {submitting
                    ? 'Processing...'
                    : mode === 'Mode NA'
                    ? 'Join Trip'
                    : 'Request to Join'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
