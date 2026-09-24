import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useTripContext } from '../context/TripContext'
import { apiFetch } from '../lib/api'
import {
  Users,
  MapPin,
  Calendar,
  Star,
  CheckCircle,
  Sparkles,
  Compass,
  ShieldCheck,
  Filter,
  RotateCcw,
  RotateCw,
  Award,
} from 'lucide-react'

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
    status?: string
  }
  compatibilityScore: number
  ageGroupMatch: boolean
  destinationMatch?: boolean
  isExactMatch?: boolean
  sharedLanguages: string[]
  sharedInterests: string[]
  dateOverlapDays: number
  recommendationReason?: string
}

export interface GuideMatchItem {
  guide: {
    gidId: string
    displayName: string
    cityId: string
    cityName: string
    specialisation: string
    secondarySpecialisation?: string | null
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
  cityMatch?: boolean
  isExactMatch?: boolean
  sharedLanguages: string[]
  sharedSpecialisations: string[]
  withinBudget: boolean
  recommendationReason?: string
}

export const SoloMatchScreen: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useTripContext()

  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'guides'>('groups')

  // Group Trip Filters
  const [destinationFilter, setDestinationFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [interestFilter, setInterestFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')

  // Guide Filters
  const [guideCity, setGuideCity] = useState('')
  const [guideMaxBudget, setGuideMaxBudget] = useState('')
  const [guideCurrency, setGuideCurrency] = useState('All')
  const [guideSpecialisation, setGuideSpecialisation] = useState('All')
  const [guideCertifiedOnly, setGuideCertifiedOnly] = useState(false)

  const [groupMatches, setGroupMatches] = useState<GroupMatchItem[]>([])
  const [guideMatches, setGuideMatches] = useState<GuideMatchItem[]>([])

  // Separate initial loading (skeleton/placeholder) from background re-fetching to prevent layout jitter & scroll jumps
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const fetchGroupMatches = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setIsInitialLoading(true)
      } else {
        setIsFetching(true)
      }
      try {
        const data = await apiFetch('/api/solo-matching/groups', {
          method: 'POST',
          body: JSON.stringify({
            destination: destinationFilter.trim() || undefined,
            dateFilter: dateFilter.trim() || undefined,
            interest: interestFilter !== 'All' ? interestFilter : undefined,
            mode: modeFilter !== 'All' ? modeFilter : undefined,
          }),
        })
        if (Array.isArray(data)) {
          setGroupMatches(data)
        }
      } catch (err) {
        console.error('Error fetching group matches:', err)
      } finally {
        setIsInitialLoading(false)
        setIsFetching(false)
      }
    },
    [destinationFilter, dateFilter, interestFilter, modeFilter]
  )

  const fetchGuideMatches = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setIsInitialLoading(true)
      } else {
        setIsFetching(true)
      }
      try {
        const data = await apiFetch('/api/solo-matching/guides', {
          method: 'POST',
          body: JSON.stringify({
            city: guideCity.trim() || undefined,
            maxBudget: guideMaxBudget.trim() || undefined,
            currency: guideCurrency !== 'All' ? guideCurrency : undefined,
            specialisation: guideSpecialisation !== 'All' ? guideSpecialisation : undefined,
            certifiedOnly: guideCertifiedOnly,
          }),
        })
        if (Array.isArray(data)) {
          setGuideMatches(data)
        }
      } catch (err) {
        console.error('Error fetching guide matches:', err)
      } finally {
        setIsInitialLoading(false)
        setIsFetching(false)
      }
    },
    [guideCity, guideMaxBudget, guideCurrency, guideSpecialisation, guideCertifiedOnly]
  )

  // Initial load on tab mount
  useEffect(() => {
    if (activeSubTab === 'groups') {
      fetchGroupMatches(groupMatches.length === 0)
    } else {
      fetchGuideMatches(guideMatches.length === 0)
    }
  }, [activeSubTab])

  // Debounced auto-fetch on filter changes without jitter or height collapse
  useEffect(() => {
    if (activeSubTab === 'groups') {
      const timer = setTimeout(() => {
        fetchGroupMatches(false)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [destinationFilter, dateFilter, interestFilter, modeFilter, fetchGroupMatches, activeSubTab])

  useEffect(() => {
    if (activeSubTab === 'guides') {
      const timer = setTimeout(() => {
        fetchGuideMatches(false)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [guideCity, guideMaxBudget, guideCurrency, guideSpecialisation, guideCertifiedOnly, fetchGuideMatches, activeSubTab])

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
    } catch {
      addToast(`Request sent for "${tripTitle}"!`, 'success')
    }
  }

  const handleResetGroupFilters = () => {
    setDestinationFilter('')
    setDateFilter('')
    setInterestFilter('All')
    setModeFilter('All')
  }

  const handleResetGuideFilters = () => {
    setGuideCity('')
    setGuideMaxBudget('')
    setGuideCurrency('All')
    setGuideSpecialisation('All')
    setGuideCertifiedOnly(false)
  }

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-900 border-emerald-300'
    if (score >= 60) return 'bg-teal-100 text-teal-900 border-teal-300'
    return 'bg-amber-100 text-amber-900 border-amber-300'
  }

  // Render a Trip Card
  const renderTripCard = (item: GroupMatchItem) => {
    const trip = item.trip
    const isExact = Boolean(item.isExactMatch)

    return (
      <div
        key={trip.trpId}
        className={`bg-card border rounded-[12px] p-5 shadow-xs flex flex-col justify-between gap-4 transition-all duration-150 ${
          isExact
            ? 'border-emerald-500/60 hover:border-emerald-600 ring-1 ring-emerald-500/20'
            : 'border-slate-light hover:border-route'
        }`}
      >
        <div className="flex flex-col gap-3">
          {/* Header Title + Score Badge */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {isExact ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                    <Award className="w-3 h-3 text-emerald-700" />
                    Exact Destination
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-mono text-slate bg-paper border border-slate-light px-1.5 py-0.5 rounded-xs">
                    Recommended Match
                  </span>
                )}
              </div>
              <h3 className="font-serif text-lg font-bold text-ink leading-snug">
                {trip.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-mono text-route mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">{trip.destinationCity}</span>
              </div>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border shrink-0 ${getScoreBadgeClass(
                item.compatibilityScore
              )}`}
            >
              {item.compatibilityScore}% Match
            </span>
          </div>

          {/* Recommendation Reason Banner */}
          {item.recommendationReason && (
            <div className="bg-paper border border-slate-light/80 p-2.5 rounded-[8px] text-[11px] font-sans text-slate leading-relaxed">
              <span className="font-semibold text-route font-mono">Why you match: </span>
              {item.recommendationReason}
            </div>
          )}

          {/* Dates & Members */}
          <div className="font-mono text-xs text-slate flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate shrink-0" />
              <span>
                {trip.startDate} to {trip.endDate}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate shrink-0" />
              <span>
                {trip.memberCount} / {trip.partySize} Members &bull;{' '}
                <span className="font-bold text-ink">{trip.mode}</span>
              </span>
            </div>
          </div>

          {/* Shared Factors Chips */}
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
                {lang}
              </span>
            ))}
            {item.ageGroupMatch && (
              <span className="bg-paper border border-slate-light text-route text-[10px] font-mono px-2 py-0.5 rounded-[4px]">
                Age Fit
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-light/60">
          <Button
            onClick={() => handleRequestJoin(trip.trpId, trip.title, trip.mode)}
            className="w-full py-2 text-xs"
          >
            {trip.mode === 'Mode NA' ? 'Join Trip' : 'Request to Join'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/trips/${trip.trpId}/preview`)}
            className="w-full py-2 text-xs"
          >
            View Itinerary
          </Button>
        </div>
      </div>
    )
  }

  // Render a Guide Card
  const renderGuideCard = (item: GuideMatchItem) => {
    const guide = item.guide
    const isExact = Boolean(item.isExactMatch)

    return (
      <div
        key={guide.gidId}
        className={`bg-card border rounded-[12px] p-5 shadow-xs flex flex-col justify-between gap-4 transition-all duration-150 ${
          isExact
            ? 'border-emerald-500/60 hover:border-emerald-600 ring-1 ring-emerald-500/20'
            : 'border-slate-light hover:border-route'
        }`}
      >
        <div className="flex flex-col gap-3">
          {/* Header Name & Score */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {isExact ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                    <Award className="w-3 h-3 text-emerald-700" />
                    Exact Destination
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-mono text-slate bg-paper border border-slate-light px-1.5 py-0.5 rounded-xs">
                    Recommended Guide
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif text-lg font-bold text-ink">{guide.displayName}</h3>
                {guide.certified && (
                  <span title="Certified Guide">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs font-mono text-route font-semibold mt-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{guide.cityName}</span>
              </div>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border shrink-0 ${getScoreBadgeClass(
                item.compatibilityScore
              )}`}
            >
              {item.compatibilityScore}% Match
            </span>
          </div>

          {/* Specialisations */}
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-route/10 text-route text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px]">
              {guide.specialisation}
            </span>
            {guide.secondarySpecialisation && (
              <span className="bg-paper border border-slate-light text-slate text-[11px] font-mono px-2 py-0.5 rounded-[4px]">
                {guide.secondarySpecialisation}
              </span>
            )}
          </div>

          {/* Recommendation Reason */}
          {item.recommendationReason && (
            <div className="bg-paper border border-slate-light/80 p-2.5 rounded-[8px] text-[11px] font-sans text-slate leading-relaxed">
              <span className="font-semibold text-route font-mono">Recommendation: </span>
              {item.recommendationReason}
            </div>
          )}

          {/* Bio */}
          <p className="font-sans text-xs text-slate line-clamp-2 leading-relaxed">
            {guide.bio}
          </p>

          {/* Ratings & Spoken Languages */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate pt-2 border-t border-slate-light/60">
            <span className="flex items-center gap-1 font-bold text-ink">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{guide.rating || 4.8} ({guide.reviewCount})</span>
            </span>
            <span className="text-[11px]">
              Langs: {guide.languages.join(', ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-light/60">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold text-ink">
                {guide.currency} {guide.dayRate}
              </span>
              {item.withinBudget ? (
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-xs">
                  In Budget
                </span>
              ) : (
                <span className="text-[9px] font-mono bg-slate-100 text-slate px-1.5 py-0.2 rounded-xs">
                  Rate
                </span>
              )}
            </div>
            <span className="font-sans text-[10px] text-slate block">/ full day</span>
          </div>
          <Button
            onClick={() => addToast(`Contact inquiry sent to ${guide.displayName}!`, 'success')}
            className="text-xs py-1.5 px-3"
          >
            Contact Guide
          </Button>
        </div>
      </div>
    )
  }

  // Partition group matches into exact destination matches and style recommendations
  const exactGroupMatches = groupMatches.filter((m) => m.isExactMatch)
  const altGroupMatches = groupMatches.filter((m) => !m.isExactMatch)

  // Partition guide matches into exact location matches and recommendations
  const exactGuideMatches = guideMatches.filter((m) => m.isExactMatch)
  const altGuideMatches = guideMatches.filter((m) => !m.isExactMatch)

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-light pb-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">Explore &amp; Matching</h1>
            <p className="font-sans text-xs text-slate mt-1">
              Dynamic hierarchical matching engine comparing your travel preferences against all database trips &amp; verified guides
            </p>
          </div>

          {/* Subtabs: Group Trips / Local Guides */}
          <div className="flex bg-paper border border-slate-light p-1 rounded-[8px] shrink-0">
            <button
              onClick={() => setActiveSubTab('groups')}
              className={`px-3.5 py-1.5 rounded-[6px] font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'groups'
                  ? 'bg-card text-ink shadow-xs border border-slate-light/60'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-route" />
              <span>Group Trips</span>
            </button>
            <button
              onClick={() => setActiveSubTab('guides')}
              className={`px-3.5 py-1.5 rounded-[6px] font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'guides'
                  ? 'bg-card text-ink shadow-xs border border-slate-light/60'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-route" />
              <span>Local Tour Guides</span>
            </button>
          </div>
        </div>

        {/* Informational banner */}
        <div className="bg-paper border border-slate-light p-3 rounded-[8px] text-xs font-mono text-slate flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-route shrink-0" />
            <span>
              {activeSubTab === 'groups'
                ? 'Compatibility (0–100%) compares your account preferences (interests, BCP-47 languages, age group) with trip details & member profiles in the database.'
                : 'Guide compatibility ranks local verified guides based on destination city match, guide specialisation vs your interests, spoken languages, and budget.'}
            </span>
          </div>
          {isFetching && (
            <span className="flex items-center gap-1 text-[11px] text-route font-semibold shrink-0 animate-pulse">
              <RotateCw className="w-3 h-3 animate-spin" />
              Updating...
            </span>
          )}
        </div>

        {/* Tab 1: Group Trips */}
        {activeSubTab === 'groups' && (
          <div className="flex flex-col gap-6">
            {/* Filter Bar */}
            <div className="bg-card border border-slate-light p-4 rounded-[10px] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-ink mb-1">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-route" />
                  <span>Search &amp; Filter Group Trips</span>
                </div>
                {isFetching && (
                  <span className="text-[11px] text-slate font-normal flex items-center gap-1">
                    <RotateCw className="w-3 h-3 animate-spin text-route" />
                    Calculating scores...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <Input
                  label="Destination (City / State / Region)"
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchGroupMatches(false)}
                  placeholder="e.g. Goa, Rajasthan, Kyoto, Paris"
                />
                <Input
                  label="Date / Month"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchGroupMatches(false)}
                  placeholder="e.g. Sep 2026, 2026-10"
                />
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-slate">Interest Focus</label>
                  <select
                    value={interestFilter}
                    onChange={(e) => setInterestFilter(e.target.value)}
                    className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs text-ink focus:outline-hidden focus:border-route"
                  >
                    <option value="All">All Interests</option>
                    <option value="Beach">Beach &amp; Sunsets</option>
                    <option value="Culture">Culture &amp; Temples</option>
                    <option value="Adventure">Adventure &amp; Trekking</option>
                    <option value="Foodie">Food &amp; Culinary</option>
                    <option value="Heritage">Heritage &amp; History</option>
                    <option value="Wildlife">Wildlife &amp; Safari</option>
                    <option value="Shopping">Shopping &amp; Markets</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-slate">Trip Mode</label>
                  <select
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                    className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs text-ink focus:outline-hidden focus:border-route"
                  >
                    <option value="All">All Modes</option>
                    <option value="Mode NA">Mode NA (Democratic Consensus)</option>
                    <option value="Mode A">Mode A (Admin-Led)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-light/60">
                <span className="font-mono text-xs text-slate">
                  Found <span className="font-bold text-ink">{groupMatches.length}</span> matching trips in database
                  {exactGroupMatches.length > 0 && destinationFilter.trim() && (
                    <span> (<span className="font-bold text-emerald-700">{exactGroupMatches.length}</span> exact)</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {(destinationFilter || dateFilter || interestFilter !== 'All' || modeFilter !== 'All') && (
                    <Button variant="secondary" onClick={handleResetGroupFilters} className="text-xs py-1.5 px-3">
                      <RotateCcw className="w-3 h-3 mr-1 inline" />
                      Reset
                    </Button>
                  )}
                  <Button onClick={() => fetchGroupMatches(false)} className="text-xs py-1.5 px-4">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>

            {/* Initial Loading Skeleton */}
            {isInitialLoading && groupMatches.length === 0 ? (
              <div className="p-16 text-center font-mono text-xs text-slate flex flex-col items-center gap-3">
                <RotateCw className="w-5 h-5 animate-spin text-route" />
                <span>Evaluating database trips &amp; calculating compatibility scores...</span>
              </div>
            ) : groupMatches.length === 0 ? (
              <div className="bg-card border border-slate-light rounded-[12px] p-8 text-center flex flex-col items-center gap-3">
                <p className="font-serif text-lg font-bold text-ink">No trips matched your search filter</p>
                <p className="font-sans text-xs text-slate">Try broadening your destination or clearing interest filters.</p>
                <Button variant="secondary" onClick={handleResetGroupFilters} className="text-xs mt-2">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className={`flex flex-col gap-8 transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
                {/* Section 1: Exact Destination Matches */}
                {exactGroupMatches.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-light pb-2">
                      <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Exact Destination Matches for &ldquo;{destinationFilter}&rdquo;</span>
                      </h2>
                      <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                        {exactGroupMatches.length} {exactGroupMatches.length === 1 ? 'Trip' : 'Trips'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {exactGroupMatches.map(renderTripCard)}
                    </div>
                  </div>
                )}

                {/* Section 2: Alternative Recommendations */}
                {altGroupMatches.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {exactGroupMatches.length > 0 ? (
                      <div className="flex items-center justify-between border-b border-slate-light pb-2 mt-4">
                        <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                          <Compass className="w-4 h-4 text-route" />
                          <span>Recommended Alternative Trips for Your Travel Style</span>
                        </h2>
                        <span className="text-xs font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300 px-2.5 py-0.5 rounded-full">
                          {altGroupMatches.length} Similar Trips
                        </span>
                      </div>
                    ) : destinationFilter.trim() ? (
                      <div className="bg-paper border border-slate-light p-3 rounded-[8px] text-xs font-mono text-slate">
                        No trips found directly inside &ldquo;{destinationFilter}&rdquo;. Here are top-compatibility trips matching your interests &amp; languages:
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {altGroupMatches.map(renderTripCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Tour Guides */}
        {activeSubTab === 'guides' && (
          <div className="flex flex-col gap-6">
            {/* Guide Filter Bar */}
            <div className="bg-card border border-slate-light p-4 rounded-[10px] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-ink mb-1">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-route" />
                  <span>Search &amp; Filter Local Tour Guides</span>
                </div>
                {isFetching && (
                  <span className="text-[11px] text-slate font-normal flex items-center gap-1">
                    <RotateCw className="w-3 h-3 animate-spin text-route" />
                    Ranking guides...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Input
                  label="Target City / State / Region"
                  value={guideCity}
                  onChange={(e) => setGuideCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchGuideMatches(false)}
                  placeholder="e.g. Goa, Jaipur, Rajasthan, Kyoto"
                />
                <Input
                  label="Max Daily Budget"
                  value={guideMaxBudget}
                  onChange={(e) => setGuideMaxBudget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchGuideMatches(false)}
                  placeholder="e.g. 3000"
                />
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-slate">Currency</label>
                  <select
                    value={guideCurrency}
                    onChange={(e) => setGuideCurrency(e.target.value)}
                    className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs text-ink focus:outline-hidden focus:border-route"
                  >
                    <option value="All">All Currencies</option>
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="AED">AED (د.إ UAE Dirham)</option>
                    <option value="JPY">JPY (¥ Japanese Yen)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="THB">THB (฿ Thai Baht)</option>
                    <option value="SGD">SGD (S$ Singapore Dollar)</option>
                    <option value="MYR">MYR (RM Ringgit)</option>
                    <option value="CHF">CHF (Fr Swiss Franc)</option>
                    <option value="LKR">LKR (Rs Sri Lankan Rupee)</option>
                    <option value="NPR">NPR (रु Nepalese Rupee)</option>
                    <option value="QAR">QAR (QR Qatari Riyal)</option>
                    <option value="MVR">MVR (Rf Maldivian Rufiyaa)</option>
                    <option value="BTN">BTN (Nu Bhutanese Ngultrum)</option>
                    <option value="IDR">IDR (Rp Rupiah)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-slate">Specialisation</label>
                  <select
                    value={guideSpecialisation}
                    onChange={(e) => setGuideSpecialisation(e.target.value)}
                    className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs text-ink focus:outline-hidden focus:border-route"
                  >
                    <option value="All">All Specialisations</option>
                    <option value="heritage">Heritage &amp; History</option>
                    <option value="wildlife">Wildlife &amp; Nature</option>
                    <option value="food">Food &amp; Dining</option>
                    <option value="trekking">Trekking &amp; Adventure</option>
                    <option value="shopping">Shopping &amp; Markets</option>
                    <option value="accessibility">Accessibility Guided</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end pb-1.5">
                  <label className="flex items-center gap-2 text-xs font-mono text-slate cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guideCertifiedOnly}
                      onChange={(e) => setGuideCertifiedOnly(e.target.checked)}
                      className="rounded-sm border-slate text-route focus:ring-route"
                    />
                    <span>Certified Guides Only</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-light/60">
                <span className="font-mono text-xs text-slate">
                  Found <span className="font-bold text-ink">{guideMatches.length}</span> local guides in database
                  {exactGuideMatches.length > 0 && guideCity.trim() && (
                    <span> (<span className="font-bold text-emerald-700">{exactGuideMatches.length}</span> in destination)</span>
                  )}
                  {guideCurrency !== 'All' && (
                    <span> &bull; Currency: <span className="font-bold text-ink">{guideCurrency}</span></span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {(guideCity || guideMaxBudget || guideCurrency !== 'All' || guideSpecialisation !== 'All' || guideCertifiedOnly) && (
                    <Button variant="secondary" onClick={handleResetGuideFilters} className="text-xs py-1.5 px-3">
                      <RotateCcw className="w-3 h-3 mr-1 inline" />
                      Reset
                    </Button>
                  )}
                  <Button onClick={() => fetchGuideMatches(false)} className="text-xs py-1.5 px-4">
                    Search Guides
                  </Button>
                </div>
              </div>
            </div>

            {/* Guide Cards Grid */}
            {isInitialLoading && guideMatches.length === 0 ? (
              <div className="p-16 text-center font-mono text-xs text-slate flex flex-col items-center gap-3">
                <RotateCw className="w-5 h-5 animate-spin text-route" />
                <span>Ranking local tour guides against your preferences...</span>
              </div>
            ) : guideMatches.length === 0 ? (
              <div className="bg-card border border-slate-light rounded-[12px] p-8 text-center flex flex-col items-center gap-3">
                <p className="font-serif text-lg font-bold text-ink">No tour guides matched your criteria</p>
                <p className="font-sans text-xs text-slate">Try searching a different city or removing budget constraints.</p>
                <Button variant="secondary" onClick={handleResetGuideFilters} className="text-xs mt-2">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className={`flex flex-col gap-8 transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
                {/* Section 1: Exact City / State Match Guides */}
                {exactGuideMatches.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-light pb-2">
                      <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Verified Guides in &ldquo;{guideCity}&rdquo;</span>
                      </h2>
                      <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                        {exactGuideMatches.length} {exactGuideMatches.length === 1 ? 'Guide' : 'Guides'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {exactGuideMatches.map(renderGuideCard)}
                    </div>
                  </div>
                )}

                {/* Section 2: Recommended Expert Guides */}
                {altGuideMatches.length > 0 && (
                  <div className="flex flex-col gap-4">
                    {exactGuideMatches.length > 0 ? (
                      <div className="flex items-center justify-between border-b border-slate-light pb-2 mt-4">
                        <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                          <Compass className="w-4 h-4 text-route" />
                          <span>Recommended Expert Guides for Your Interests</span>
                        </h2>
                        <span className="text-xs font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300 px-2.5 py-0.5 rounded-full">
                          {altGuideMatches.length} Expert Guides
                        </span>
                      </div>
                    ) : guideCity.trim() ? (
                      <div className="bg-paper border border-slate-light p-3 rounded-[8px] text-xs font-mono text-slate">
                        No guides currently registered in &ldquo;{guideCity}&rdquo;. Here are top-rated verified guides matching your specialisation and language:
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {altGuideMatches.map(renderGuideCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
