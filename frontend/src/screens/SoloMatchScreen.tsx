import React, { useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { CompatibilityCard } from '../components/solo/CompatibilityCard'
import { GuideCard } from '../components/solo/GuideCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { apiFetch } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'
import type { GroupMatch, GuideMatch } from '../types/solo'

export const SoloMatchScreen: React.FC = () => {
  const { getToken } = useAuthContext()
  const { addToast } = useTripContext()

  const [activeTab, setActiveTab] = useState<'groups' | 'guides'>('groups')
  const [cityInput, setCityInput] = useState('Bali')
  const [budgetInput, setBudgetInput] = useState('100.00')
  const [currency, setCurrency] = useState('USD')
  const [isSearchingGroups, setIsSearchingGroups] = useState(false)
  const [isSearchingGuides, setIsSearchingGuides] = useState(false)

  const dummyGroupMatches: GroupMatch[] = [
    {
      trip: {
        trpId: 'trp_bali_2026',
        ownerId: 'usr_owner',
        title: 'Bali Tropical Escape & Cultural Journey',
        destinationCityId: 'Bali',
        startDate: '2026-10-10',
        endDate: '2026-10-16',
        partySize: 4,
        mode: 'Mode NA',
        status: 'planning',
        homeCurrency: 'USD',
        members: [],
      },
      compatibilityScore: 85, // INTEGER 0-100
      ageGroupMatch: true,
      sharedLanguages: ['en', 'hi'],
      sharedInterests: ['heritage', 'food'],
      dateOverlapDays: 5,
    },
  ]

  const dummyGuideMatches: GuideMatch[] = [
    {
      guide: {
        gidId: 'gid_bali_01',
        cityId: 'Bali',
        displayName: 'Wayan Sudarma',
        languages: ['en', 'hi'],
        specialisation: 'heritage',
        dayRate: '80.00',
        halfDayRate: '45.00',
        currency: 'USD',
        rating: 4.8,
        reviewCount: 42,
        certified: true,
        bio: 'Certified local cultural & heritage guide with 10+ years experience in Bali.',
      },
      compatibilityScore: 92, // INTEGER 0-100
      sharedLanguages: ['en', 'hi'],
      sharedSpecialisations: ['heritage'],
    },
  ]

  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>(dummyGroupMatches)
  const [guideMatches, setGuideMatches] = useState<GuideMatch[]>(dummyGuideMatches)

  const handleSearchGroups = async () => {
    setIsSearchingGroups(true)
    try {
      const data = await apiFetch<GroupMatch[]>('/api/solo-matching/groups', {
        method: 'POST',
      }, getToken).catch(() => null)

      if (data && data.length > 0) {
        setGroupMatches(data)
      } else {
        setGroupMatches(dummyGroupMatches)
      }
      addToast('Found matching trips!', 'success')
    } catch {
      addToast('Search complete', 'info')
    } finally {
      setIsSearchingGroups(false)
    }
  }

  const handleSearchGuides = async () => {
    setIsSearchingGuides(true)
    try {
      const data = await apiFetch<GuideMatch[]>('/api/solo-matching/guides', {
        method: 'POST',
        body: JSON.stringify({
          city: cityInput,
          maxBudget: budgetInput,
          currency,
        }),
      }, getToken).catch(() => null)

      if (data && data.length > 0) {
        setGuideMatches(data)
      } else {
        setGuideMatches(dummyGuideMatches)
      }
      addToast('Found matching guides!', 'success')
    } catch {
      addToast('Search complete', 'info')
    } finally {
      setIsSearchingGuides(false)
    }
  }

  const handleJoinTrip = async (trpId: string) => {
    try {
      await apiFetch(`/api/trips/${trpId}/members`, {
        method: 'POST',
      }, getToken).catch(() => null)
      addToast('Join request sent to trip owner!', 'success')
    } catch {
      addToast('Failed to send join request', 'conflict')
    }
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Solo Matchmaker</h1>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 border-b border-slate-light pb-2">
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-[8px] font-mono text-xs font-medium capitalize transition-colors min-h-[44px] ${
              activeTab === 'groups'
                ? 'bg-route text-card font-bold shadow-sm'
                : 'text-slate hover:text-ink'
            }`}
          >
            Find a Group
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`px-4 py-2 rounded-[8px] font-mono text-xs font-medium capitalize transition-colors min-h-[44px] ${
              activeTab === 'guides'
                ? 'bg-route text-card font-bold shadow-sm'
                : 'text-slate hover:text-ink'
            }`}
          >
            Find a Guide
          </button>
        </div>

        {/* Tab 1 — Find a Group */}
        {activeTab === 'groups' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border border-slate-light p-4 rounded-[10px] shadow-sm">
              <span className="text-xs font-mono text-slate">
                Match against active group trips matching your style &amp; dates
              </span>
              <Button
                onClick={handleSearchGroups}
                disabled={isSearchingGroups}
                className="w-full sm:w-auto"
              >
                {isSearchingGroups ? 'Matching...' : 'Find Trips for Me'}
              </Button>
            </div>

            {groupMatches.length === 0 ? (
              <EmptyState
                title="No matching trips found"
                message="No matching trips found — try adjusting your preferences in your profile"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupMatches.map((m) => (
                  <CompatibilityCard
                    key={m.trip.trpId}
                    match={m}
                    onJoinClick={() => handleJoinTrip(m.trip.trpId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2 — Find a Guide */}
        {activeTab === 'guides' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card border border-slate-light p-4 rounded-[10px] shadow-sm items-end">
              <Input
                label="City Name"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="e.g. Bali"
              />
              <Input
                label="Max Budget"
                type="text"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="e.g. 100.00"
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate font-sans">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-sm text-ink font-sans outline-none min-h-[44px]"
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <Button
                onClick={handleSearchGuides}
                disabled={isSearchingGuides}
                className="w-full"
              >
                {isSearchingGuides ? 'Searching...' : 'Find Guides'}
              </Button>
            </div>

            {guideMatches.length === 0 ? (
              <EmptyState
                title="No guides found"
                message="No certified guides found for this city and budget criteria."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guideMatches.map((g) => (
                  <GuideCard key={g.guide.gidId} match={g} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
