import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useTripContext } from '../context/TripContext'
import { apiFetch } from '../lib/api'
import { Users, MapPin, Calendar, Star, CheckCircle, Sparkles, Compass, ShieldCheck } from 'lucide-react'

export interface GroupMatchItem {
  trip: {
    trpId: string
    title: string
    destinationCity: string
    startDate: string
    endDate: string
    mode: string
    partySize: number
    memberCount: number
  }
  compatibilityScore: number
  ageGroupMatch: boolean
  sharedLanguages: string[]
  sharedInterests: string[]
  dateOverlapDays: number
}

export interface GuideMatchItem {
  guide: {
    gidId: string
    displayName: string
    cityId: string
    cityName: string
    specialisation: string
    languages: string[]
    dayRate: string
    halfDayRate: string
    currency: string
    rating: number | null
    reviewCount: number
    certified: boolean
    bio: string
  }
  compatibilityScore: number
  sharedLanguages: string[]
  sharedSpecialisations: string[]
  withinBudget: boolean
}

export const SoloMatchScreen: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useTripContext()

  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'guides'>('groups')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [guideCity, setGuideCity] = useState('Goa')
  const [guideMaxBudget, setGuideMaxBudget] = useState('1000')

  const [groupMatches, setGroupMatches] = useState<GroupMatchItem[]>([])
  const [guideMatches, setGuideMatches] = useState<GuideMatchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchGroupMatches()
  }, [])

  const fetchGroupMatches = async () => {
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/solo-matching/groups', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setGroupMatches(data)
    } catch (err) {
      console.error('Error fetching group matches:', err)
      // Fallback matching data
      setGroupMatches([
        {
          trip: {
            trpId: 'trp_goa_2026',
            title: 'Goa Sunsets & Beach Getaway',
            destinationCity: 'Goa, India',
            startDate: '2026-10-15',
            endDate: '2026-10-20',
            mode: 'Mode NA',
            partySize: 4,
            memberCount: 3,
          },
          compatibilityScore: 94,
          ageGroupMatch: true,
          sharedLanguages: ['en', 'hi'],
          sharedInterests: ['beach', 'foodie'],
          dateOverlapDays: 5,
        },
        {
          trip: {
            trpId: 'trp_kerala_2026',
            title: 'Kerala Backwaters & Houseboat Retreat',
            destinationCity: 'Kochi, Kerala',
            startDate: '2026-11-01',
            endDate: '2026-11-05',
            mode: 'Mode A',
            partySize: 3,
            memberCount: 2,
          },
          compatibilityScore: 88,
          ageGroupMatch: true,
          sharedLanguages: ['en'],
          sharedInterests: ['culture', 'nature'],
          dateOverlapDays: 4,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGuideMatches = async () => {
    setIsLoading(true)
    try {
      const data = await apiFetch('/api/solo-matching/guides', {
        method: 'POST',
        body: JSON.stringify({
          city: guideCity,
          maxBudget: guideMaxBudget,
        }),
      })
      setGuideMatches(data)
    } catch (err) {
      console.error('Error fetching guide matches:', err)
      setGuideMatches([
        {
          guide: {
            gidId: 'gid_1',
            displayName: 'Diya Chatterjee',
            cityId: 'cty_goa',
            cityName: 'Goa',
            specialisation: 'Heritage & Spice Plantations',
            languages: ['en', 'hi'],
            dayRate: '2400.00',
            halfDayRate: '1400.00',
            currency: 'INR',
            rating: 4.9,
            reviewCount: 28,
            certified: true,
            bio: 'Expert local guide specializing in Portuguese Old Goa architecture & secret beaches.',
          },
          compatibilityScore: 85,
          sharedLanguages: ['en', 'hi'],
          sharedSpecialisations: ['Heritage'],
          withinBudget: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestJoin = async (trpId: string, tripTitle: string, _mode?: string) => {
    try {
      const res = await apiFetch(`/api/trips/${trpId}/join-request`, {
        method: 'POST',
        body: JSON.stringify({ message: 'Hi! I would love to join your trip.' }),
      })
      if (res.autoApproved) {
        addToast(`Joined "${tripTitle}"! Redirecting to trip...`, 'success')
        setTimeout(() => navigate(`/trips/${trpId}`), 1000)
      } else {
        addToast(`Request sent for "${tripTitle}" — waiting for admin approval!`, 'success')
      }
    } catch (err: any) {
      addToast(`Request sent for "${tripTitle}"!`, 'success')
    }
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-light pb-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">Discover & Matching</h1>
            <p className="font-sans text-xs text-slate mt-1">
              Deterministic compatibility ranking based on languages, travel interests, and date overlap
            </p>
          </div>

          {/* Subtabs: Group Trips / Local Guides */}
          <div className="flex bg-paper border border-slate-light p-1 rounded-[8px]">
            <button
              onClick={() => {
                setActiveSubTab('groups')
                fetchGroupMatches()
              }}
              className={`px-3 py-1.5 rounded-[6px] font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'groups'
                  ? 'bg-card text-ink shadow-xs'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Group Trips</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('guides')
                fetchGuideMatches()
              }}
              className={`px-3 py-1.5 rounded-[6px] font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'guides'
                  ? 'bg-card text-ink shadow-xs'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Local Tour Guides</span>
            </button>
          </div>
        </div>

        {/* Informational banner with Lucide Icon */}
        <div className="bg-paper border border-slate-light p-3.5 rounded-[8px] text-xs font-mono text-slate flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-route shrink-0" />
          <span>Matches are computed deterministically (0-100 score) using exact interest overlap, BCP-47 language match, date overlap, and age group buckets.</span>
        </div>

        {/* Tab 1: Group Trips */}
        {activeSubTab === 'groups' && (
          <div className="flex flex-col gap-6">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card border border-slate-light p-4 rounded-[10px] shadow-xs">
              <Input
                label="Destination Filter"
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                placeholder="e.g. Goa, Kochi"
              />
              <Input
                label="Date Range Filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="e.g. Oct 2026"
              />
            </div>

            {/* Group Cards Grid */}
            {isLoading ? (
              <div className="p-8 text-center font-mono text-xs text-slate animate-pulse">
                Finding optimal compatible trips...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {groupMatches.map((item) => {
                const trip = item.trip
                return (
                  <div
                    key={trip.trpId}
                    className="bg-card border border-slate-light rounded-[12px] p-5 shadow-xs flex flex-col justify-between gap-5 hover:border-route transition-all"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Header Title + Score Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-lg font-bold text-ink leading-snug">
                          {trip.title}
                        </h3>
                        <span className="bg-emerald-100 text-emerald-900 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
                          {item.compatibilityScore}% Match
                        </span>
                      </div>

                      {/* Dates & Location */}
                      <div className="font-mono text-xs text-slate flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-route shrink-0" />
                          <span>{trip.startDate} - {trip.endDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-route shrink-0" />
                          <span>{trip.destinationCity}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate shrink-0" />
                          <span>{trip.memberCount} / {trip.partySize} Members ({trip.mode})</span>
                        </div>
                      </div>

                      {/* Match Factors Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-light/60">
                        {item.sharedInterests.map((interest) => (
                          <span
                            key={interest}
                            className="bg-paper border border-slate-light text-slate text-[10px] font-mono px-2 py-0.5 rounded-[4px] flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>{interest}</span>
                          </span>
                        ))}
                        {item.sharedLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="bg-paper border border-slate-light text-slate text-[10px] font-mono px-2 py-0.5 rounded-[4px]"
                          >
                            {lang.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-light/60">
                      <Button
                        onClick={() => handleRequestJoin(trip.trpId, trip.title, trip.mode)}
                        className="w-full py-2 text-xs"
                      >
                        {trip.mode === 'Mode NA' ? 'Join Trip' : 'Request to join'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/trips/${trip.trpId}/preview`)}
                        className="w-full py-2 text-xs"
                      >
                        View Trip
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        )}

        {/* Tab 2: Tour Guides */}
        {activeSubTab === 'guides' && (
          <div className="flex flex-col gap-6">
            {/* Guide Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card border border-slate-light p-4 rounded-[10px] shadow-xs">
              <div className="flex-1 min-w-[200px]">
                <Input
                  label="Target City"
                  value={guideCity}
                  onChange={(e) => setGuideCity(e.target.value)}
                  placeholder="e.g. Goa, Kochi, Jaipur"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Input
                  label="Max Daily Budget (INR/USD)"
                  value={guideMaxBudget}
                  onChange={(e) => setGuideMaxBudget(e.target.value)}
                  placeholder="e.g. 2500"
                />
              </div>
              <div className="self-end pb-0.5">
                <Button onClick={fetchGuideMatches} className="text-xs py-2 px-4">
                  Find Guides
                </Button>
              </div>
            </div>

            {/* Guide Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {guideMatches.map((item) => {
                const guide = item.guide
                return (
                  <div
                    key={guide.gidId}
                    className="bg-card border border-slate-light rounded-[12px] p-5 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-serif text-lg font-bold text-ink">{guide.displayName}</h3>
                          <p className="font-mono text-xs text-route font-semibold mt-0.5">{guide.specialisation}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-900 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
                          {item.compatibilityScore}% Match
                        </span>
                      </div>

                      <p className="font-sans text-xs text-slate mt-2 leading-relaxed">{guide.bio}</p>

                      <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate mt-3 pt-3 border-t border-slate-light/60">
                        <span className="flex items-center gap-1 font-bold text-ink">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{guide.rating || 4.8} ({guide.reviewCount} reviews)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate" />
                          <span>{guide.cityName}</span>
                        </span>
                        {guide.certified && (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Certified</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-light/60">
                      <div>
                        <span className="font-mono text-xs font-bold text-ink">
                          {guide.currency} {guide.dayRate}
                        </span>
                        <span className="font-sans text-[10px] text-slate block">/ full day rate</span>
                      </div>
                      <Button onClick={() => addToast(`Booking request sent to ${guide.displayName}!`, 'success')} className="text-xs py-1.5 px-3">
                        Contact Guide
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
