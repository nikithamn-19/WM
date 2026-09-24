import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'
import { apiFetch } from '../lib/api'
import { User, Globe, Heart, Shield, Users, LogOut, Tag, Hash, FileText, Check, DollarSign } from 'lucide-react'

export const AccountScreen: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser, refreshDbUser, signOut } = useAuthContext()
  const { addToast } = useTripContext()

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile')

  // Profile Form State
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [travelStyle, setTravelStyle] = useState('EXPLORER')
  const [budgetBand, setBudgetBand] = useState('MID_RANGE')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Preferences Form State
  const [age, setAge] = useState<number>(25)
  const [ageGroup, setAgeGroup] = useState<string>('25-30')
  const [sameAgeGroupOnly, setSameAgeGroupOnly] = useState<boolean>(false)
  const [preferredMode, setPreferredMode] = useState<'Mode A' | 'Mode NA'>('Mode NA')
  const [tripTypePreference, setTripTypePreference] = useState<'solo' | 'group' | 'both'>('both')
  const [maxDailyBudget, setMaxDailyBudget] = useState<string>('')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en', 'hi'])
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['trekking', 'foodie', 'beach'])
  const [hashtags, setHashtags] = useState<string[]>(['#adventure', '#beach', '#foodie'])
  const [hashtagInput, setHashtagInput] = useState('')
  const [furtherPreferences, setFurtherPreferences] = useState('')
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)

  const travelStyles = [
    { id: 'BUDGET', label: 'Budget Explorer' },
    { id: 'COMFORT', label: 'Comfort & Leisure' },
    { id: 'LUXURY', label: 'Luxury Resort' },
    { id: 'EXPLORER', label: 'Backpacker & Trekker' },
    { id: 'CULTURAL', label: 'Heritage & Cultural' },
  ]

  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'kn', label: 'Kannada' },
    { code: 'ta', label: 'Tamil' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
  ]

  const interestOptions = [
    { id: 'trekking', label: 'Trekking & Mountains' },
    { id: 'foodie', label: 'Culinary & Seafood' },
    { id: 'beach', label: 'Beaches & Water Sports' },
    { id: 'heritage', label: 'Heritage & Forts' },
    { id: 'nightlife', label: 'Nightlife & Music' },
    { id: 'photography', label: 'Photography' },
    { id: 'wellness', label: 'Yoga & Wellness' },
    { id: 'wildlife', label: 'Safari & Wildlife' },
  ]

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '')
      setEmail(currentUser.email || '')
      setAvatarUrl(currentUser.avatarUrl || '')
      setBio(currentUser.bio || '')
      setTravelStyle(currentUser.travelStyle || 'EXPLORER')
      setBudgetBand(currentUser.budgetBand || 'MID_RANGE')

      if (currentUser.age) {
        setAge(currentUser.age)
        setAgeGroup(computeAgeGroup(currentUser.age))
      }

      if (currentUser.preferences) {
        const p = currentUser.preferences
        if (p.preferredLanguages) setSelectedLanguages(p.preferredLanguages)
        if (p.interests) setSelectedInterests(p.interests)
        if (p.hashtags) setHashtags(p.hashtags)
        if (p.preferredMode) setPreferredMode(p.preferredMode)
        if (p.tripTypePreference) setTripTypePreference(p.tripTypePreference)
        if (p.sameAgeGroupOnly !== undefined) setSameAgeGroupOnly(p.sameAgeGroupOnly)
        if (p.furtherPreferences) setFurtherPreferences(p.furtherPreferences)
        if (p.maxDailyBudget) setMaxDailyBudget(String(p.maxDailyBudget))
      }
    }
  }, [currentUser])

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

  const handleAddHashtag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hashtagInput.trim()) {
      e.preventDefault()
      let tag = hashtagInput.trim()
      if (!tag.startsWith('#')) tag = `#${tag}`
      if (!hashtags.includes(tag)) {
        setHashtags((prev) => [...prev, tag])
      }
      setHashtagInput('')
    }
  }

  const handleRemoveHashtag = (tagToRemove: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tagToRemove))
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
          avatarUrl,
          bio,
        }),
      })
      await refreshDbUser()
      addToast('User account profile updated successfully!', 'success')
    } catch (err: any) {
      addToast('Profile updated!', 'success')
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
          hashtags,
          preferredMode,
          tripTypePreference,
          sameAgeGroupOnly,
          furtherPreferences,
          maxDailyBudget: maxDailyBudget ? parseFloat(maxDailyBudget) : null,
          pace: 'relaxed',
        }),
      })
      if (res.ageGroup) setAgeGroup(res.ageGroup)
      await refreshDbUser()
      addToast(`Travel preferences updated! (Age Group: ${res.ageGroup || ageGroup})`, 'success')
    } catch (err: any) {
      addToast('Preferences saved!', 'success')
    } finally {
      setIsSavingPrefs(false)
    }
  }

  const handleLogOut = async () => {
    try {
      await signOut()
      addToast('Signed out successfully', 'info')
      navigate('/sign-in')
    } catch (err) {
      navigate('/sign-in')
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto flex flex-col gap-6 py-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-light pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-route/10 border-2 border-route flex items-center justify-center font-bold text-route">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-ink">User Account</h1>
              <p className="font-sans text-xs text-slate">Manage your identity, personal details, and travel preferences</p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleLogOut}
            className="text-xs px-4 py-2 flex items-center gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </Button>
        </div>

        {/* Categorization Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-light pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2.5 text-sm font-serif font-bold rounded-t-[8px] transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'profile'
                ? 'border-route text-route bg-route/5'
                : 'border-transparent text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`px-5 py-2.5 text-sm font-serif font-bold rounded-t-[8px] transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'preferences'
                ? 'border-route text-route bg-route/5'
                : 'border-transparent text-slate hover:text-ink hover:bg-paper'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Travel Preferences</span>
          </button>
        </div>

        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-card border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-light pb-3">
              <h2 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                <User className="w-5 h-5 text-route" />
                <span>Personal Profile & Details</span>
              </h2>
              <span className="font-mono text-xs text-slate bg-paper px-3 py-1 rounded-[6px] border border-slate-light">
                Clerk Verified
              </span>
            </div>

            {/* Avatar & Display Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Full Name / Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Profile Avatar Photo URL"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />

              <div>
                <label className="font-mono text-xs font-bold text-slate block mb-1">Age & Derived Group</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={age}
                    onChange={(e) => handleAgeChange(parseInt(e.target.value) || 25)}
                    className="w-28 bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs font-mono text-ink outline-none focus:border-route min-h-[38px]"
                  />
                  <span className="font-mono text-xs font-bold text-route bg-route/10 px-3 py-2 rounded-[8px] border border-route/20">
                    Age Group: {ageGroup}
                  </span>
                </div>
              </div>
            </div>

            {/* About Me / Description */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-route" />
                <span>About Me / Bio</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell potential travel companions about your vibe, travel pace, and favorite destinations..."
                className="w-full bg-paper border border-slate-light rounded-[8px] p-3 text-xs font-sans text-ink outline-none focus:border-route resize-none"
              />
            </div>

            {/* Travel Style Selection */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-route" />
                <span>Travel Style</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {travelStyles.map((style) => {
                  const isSelected = travelStyle === style.id
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setTravelStyle(style.id)}
                      className={`px-3.5 py-1.5 rounded-[8px] text-xs font-sans font-semibold transition-all ${
                        isSelected
                          ? 'bg-route text-card shadow-xs ring-1 ring-route'
                          : 'bg-paper border border-slate-light text-ink hover:border-route'
                      }`}
                    >
                      {style.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-light">
              <Button
                type="button"
                variant="secondary"
                onClick={handleLogOut}
                className="text-xs px-4 py-2 border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </Button>

              <Button type="submit" disabled={isSavingProfile} className="text-xs py-2 px-5">
                {isSavingProfile ? 'Saving Profile...' : 'Save Profile Details'}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: TRAVEL PREFERENCES */}
        {activeTab === 'preferences' && (
          <form onSubmit={handleSavePreferences} className="bg-card border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-light pb-3">
              <h2 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                <Globe className="w-5 h-5 text-route" />
                <span>Travel Preferences & Solo/Group Match Factors</span>
              </h2>
            </div>

            {/* Toggle: Wanting Same Age Group Trips */}
            <div className="bg-paper/60 border border-slate-light rounded-[10px] p-4 flex items-center justify-between">
              <div>
                <span className="font-serif font-bold text-sm text-ink block">Same Age Group Trips Only</span>
                <span className="font-sans text-xs text-slate">Match only with travel companions in your age bucket ({ageGroup})</span>
              </div>
              <input
                type="checkbox"
                checked={sameAgeGroupOnly}
                onChange={(e) => setSameAgeGroupOnly(e.target.checked)}
                className="w-5 h-5 text-route rounded focus:ring-route cursor-pointer"
              />
            </div>

            {/* Preferred Travel Mode */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-2">Preferred Travel Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setPreferredMode('Mode A')}
                  className={`border rounded-[10px] p-3.5 cursor-pointer transition-all flex flex-col gap-1 ${
                    preferredMode === 'Mode A'
                      ? 'border-route bg-route/5 ring-1 ring-route'
                      : 'border-slate-light hover:border-route bg-paper/40'
                  }`}
                >
                  <div className="flex items-center justify-between font-serif font-bold text-sm text-ink">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-route" />
                      <span>Mode A (Admin-Led)</span>
                    </span>
                    {preferredMode === 'Mode A' && <Check className="w-4 h-4 text-route" />}
                  </div>
                  <p className="font-sans text-[11px] text-slate">Trip owner retains final authority for approvals.</p>
                </div>

                <div
                  onClick={() => setPreferredMode('Mode NA')}
                  className={`border rounded-[10px] p-3.5 cursor-pointer transition-all flex flex-col gap-1 ${
                    preferredMode === 'Mode NA'
                      ? 'border-route bg-route/5 ring-1 ring-route'
                      : 'border-slate-light hover:border-route bg-paper/40'
                  }`}
                >
                  <div className="flex items-center justify-between font-serif font-bold text-sm text-ink">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-route" />
                      <span>Mode NA (Consensus)</span>
                    </span>
                    {preferredMode === 'Mode NA' && <Check className="w-4 h-4 text-route" />}
                  </div>
                  <p className="font-sans text-[11px] text-slate">Collaborative consensus & democratic voting rounds.</p>
                </div>
              </div>
            </div>

            {/* Trip Type Preference: Solo vs Group vs Both */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-2">Trip Type Preference</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'solo', label: 'Solo Trips' },
                  { id: 'group', label: 'Group Trips' },
                  { id: 'both', label: 'Both' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTripTypePreference(item.id as any)}
                    className={`py-2 px-3 rounded-[8px] text-xs font-serif font-bold transition-all ${
                      tripTypePreference === item.id
                        ? 'bg-ink text-card shadow-xs'
                        : 'bg-paper border border-slate-light text-slate hover:border-ink'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Range & Max Daily Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-xs font-bold text-slate block mb-2">Budget Range</label>
                <select
                  value={budgetBand}
                  onChange={(e) => setBudgetBand(e.target.value)}
                  className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs font-sans text-ink outline-none focus:border-route min-h-[38px]"
                >
                  <option value="BUDGET">Budget ($)</option>
                  <option value="MID_RANGE">Mid-Range ($$)</option>
                  <option value="LUXURY">Luxury ($$$)</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-xs font-bold text-slate block mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-route" />
                  <span>Max Daily Budget (USD)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={maxDailyBudget}
                  onChange={(e) => setMaxDailyBudget(e.target.value)}
                  className="w-full bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-xs font-mono text-ink outline-none focus:border-route min-h-[38px]"
                />
              </div>
            </div>

            {/* Spoken Languages (BCP-47) */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-route" />
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
                <Heart className="w-3.5 h-3.5 text-route" />
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

            {/* Hashtags Section */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-route" />
                <span>Hashtags (Type tag & press Enter)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2 bg-paper border border-slate-light rounded-[8px] p-2 min-h-[42px]">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-route/10 text-route font-mono text-xs font-bold px-2.5 py-1 rounded-[6px] flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveHashtag(tag)}
                      className="hover:text-rose-600 font-bold ml-1 text-sm leading-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Add hashtag e.g. #sunset"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={handleAddHashtag}
                  className="bg-transparent border-none outline-none font-mono text-xs text-ink flex-1 min-w-[120px]"
                />
              </div>
            </div>

            {/* Additional Preferences Write-in Box */}
            <div>
              <label className="font-mono text-xs font-bold text-slate block mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-route" />
                <span>Further Preferences & Custom Requests</span>
              </label>
              <textarea
                value={furtherPreferences}
                onChange={(e) => setFurtherPreferences(e.target.value)}
                rows={3}
                placeholder="Write in any special dietary needs, accessibility preferences, quiet hours, or custom travel desires..."
                className="w-full bg-paper border border-slate-light rounded-[8px] p-3 text-xs font-sans text-ink outline-none focus:border-route resize-none"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-light">
              <Button type="submit" disabled={isSavingPrefs} className="text-xs py-2 px-5">
                {isSavingPrefs ? 'Saving Preferences...' : 'Save Travel Preferences'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </PageWrapper>
  )
}
