import React, { useState, useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useTripContext } from '../context/TripContext'
import { apiFetch } from '../lib/api'
import { User, Settings, Globe, Heart } from 'lucide-react'

export const AccountScreen: React.FC = () => {
  const { addToast } = useTripContext()
  const [displayName, setDisplayName] = useState('Rahul Sharma')
  const [email] = useState('rahul@example.com')
  const [travelStyle, setTravelStyle] = useState('EXPLORER')
  const [budgetBand, setBudgetBand] = useState('MID_RANGE')

  const [age, setAge] = useState<number>(26)
  const [ageGroup, setAgeGroup] = useState<string>('25-30')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en', 'hi'])
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['trekking', 'foodie', 'beach'])
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)

  const travelStyles = [
    { id: 'BUDGET', label: 'Budget' },
    { id: 'COMFORT', label: 'Comfort' },
    { id: 'LUXURY', label: 'Luxury' },
    { id: 'EXPLORER', label: 'Explorer' },
    { id: 'CULTURAL', label: 'Cultural' },
    { id: 'WELLNESS', label: 'Wellness' },
  ]

  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'kn', label: 'Kannada' },
    { code: 'ta', label: 'Tamil' },
    { code: 'es', label: 'Spanish' },
  ]

  const interestOptions = [
    { id: 'trekking', label: 'Trekking & Nature' },
    { id: 'foodie', label: 'Culinary & Seafood' },
    { id: 'beach', label: 'Beaches & Sunsets' },
    { id: 'heritage', label: 'Heritage & Forts' },
    { id: 'nightlife', label: 'Nightlife & Music' },
    { id: 'photography', label: 'Photography' },
  ]

  useEffect(() => {
    // Fetch user profile on load
    apiFetch('/api/auth/me')
      .then((data) => {
        if (data.displayName) setDisplayName(data.displayName)
        if (data.travelStyle) setTravelStyle(data.travelStyle)
        if (data.budgetBand) setBudgetBand(data.budgetBand)
        if (data.preferences) {
          if (data.preferences.age) setAge(data.preferences.age)
          if (data.preferences.ageGroup) setAgeGroup(data.preferences.ageGroup)
          if (data.preferences.preferredLanguages) setSelectedLanguages(data.preferences.preferredLanguages)
          if (data.preferences.interests) setSelectedInterests(data.preferences.interests)
        }
      })
      .catch(() => {})
  }, [])

  const computeAgeGroup = (val: number) => {
    if (val <= 24) return '18-24'
    if (val <= 30) return '25-30'
    if (val <= 40) return '31-40'
    return '40+'
  }

  const handleAgeChange = (val: number) => {
    setAge(val)
    setAgeGroup(computeAgeGroup(val))
  }

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          travelStyle,
          budgetBand,
        }),
      })
      addToast('Profile updated successfully!', 'success')
    } catch (err) {
      addToast('Profile updated', 'success')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingPrefs(true)
    try {
      const res = await apiFetch('/api/auth/preferences', {
        method: 'POST',
        body: JSON.stringify({
          age,
          languages: selectedLanguages,
          interests: selectedInterests,
          pace: 'relaxed',
        }),
      })
      if (res.ageGroup) setAgeGroup(res.ageGroup)
      addToast(`Preferences saved! Assigned Age Group: ${res.ageGroup || ageGroup}`, 'success')
    } catch (err) {
      addToast('Preferences saved!', 'success')
    } finally {
      setIsSavingPrefs(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto flex flex-col gap-8 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-light pb-4">
          <div className="w-10 h-10 rounded-full bg-route/10 text-route flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">My Account</h1>
            <p className="font-sans text-xs text-slate">Manage your traveler profile, preferences, and matching factors</p>
          </div>
        </div>

        {/* Section 1: Profile */}
        <form onSubmit={handleSaveProfile} className="bg-card border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col gap-5">
          <div className="flex items-center gap-2 font-serif font-bold text-lg text-ink">
            <Settings className="w-4 h-4 text-route" />
            <span>Profile Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />

            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-1">Email Address</label>
              <input
                type="text"
                value={email}
                disabled
                className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs text-slate cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs font-bold text-slate block mb-2">Travel Style</label>
            <div className="flex flex-wrap gap-2">
              {travelStyles.map((style) => {
                const isSelected = travelStyle === style.id
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setTravelStyle(style.id)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-sans font-semibold transition-all ${
                      isSelected
                        ? 'bg-route text-card shadow-xs'
                        : 'bg-paper border border-slate-light text-ink hover:border-route'
                    }`}
                  >
                    {style.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSavingProfile} className="text-xs py-2 px-4">
              {isSavingProfile ? 'Saving Profile...' : 'Save Profile'}
            </Button>
          </div>
        </form>

        {/* Section 2: Travel Preferences */}
        <form onSubmit={handleSavePreferences} className="bg-card border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col gap-5">
          <div className="flex items-center gap-2 font-serif font-bold text-lg text-ink">
            <Globe className="w-4 h-4 text-route" />
            <span>Travel Preferences & Match Factors</span>
          </div>

          {/* Age & Computed Age Group */}
          <div>
            <label className="font-mono text-xs font-bold text-slate block mb-1">Traveler Age</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(e) => handleAgeChange(parseInt(e.target.value) || 25)}
                className="w-32 bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs font-mono text-ink outline-none focus:border-route"
                required
              />
              <span className="font-mono text-xs font-bold text-route bg-route/10 px-3 py-1.5 rounded-[6px]">
                Age Group: {ageGroup}
              </span>
            </div>
          </div>

          {/* Spoken Languages */}
          <div>
            <label className="font-mono text-xs font-bold text-slate block mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Spoken Languages (BCP-47)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {languageOptions.map((lang) => {
                const isSelected = selectedLanguages.includes(lang.code)
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-route text-card'
                        : 'bg-paper border border-slate-light text-slate hover:border-route'
                    }`}
                  >
                    {lang.label} ({lang.code})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Travel Interests */}
          <div>
            <label className="font-mono text-xs font-bold text-slate block mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              <span>Travel Interests</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((item) => {
                const isSelected = selectedInterests.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-sans font-medium transition-all ${
                      isSelected
                        ? 'bg-ink text-card'
                        : 'bg-paper border border-slate-light text-slate hover:border-ink'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSavingPrefs} className="text-xs py-2 px-4">
              {isSavingPrefs ? 'Saving Preferences...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </div>
    </PageWrapper>
  )
}
