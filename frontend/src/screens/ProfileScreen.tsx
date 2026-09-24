import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuthContext()
  const { addToast } = useTripContext()

  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'Nikitha')
  const [bio, setBio] = useState(
    'Passionate wanderer exploring hidden coastlines, cultural trails, and mountain retreats. Believer in thoughtful group itineraries and slow travel.'
  )
  const [homeCity, setHomeCity] = useState('Bangalore, India')
  const [travelStyle, setTravelStyle] = useState('Coastal & Cultural')
  const [budgetBand, setBudgetBand] = useState('Mid-range ($$)')

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setIsEditing(false)
    addToast('Profile updated successfully!', 'success')
  }

  const handleSignOut = () => {
    addToast('Signed out successfully', 'info')
    navigate('/sign-in')
  }

  return (
    <PageWrapper currentUser={currentUser}>
      <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
        {/* Top Breadcrumb & Action bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-light">
          <div className="flex items-center gap-2 text-xs font-mono text-slate">
            <Link to="/trips" className="hover:text-route transition-colors">
              My Trips
            </Link>
            <span>/</span>
            <span className="text-ink font-semibold">User Profile</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs px-3.5 py-1.5 min-h-[36px]"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="text-xs px-3.5 py-1.5 min-h-[36px] border-red-200 text-red-700 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Profile Card Header */}
        <div className="bg-card border border-slate-light rounded-[16px] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-route/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-route text-card font-mono text-2xl sm:text-3xl font-bold flex items-center justify-center shadow-md">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-card" title="Active Wanderer" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  {displayName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase bg-route/10 text-route border border-route/20">
                  Verified Traveler
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate">
                <span>@{displayName.toLowerCase().replace(/\s+/g, '_')}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {homeCity}
                </span>
                <span>•</span>
                <span>Joined Oct 2024</span>
              </div>
              <p className="text-sm font-sans text-slate mt-1 max-w-2xl leading-relaxed">
                {bio}
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-light">
            <div className="flex flex-col">
              <span className="font-mono text-2xl font-bold text-ink">3</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Total Trips</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-2xl font-bold text-emerald-700">2</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Ongoing Trips</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-2xl font-bold text-slate">1</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Finished Trips</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-2xl font-bold text-route">8</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate">Travel Buddies</span>
            </div>
          </div>
        </div>

        {/* Edit Form Modal/Drawer if editing */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-card border-2 border-route/30 rounded-[14px] p-6 shadow-sm flex flex-col gap-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-light">
              <h2 className="font-serif text-lg font-bold text-ink">Edit Profile Info</h2>
              <span className="text-xs font-mono text-slate">Changes save instantly</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-medium text-slate">Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-paper border border-slate-light rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-route"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-medium text-slate">Home Location</label>
                <input
                  type="text"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  className="bg-paper border border-slate-light rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-route"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-medium text-slate">Travel Style</label>
                <input
                  type="text"
                  value={travelStyle}
                  onChange={(e) => setTravelStyle(e.target.value)}
                  className="bg-paper border border-slate-light rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-route"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-medium text-slate">Budget Tier</label>
                <select
                  value={budgetBand}
                  onChange={(e) => setBudgetBand(e.target.value)}
                  className="bg-paper border border-slate-light rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-route"
                >
                  <option value="Budget ($)">Budget ($)</option>
                  <option value="Mid-range ($$)">Mid-range ($$)</option>
                  <option value="Luxury ($$$)">Luxury ($$$)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-mono font-medium text-slate">Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-paper border border-slate-light rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-route resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="text-xs">
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {/* Travel DNA & Style Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preferences */}
          <div className="bg-card border border-slate-light rounded-[14px] p-6 flex flex-col gap-4">
            <h2 className="font-serif text-lg font-bold text-ink">Traveler DNA &amp; Style</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-paper rounded-lg border border-slate-light/60 flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase text-slate">Preferred Style</span>
                <span className="font-semibold text-ink">{travelStyle}</span>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-slate-light/60 flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase text-slate">Budget Level</span>
                <span className="font-semibold text-ink">{budgetBand}</span>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-slate-light/60 flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase text-slate">Party Size</span>
                <span className="font-semibold text-ink">Small (3–6 Travelers)</span>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-slate-light/60 flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase text-slate">Pace</span>
                <span className="font-semibold text-ink">Relaxed Exploration</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-light">
              <span className="font-mono text-[11px] text-slate uppercase">Interests &amp; Tags</span>
              <div className="flex flex-wrap gap-2">
                {['Beach Sunsets', 'Heritage Walks', 'Coastal Food', 'Photography', 'Road Trips', 'Local Cafes'].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md bg-paper border border-slate-light text-xs font-mono text-ink"
                    >
                      #{tag}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Quick Trips Overview */}
          <div className="bg-card border border-slate-light rounded-[14px] p-6 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-ink">My Trip Itineraries</h2>
                <Link to="/trips" className="font-mono text-xs text-route font-semibold hover:underline">
                  View All &rarr;
                </Link>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  to="/trips/trp_goa_2026"
                  className="flex items-center justify-between p-3 rounded-lg bg-paper border border-slate-light hover:border-route transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="font-serif font-bold text-ink text-sm group-hover:text-route transition-colors">
                      Goa Sunsets &amp; Beach Getaway
                    </span>
                    <span className="font-mono text-[11px] text-slate">10-16 OCT 2026</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Ongoing
                  </span>
                </Link>

                <Link
                  to="/trips/trp_kerala_2026"
                  className="flex items-center justify-between p-3 rounded-lg bg-paper border border-slate-light hover:border-route transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="font-serif font-bold text-ink text-sm group-hover:text-route transition-colors">
                      Kerala Backwaters Retreat
                    </span>
                    <span className="font-mono text-[11px] text-slate">01-07 NOV 2026</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Ongoing
                  </span>
                </Link>

                <div className="flex items-center justify-between p-3 rounded-lg bg-paper/60 border border-slate-light">
                  <div className="flex flex-col">
                    <span className="font-serif font-bold text-ink/70 text-sm">
                      Manali &amp; Kasol Mountain Trek
                    </span>
                    <span className="font-mono text-[11px] text-slate">12-18 AUG 2024</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-200 text-slate-700 border border-slate-300">
                    Finished
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate('/trips/new')}
              variant="secondary"
              className="w-full text-xs"
            >
              + Plan New Trip
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
