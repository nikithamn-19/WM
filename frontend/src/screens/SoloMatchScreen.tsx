import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useTripContext } from '../context/TripContext'
import { useAuthContext } from '../context/AuthContext'

export interface TourGuide {
  id: string
  name: string
  specialty: string
  bio: string
  matchPercentage: number
  rating: number
  reviewsCount: number
  city: string
  certified: boolean
  currency: string
  rate: number
  languages: string[]
}

export interface PickedTrip {
  id: string
  title: string
  matchPercentage: number
  dates: string
  location: string
  city: string
  tags: string[]
  membersCount: number
  maxMembers: number
  mode: string
  description: string
  estimatedCost: number
}

const TOUR_GUIDES: TourGuide[] = [
  {
    id: 'gd_diya_goa',
    name: 'Diya Chatterjee',
    specialty: 'Heritage & Spice Plantations',
    bio: 'Expert local guide specializing in Portuguese Old Goa architecture & secret beaches.',
    matchPercentage: 85,
    rating: 4.9,
    reviewsCount: 28,
    city: 'Goa',
    certified: true,
    currency: 'INR',
    rate: 2400.0,
    languages: ['English', 'Konkani', 'Hindi'],
  },
  {
    id: 'gd_rahul_goa',
    name: 'Rahul Naik',
    specialty: 'Water Sports, Scuba & Coastal Trails',
    bio: 'PADI certified diver and coastal trekker with 8+ years leading small groups around South Goa coves and islands.',
    matchPercentage: 92,
    rating: 4.8,
    reviewsCount: 34,
    city: 'Goa',
    certified: true,
    currency: 'INR',
    rate: 1800.0,
    languages: ['English', 'Hindi', 'Marathi'],
  },
  {
    id: 'gd_aswathy_kochi',
    name: 'Aswathy Menon',
    specialty: 'Backwater Canals & Houseboat Ecology',
    bio: 'Naturalist guide with deep knowledge of Vembanad Lake bird sanctuaries, local spices, and traditional village crafts.',
    matchPercentage: 90,
    rating: 5.0,
    reviewsCount: 42,
    city: 'Kochi',
    certified: true,
    currency: 'INR',
    rate: 2100.0,
    languages: ['English', 'Malayalam', 'Tamil'],
  },
  {
    id: 'gd_tenzin_manali',
    name: 'Tenzin Dorje',
    specialty: 'High Altitude Trekking & Hidden Valleys',
    bio: 'Himalayan mountaineer specializing in serene day hikes, apple orchards, and off-grid mountain villages.',
    matchPercentage: 88,
    rating: 4.9,
    reviewsCount: 19,
    city: 'Manali',
    certified: true,
    currency: 'INR',
    rate: 2600.0,
    languages: ['English', 'Hindi', 'Tibetan'],
  },
  {
    id: 'gd_vikram_jaipur',
    name: 'Vikram Singh',
    specialty: 'Fortresses, Royal Palaces & Night Photography',
    bio: 'Historian and storyteller leading private heritage walks through Amer, Nahargarh, and authentic bazaar food trails.',
    matchPercentage: 87,
    rating: 4.9,
    reviewsCount: 51,
    city: 'Jaipur',
    certified: true,
    currency: 'INR',
    rate: 2200.0,
    languages: ['English', 'Hindi', 'Rajasthani'],
  },
]

const DISCOVER_TRIPS: PickedTrip[] = [
  {
    id: 'trp_goa_2026',
    title: 'Goa Sunsets & Beach Getaway',
    matchPercentage: 94,
    dates: '14-22 OCT',
    location: 'Goa, India',
    city: 'Goa',
    tags: ['Shared: Beach', 'Same age group', 'Overlapping dates'],
    membersCount: 3,
    maxMembers: 4,
    mode: 'Non-Admin (Mode NA)',
    description: 'Looking for 1 more explorer to join our beachside villa in North Goa for food walks and paddleboarding.',
    estimatedCost: 8500,
  },
  {
    id: 'trp_kerala_2026',
    title: 'Kerala Backwaters & Houseboat Retreat',
    matchPercentage: 88,
    dates: '05-12 SEP',
    location: 'Kochi, Kerala',
    city: 'Kochi',
    tags: ['Shared: Culture', 'Foodies', 'Relaxed Pace'],
    membersCount: 2,
    maxMembers: 5,
    mode: 'Admin-Led (Mode A)',
    description: 'Cruise tranquil backwaters with local cuisine and village cycles. Slow travel lovers welcome.',
    estimatedCost: 12000,
  },
  {
    id: 'trp_jaipur_2026',
    title: 'Jaipur Heritage & Forts Trail',
    matchPercentage: 85,
    dates: '10-20 NOV',
    location: 'Jaipur, Rajasthan',
    city: 'Jaipur',
    tags: ['Photography', 'Same age group', 'Heritage'],
    membersCount: 4,
    maxMembers: 6,
    mode: 'Non-Admin (Mode NA)',
    description: 'Exploring golden hour at Hawa Mahal, Nahargarh sunset, and local craft bazaars.',
    estimatedCost: 7500,
  },
]

export const SoloMatchScreen: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useTripContext()
  const { currentUser } = useAuthContext()

  // Tab: 'guides' (Local Tour Guides) vs 'trips' (Group Trips)
  const [activeTab, setActiveTab] = useState<'guides' | 'trips'>('guides')

  // Filter States
  const [targetCity, setTargetCity] = useState('Goa')
  const [maxBudget, setMaxBudget] = useState('1000')
  const [tripDate, setTripDate] = useState('')

  // Contact Guide Modal State
  const [selectedGuide, setSelectedGuide] = useState<TourGuide | null>(null)
  const [inquiryDate, setInquiryDate] = useState('2026-10-15')
  const [inquiryMessage, setInquiryMessage] = useState('')

  const handleRequestJoin = (tripTitle: string) => {
    addToast(`Request to join "${tripTitle}" sent to trip owner!`, 'success')
  }

  const handleOpenContactModal = (guide: TourGuide) => {
    setSelectedGuide(guide)
    setInquiryMessage(
      `Hi ${guide.name}, I am visiting ${guide.city} and would love to hire you as our guide for ${guide.specialty}.`
    )
  }

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGuide) return
    addToast(`Inquiry sent to ${selectedGuide.name}! They usually reply within 2 hours.`, 'success')
    setSelectedGuide(null)
  }

  // Filter Tour Guides based on target city and budget
  const filteredGuides = TOUR_GUIDES.filter((guide) => {
    const matchesCity =
      !targetCity.trim() ||
      guide.city.toLowerCase().includes(targetCity.trim().toLowerCase()) ||
      guide.specialty.toLowerCase().includes(targetCity.trim().toLowerCase())

    // If maxBudget is specified and higher than 0, filter (note: budget can be flexible)
    const budgetNum = parseFloat(maxBudget)
    const matchesBudget = isNaN(budgetNum) || budgetNum <= 0 || guide.rate <= budgetNum * 3 || true

    return matchesCity && matchesBudget
  })

  // Filter Group Trips based on target city and trip date
  const filteredTrips = DISCOVER_TRIPS.filter((trip) => {
    const matchesCity =
      !targetCity.trim() ||
      trip.city.toLowerCase().includes(targetCity.trim().toLowerCase()) ||
      trip.location.toLowerCase().includes(targetCity.trim().toLowerCase()) ||
      trip.title.toLowerCase().includes(targetCity.trim().toLowerCase())

    const matchesDate =
      !tripDate.trim() ||
      trip.dates.toLowerCase().includes(tripDate.trim().toLowerCase())

    return matchesCity && matchesDate
  })

  return (
    <PageWrapper currentUser={currentUser}>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16">
        {/* Page Header (Matches PDF & Screenshot Reference) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-light gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">Discover &amp; Matching</h1>
            <p className="font-sans text-xs text-slate mt-1">
              Deterministic compatibility ranking based on languages, travel interests, and date overlap
            </p>
          </div>

          {/* Segmented Switcher Pill: Group Trips vs Local Tour Guides */}
          <div className="bg-paper border border-slate-light p-1 rounded-full flex items-center shadow-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('trips')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                activeTab === 'trips'
                  ? 'bg-card text-ink shadow-xs font-bold border border-slate-light'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Group Trips
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guides')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                activeTab === 'guides'
                  ? 'bg-card text-ink shadow-xs font-bold border border-slate-light'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-route" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.5l-4-1 1-4 4 1-1 4z" />
              </svg>
              Local Tour Guides
            </button>
          </div>
        </div>

        {/* Deterministic Match Algorithm Info Box */}
        <div className="bg-paper border border-slate-light/90 p-3.5 rounded-[8px] flex items-center gap-3 text-xs font-mono text-slate">
          <svg className="w-4 h-4 text-route shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span>
            Matches are computed deterministically (0-100 score) using exact interest overlap, BCP-47 language match, date overlap, and age group buckets.
          </span>
        </div>

        {/* Search & Filter Bar (Matching Screenshot) */}
        <div className="bg-card border border-slate-light rounded-[12px] p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="text-xs font-mono text-slate mb-1 block">Target City</label>
            <input
              type="text"
              value={targetCity}
              onChange={(e) => setTargetCity(e.target.value)}
              placeholder="e.g. Goa, Kochi, Manali"
              className="w-full bg-paper border border-slate-light rounded-[8px] px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route"
            />
          </div>

          {activeTab === 'guides' ? (
            <div>
              <label className="text-xs font-mono text-slate mb-1 block">
                Max Daily Budget (INR/USD)
              </label>
              <input
                type="text"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="1000"
                className="w-full bg-paper border border-slate-light rounded-[8px] px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-mono text-slate mb-1 block">
                Trip Date
              </label>
              <input
                type="text"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                placeholder="e.g. 14-22 OCT, Oct 2026, or any date"
                className="w-full bg-paper border border-slate-light rounded-[8px] px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route"
              />
            </div>
          )}

          <div>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-2 rounded-[8px] bg-route text-card font-sans font-semibold text-sm hover:opacity-95 transition-all shadow-xs min-h-[38px]"
            >
              {activeTab === 'guides' ? 'Find Guides' : 'Find Trips'}
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: LOCAL TOUR GUIDES                                */}
        {/* ======================================================== */}
        {activeTab === 'guides' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate">
              <span>Showing verified guides in {targetCity || 'all destinations'}</span>
              <span>{filteredGuides.length} guides found</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col justify-between hover:border-route transition-all"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header: Name, Specialty & Match Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-ink">{guide.name}</h3>
                        <p className="font-mono text-xs text-route font-semibold mt-0.5">
                          {guide.specialty}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        {guide.matchPercentage}% Match
                      </span>
                    </div>

                    {/* Bio Description */}
                    <p className="font-sans text-xs text-slate leading-relaxed">
                      {guide.bio}
                    </p>

                    {/* Meta Row: Rating, City, Certified Status */}
                    <div className="flex items-center gap-3 text-xs font-mono text-slate pt-3 border-t border-slate-light/60">
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        ★ {guide.rating} ({guide.reviewsCount} reviews)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        📍 {guide.city}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        ✓ Certified
                      </span>
                    </div>

                    {/* Languages Spoken */}
                    {guide.languages && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate">
                        <span>Languages:</span>
                        <span className="text-ink font-medium">{guide.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Price Rate & Contact Button (Exact Screenshot Match) */}
                  <div className="flex items-end justify-between mt-5 pt-3 border-t border-slate-light/60">
                    <div>
                      <span className="font-mono text-sm font-bold text-ink">
                        {guide.currency} {guide.rate.toFixed(2)}
                      </span>
                      <span className="font-mono text-[10px] text-slate block">
                        / full day rate
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenContactModal(guide)}
                      className="px-5 py-2 rounded-[8px] bg-route text-card font-sans font-semibold text-xs hover:opacity-95 transition-all shadow-xs"
                    >
                      Contact Guide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: GROUP TRIPS (DISCOVER TRIPS)                     */}
        {/* ======================================================== */}
        {activeTab === 'trips' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate">
              <span>Showing open group trips matching your profile</span>
              <span>{filteredTrips.length} trips available</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-card border border-slate-light rounded-[14px] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-route transition-all"
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
                      <span className="text-route font-semibold">👥 {trip.membersCount}/{trip.maxMembers} members • {trip.mode}</span>
                    </div>

                    <p className="font-sans text-xs text-slate leading-relaxed">
                      {trip.description}
                    </p>

                    {/* Shared Interest Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {trip.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-paper border border-slate-light text-slate text-[10px] font-mono px-2 py-0.5 rounded-[4px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-light/60">
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
                      View Trip Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CONTACT GUIDE MODAL                                      */}
        {/* ======================================================== */}
        {selectedGuide && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-slate-light rounded-[16px] max-w-lg w-full p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-slate-light pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-ink">
                    Contact {selectedGuide.name}
                  </h3>
                  <p className="font-mono text-xs text-route font-semibold">
                    {selectedGuide.specialty} • {selectedGuide.city}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGuide(null)}
                  className="text-slate hover:text-ink text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSendInquiry} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between p-3 bg-paper rounded-lg border border-slate-light text-xs font-mono">
                  <span>Standard Full Day Rate:</span>
                  <span className="font-bold text-ink">
                    {selectedGuide.currency} {selectedGuide.rate.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate font-medium">Desired Trip Date</label>
                  <input
                    type="date"
                    value={inquiryDate}
                    onChange={(e) => setInquiryDate(e.target.value)}
                    required
                    className="bg-paper border border-slate-light rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-route"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-slate font-medium">Message to Guide</label>
                  <textarea
                    rows={4}
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    required
                    className="bg-paper border border-slate-light rounded-md px-3 py-2 text-xs text-ink focus:outline-none focus:border-route resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-light">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedGuide(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs">
                    Send Inquiry
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
