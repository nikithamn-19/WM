import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'

export interface UserProfileData {
  displayName: string
  age: number | string
  email: string
  homeCity: string
  bio: string
}

export interface UserFaceData {
  straightPhoto: string
  leftPhoto: string
  rightPhoto: string
  isRegistered: boolean
  updatedAt?: string
}

interface FaceUploadCardProps {
  title: string
  subtitle: string
  photoUrl: string
  onFileSelected: (dataUrl: string) => void
  onRemove: () => void
}

const FaceUploadCard: React.FC<FaceUploadCardProps> = ({
  title,
  subtitle,
  photoUrl,
  onFileSelected,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        onFileSelected(dataUrl)
      }
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col items-center justify-between border-2 border-dashed rounded-[12px] p-4 bg-paper min-h-[190px] text-center gap-3 transition-all border-slate-light hover:border-route">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-xs font-bold text-ink">{title}</span>
        <span className="text-[11px] font-sans text-slate">{subtitle}</span>
      </div>

      {photoUrl ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 rounded-[10px] overflow-hidden border-2 border-route shadow-2xs relative group">
            <img src={photoUrl} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-[10px] font-mono text-white font-bold">Replace</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-mono text-route hover:underline cursor-pointer"
            >
              Change
            </button>
            <span className="text-slate text-xs">•</span>
            <button
              type="button"
              onClick={onRemove}
              className="text-[11px] font-mono text-rose-600 hover:underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-route/5 rounded-[8px] py-4 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-slate-light/60 text-slate flex items-center justify-center text-lg">
            📷
          </div>
          <span className="text-xs font-mono font-medium text-route">+ Upload Photo</span>
          <span className="text-[10px] font-sans text-slate">Supports JPG, PNG</span>
        </div>
      )}
    </div>
  )
}

export interface TravelPreferencesData {
  ageGroupPreference: 'same_age' | 'all_ages'
  ageGroupLabel: string
  travelMode: 'mode_na' | 'mode_a' | 'both'
  tripType: 'group_only' | 'solo_matching' | 'both'
  budgetRange: 'budget' | 'mid' | 'luxury' | 'flexible'
  interests: string[]
  furtherPreferences: string
}

const DEFAULT_PROFILE: UserProfileData = {
  displayName: 'Nikitha',
  age: 24,
  email: 'nikitha@wandermatch.internal',
  homeCity: 'Bangalore, India',
  bio: 'Passionate wanderer exploring hidden coastlines, cultural trails, and mountain retreats. Believer in thoughtful group itineraries and slow travel.',
}

const DEFAULT_TRAVEL_PREFS: TravelPreferencesData = {
  ageGroupPreference: 'same_age',
  ageGroupLabel: 'Prefer same age group (20–30 years)',
  travelMode: 'mode_na',
  tripType: 'both',
  budgetRange: 'mid',
  interests: ['Beach Sunsets', 'Heritage Walks', 'Photography', 'Coastal Food', 'Road Trips', 'Local Cafes'],
  furtherPreferences:
    'Prefer vegetarian and coastal seafood options, scenic morning walks over late nights, boutique homestays or beach cabins, and budget around mid-range (₹₹).',
}

const DEFAULT_FACE_DATA: UserFaceData = {
  straightPhoto: '',
  leftPhoto: '',
  rightPhoto: '',
  isRegistered: false,
}

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuthContext()
  const { addToast } = useTripContext()

  // Active Category Tab: 'profile' | 'face' | 'preferences'
  const [activeCategory, setActiveCategory] = useState<'profile' | 'face' | 'preferences'>('profile')

  // Face Registration State
  const [faceData, setFaceData] = useState<UserFaceData>(() => {
    const saved = localStorage.getItem('wm_user_face_data')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Discard any dummy unsplash placeholder data from before
        if (
          parsed.straightPhoto?.includes('unsplash.com') ||
          parsed.leftPhoto?.includes('unsplash.com') ||
          parsed.rightPhoto?.includes('unsplash.com')
        ) {
          localStorage.removeItem('wm_user_face_data')
          return DEFAULT_FACE_DATA
        }
        return parsed
      } catch (e) {
        console.error('Error parsing face data from localStorage', e)
      }
    }
    return DEFAULT_FACE_DATA
  })

  const [isEditingFace, setIsEditingFace] = useState(false)
  const [faceForm, setFaceForm] = useState<UserFaceData>(faceData)

  // Profile State
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const saved = localStorage.getItem('wm_user_profile')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          displayName: parsed.displayName || DEFAULT_PROFILE.displayName,
          age: parsed.age || DEFAULT_PROFILE.age,
          email: parsed.email || DEFAULT_PROFILE.email,
          homeCity: parsed.homeCity || DEFAULT_PROFILE.homeCity,
          bio: parsed.bio || DEFAULT_PROFILE.bio,
        }
      } catch {
        // fallback
      }
    }
    return {
      ...DEFAULT_PROFILE,
      displayName: currentUser?.displayName || DEFAULT_PROFILE.displayName,
      email: currentUser?.email || DEFAULT_PROFILE.email,
    }
  })

  // Travel Preferences State (migrating interests if previously saved in profile)
  const [travelPrefs, setTravelPrefs] = useState<TravelPreferencesData>(() => {
    const saved = localStorage.getItem('wm_travel_preferences')
    let existingInterests = DEFAULT_TRAVEL_PREFS.interests

    // Check if user previously had interests stored in old profile
    const oldProfileSaved = localStorage.getItem('wm_user_profile')
    if (oldProfileSaved) {
      try {
        const oldP = JSON.parse(oldProfileSaved)
        if (Array.isArray(oldP.interests) && oldP.interests.length > 0) {
          existingInterests = oldP.interests
        }
      } catch {
        // ignore
      }
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          ...DEFAULT_TRAVEL_PREFS,
          ...parsed,
          interests: Array.isArray(parsed.interests) && parsed.interests.length > 0 ? parsed.interests : existingInterests,
          furtherPreferences: (parsed.furtherPreferences || DEFAULT_TRAVEL_PREFS.furtherPreferences)
            .replace(/\(\$\$\$\)/g, '(₹₹₹)')
            .replace(/\(\$\$\)/g, '(₹₹)')
            .replace(/\(\$\)/g, '(₹)'),
        }
      } catch {
        // fallback
      }
    }
    return {
      ...DEFAULT_TRAVEL_PREFS,
      interests: existingInterests,
    }
  })

  // Edit Modes
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState<UserProfileData>(profile)

  const [isEditingPrefs, setIsEditingPrefs] = useState(false)
  const [prefsForm, setPrefsForm] = useState<TravelPreferencesData>(travelPrefs)
  const [newTagInput, setNewTagInput] = useState('')

  // Sync edits when state changes
  useEffect(() => {
    setProfileForm(profile)
  }, [profile])

  useEffect(() => {
    setFaceForm(faceData)
  }, [faceData])

  useEffect(() => {
    setPrefsForm(travelPrefs)
  }, [travelPrefs])

  // Save Handlers
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfile(profileForm)
    localStorage.setItem('wm_user_profile', JSON.stringify(profileForm))
    setIsEditingProfile(false)
    addToast('Profile details updated successfully!', 'success')
  }

  const handleSaveFace = (e: React.FormEvent) => {
    e.preventDefault()

    if (!faceForm.straightPhoto || !faceForm.leftPhoto || !faceForm.rightPhoto) {
      addToast('Please provide all 3 profiles: front face, left profile, and right profile', 'conflict')
      return
    }

    const updatedData: UserFaceData = {
      ...faceForm,
      isRegistered: true,
      updatedAt: new Date().toISOString().split('T')[0],
    }

    setFaceData(updatedData)
    localStorage.setItem('wm_user_face_data', JSON.stringify(updatedData))
    setIsEditingFace(false)
    addToast('Face profiles registered and saved successfully!', 'success')
  }

  const handleSavePrefs = (e: React.FormEvent) => {
    e.preventDefault()
    setTravelPrefs(prefsForm)
    localStorage.setItem('wm_travel_preferences', JSON.stringify(prefsForm))
    setIsEditingPrefs(false)
    addToast('Travel preferences saved successfully!', 'success')
  }

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, '')
    if (trimmed && !prefsForm.interests.includes(trimmed)) {
      setPrefsForm({
        ...prefsForm,
        interests: [...prefsForm.interests, trimmed],
      })
      setNewTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setPrefsForm({
      ...prefsForm,
      interests: prefsForm.interests.filter((t) => t !== tagToRemove),
    })
  }

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to log out of your account?')) {
      addToast('Logged out successfully', 'info')
      navigate('/sign-in')
    }
  }

  return (
    <PageWrapper currentUser={currentUser}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-16">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-light gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-mono text-slate">
              <Link to="/trips" className="hover:text-route transition-colors">
                My Trips
              </Link>
              <span>/</span>
              <span className="text-ink font-semibold">User Account</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-ink">User Account</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="text-xs px-4 py-2 min-h-[36px] border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </Button>
          </div>
        </div>

        {/* User Summary Banner */}
        <div className="bg-card border border-slate-light rounded-[16px] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-route text-card font-mono text-2xl font-bold flex items-center justify-center shadow-sm">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-2xl font-bold text-ink">{profile.displayName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Active
                </span>
              </div>
              <p className="font-mono text-xs text-slate mt-0.5">
                {profile.email} • {profile.age} yrs • {profile.homeCity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-paper px-3 py-1.5 rounded-full border border-slate-light text-xs font-mono text-slate">
            <span>Account Status:</span>
            <span className="text-route font-semibold">Verified Member</span>
          </div>
        </div>

        {/* Category Navigation Tabs: Profile vs Register My Face vs Travel Preferences */}
        <div className="flex items-center border-b border-slate-light gap-6 sm:gap-8 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategory('profile')}
            className={`font-serif text-base font-bold pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'profile'
                ? 'border-route text-route'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('face')}
            className={`font-serif text-base font-bold pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'face'
                ? 'border-route text-route'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Register My Face
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('preferences')}
            className={`font-serif text-base font-bold pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'preferences'
                ? 'border-route text-route'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Travel Preferences
          </button>
        </div>

        {/* ======================================================== */}
        {/* CATEGORY 1: PROFILE SECTION                             */}
        {/* ======================================================== */}
        {activeCategory === 'profile' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-ink">Personal Profile Details</h3>
                <p className="font-sans text-xs text-slate mt-0.5">
                  Manage your personal information, description, and contact info.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingProfile(!isEditingProfile)
                  setProfileForm(profile)
                }}
                className="text-xs px-3.5 py-1.5 min-h-[36px]"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>

            {/* Read-Only Profile View */}
            {!isEditingProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Details Card */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-4">
                  <h4 className="font-serif text-base font-bold text-ink flex items-center gap-2 border-b border-slate-light/70 pb-2">
                    <svg className="w-4 h-4 text-route" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Personal Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                    <div className="flex flex-col gap-1 p-3 bg-paper rounded-lg border border-slate-light/60">
                      <span className="font-mono text-[10px] uppercase text-slate font-medium">Full Name</span>
                      <span className="font-semibold text-ink text-sm">{profile.displayName}</span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-paper rounded-lg border border-slate-light/60">
                      <span className="font-mono text-[10px] uppercase text-slate font-medium">Age</span>
                      <span className="font-semibold text-ink text-sm">{profile.age} years old</span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-paper rounded-lg border border-slate-light/60 col-span-2">
                      <span className="font-mono text-[10px] uppercase text-slate font-medium">Email Address</span>
                      <span className="font-semibold text-ink text-sm">{profile.email}</span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-paper rounded-lg border border-slate-light/60 col-span-2">
                      <span className="font-mono text-[10px] uppercase text-slate font-medium">Home Location</span>
                      <span className="font-semibold text-ink text-sm">{profile.homeCity}</span>
                    </div>
                  </div>
                </div>

                {/* About Me & Description Card */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-4">
                  <h4 className="font-serif text-base font-bold text-ink flex items-center gap-2 border-b border-slate-light/70 pb-2">
                    <svg className="w-4 h-4 text-route" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Description / About Me
                  </h4>

                  <div className="p-4 bg-paper rounded-lg border border-slate-light/60 flex-1 flex flex-col justify-between">
                    <p className="text-sm font-sans text-ink leading-relaxed">
                      "{profile.bio}"
                    </p>
                    <span className="font-mono text-[10px] text-slate mt-4 self-end">
                      Visible to travel group members &amp; solo matches
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable Profile Form */
              <form
                onSubmit={handleSaveProfile}
                className="bg-card border-2 border-route/40 rounded-[16px] p-6 sm:p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="border-b border-slate-light pb-3 flex items-center justify-between">
                  <h4 className="font-serif text-lg font-bold text-ink">Edit Profile Information</h4>
                  <span className="text-xs font-mono text-route font-semibold">Editing Mode Active</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-medium text-slate">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                      className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-medium text-slate">Age</label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                      className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-medium text-slate">Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-medium text-slate">Home Location / City</label>
                    <input
                      type="text"
                      value={profileForm.homeCity}
                      onChange={(e) => setProfileForm({ ...profileForm, homeCity: e.target.value })}
                      className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-mono font-medium text-slate">
                      Description / About Me
                    </label>
                    <textarea
                      rows={3}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      className="bg-paper border border-slate-light rounded-md px-3.5 py-2 text-sm text-ink focus:outline-none focus:border-route resize-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-light">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditingProfile(false)
                      setProfileForm(profile)
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs">
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* CATEGORY 2: REGISTER MY FACE SECTION                     */}
        {/* ======================================================== */}
        {activeCategory === 'face' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-ink">Register My Face</h3>
                <p className="font-sans text-xs text-slate mt-0.5">
                  Register your face profiles (front face, left profile, and right profile) for automatic trip photo matching.
                </p>
              </div>

              {!isEditingFace && (
                <Button
                  variant={faceData.isRegistered ? 'secondary' : 'primary'}
                  onClick={() => setIsEditingFace(true)}
                  className="text-xs self-start sm:self-auto cursor-pointer"
                >
                  {faceData.isRegistered ? 'Edit Face Profiles' : '+ Register Face Profiles'}
                </Button>
              )}
            </div>

            {!isEditingFace ? (
              /* Read-Only Face Profiles View */
              <div className="bg-card border border-slate-light rounded-[16px] p-6 sm:p-8 shadow-xs flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-slate-light/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        faceData.isRegistered ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    ></span>
                    <span className="font-serif text-base font-bold text-ink">
                      Active Face Biometric Profiles
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                      faceData.isRegistered
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {faceData.isRegistered ? 'Verified & Registered' : 'Not Registered'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Angle 1: Direct Front Face */}
                  <div className="flex flex-col items-center text-center p-4 bg-paper rounded-[12px] border border-slate-light/80 gap-3">
                    <span className="font-mono text-xs font-bold text-ink uppercase tracking-wide">
                      1. Front Face Profile
                    </span>
                    <div className="w-32 h-32 rounded-[12px] overflow-hidden border-2 border-route/30 relative bg-paper shadow-2xs">
                      {faceData.straightPhoto ? (
                        <img
                          src={faceData.straightPhoto}
                          alt="Front Face Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          onClick={() => setIsEditingFace(true)}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-route/5 text-slate transition-all p-2"
                          title="Click to register this photo"
                        >
                          <div className="w-11 h-11 rounded-full bg-slate-light/60 flex items-center justify-center text-slate">
                            <svg className="w-5 h-5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-mono text-slate font-medium">No face registered</span>
                        </div>
                      )}
                      {faceData.straightPhoto && (
                        <div className="absolute top-1.5 right-1.5 bg-route text-card rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-2xs">
                          ✓
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate">Straight Ahead View</span>
                  </div>

                  {/* Angle 2: Left Side Profile */}
                  <div className="flex flex-col items-center text-center p-4 bg-paper rounded-[12px] border border-slate-light/80 gap-3">
                    <span className="font-mono text-xs font-bold text-ink uppercase tracking-wide">
                      2. Left Side Profile
                    </span>
                    <div className="w-32 h-32 rounded-[12px] overflow-hidden border-2 border-route/30 relative bg-paper shadow-2xs">
                      {faceData.leftPhoto ? (
                        <img
                          src={faceData.leftPhoto}
                          alt="Left Side Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          onClick={() => setIsEditingFace(true)}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-route/5 text-slate transition-all p-2"
                          title="Click to register this photo"
                        >
                          <div className="w-11 h-11 rounded-full bg-slate-light/60 flex items-center justify-center text-slate">
                            <svg className="w-5 h-5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-mono text-slate font-medium">No face registered</span>
                        </div>
                      )}
                      {faceData.leftPhoto && (
                        <div className="absolute top-1.5 right-1.5 bg-route text-card rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-2xs">
                          ✓
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate">Left Angle (45°–90°)</span>
                  </div>

                  {/* Angle 3: Right Side Profile */}
                  <div className="flex flex-col items-center text-center p-4 bg-paper rounded-[12px] border border-slate-light/80 gap-3">
                    <span className="font-mono text-xs font-bold text-ink uppercase tracking-wide">
                      3. Right Side Profile
                    </span>
                    <div className="w-32 h-32 rounded-[12px] overflow-hidden border-2 border-route/30 relative bg-paper shadow-2xs">
                      {faceData.rightPhoto ? (
                        <img
                          src={faceData.rightPhoto}
                          alt="Right Side Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          onClick={() => setIsEditingFace(true)}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-route/5 text-slate transition-all p-2"
                          title="Click to register this photo"
                        >
                          <div className="w-11 h-11 rounded-full bg-slate-light/60 flex items-center justify-center text-slate">
                            <svg className="w-5 h-5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-mono text-slate font-medium">No face registered</span>
                        </div>
                      )}
                      {faceData.rightPhoto && (
                        <div className="absolute top-1.5 right-1.5 bg-route text-card rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-2xs">
                          ✓
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate">Right Angle (45°–90°)</span>
                  </div>
                </div>

                <div className="p-4 bg-paper rounded-[10px] border border-slate-light/70 flex items-start gap-3 text-xs font-sans text-slate">
                  <span className="text-route text-base mt-0.5">ℹ️</span>
                  <div className="flex flex-col gap-0.5">
                    <strong className="text-ink font-semibold">How WanderMatch uses your registered face:</strong>
                    <span>
                      These 3 perspective angles allow WanderMatch’s engine to detect your photos across group trip albums and automatically organize them under <em>My Photos</em> in Memories.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable Face Registration Form */
              <form
                onSubmit={handleSaveFace}
                className="bg-card border-2 border-route/40 rounded-[16px] p-6 sm:p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="border-b border-slate-light pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-serif text-lg font-bold text-ink">
                      Upload Face Angles &amp; Register
                    </h4>
                    <p className="font-sans text-xs text-slate mt-0.5">
                      Please upload or capture all 3 angles: front face, left profile, and right profile.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-route font-semibold">Editing Mode Active</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Front Face Capture */}
                  <FaceUploadCard
                    title="1. Front Face"
                    subtitle="Direct forward view, clear lighting"
                    photoUrl={faceForm.straightPhoto}
                    onFileSelected={(dataUrl) => setFaceForm((prev) => ({ ...prev, straightPhoto: dataUrl }))}
                    onRemove={() => setFaceForm((prev) => ({ ...prev, straightPhoto: '' }))}
                  />

                  {/* Left Side Profile Capture */}
                  <FaceUploadCard
                    title="2. Left Profile"
                    subtitle="Turn head 45° to 90° left"
                    photoUrl={faceForm.leftPhoto}
                    onFileSelected={(dataUrl) => setFaceForm((prev) => ({ ...prev, leftPhoto: dataUrl }))}
                    onRemove={() => setFaceForm((prev) => ({ ...prev, leftPhoto: '' }))}
                  />

                  {/* Right Side Profile Capture */}
                  <FaceUploadCard
                    title="3. Right Profile"
                    subtitle="Turn head 45° to 90° right"
                    photoUrl={faceForm.rightPhoto}
                    onFileSelected={(dataUrl) => setFaceForm((prev) => ({ ...prev, rightPhoto: dataUrl }))}
                    onRemove={() => setFaceForm((prev) => ({ ...prev, rightPhoto: '' }))}
                  />
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-light">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFaceForm(faceData)
                      setIsEditingFace(false)
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs">
                    Save &amp; Register Face
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* CATEGORY 3: TRAVEL PREFERENCES SECTION                  */}
        {/* ======================================================== */}
        {activeCategory === 'preferences' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-ink">Travel Preferences</h3>
                <p className="font-sans text-xs text-slate mt-0.5">
                  Configure your preferred age group, travel mode, trip type, budget range, interests, and special notes.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingPrefs(!isEditingPrefs)
                  setPrefsForm(travelPrefs)
                }}
                className="text-xs px-3.5 py-1.5 min-h-[36px]"
              >
                {isEditingPrefs ? 'Cancel' : 'Edit Travel Preferences'}
              </Button>
            </div>

            {/* Read-Only Travel Preferences View */}
            {!isEditingPrefs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* • Age Group Preference */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-route"></span>
                      Same Age Group Matching
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-route/10 text-route border border-route/20">
                      {travelPrefs.ageGroupPreference === 'same_age' ? 'Same Age Group' : 'All Ages'}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-ink">
                    {travelPrefs.ageGroupPreference === 'same_age'
                      ? 'Prefer Same Age Group (20–30 Years)'
                      : 'Open to All Age Groups'}
                  </h4>
                  <p className="font-sans text-xs text-slate leading-relaxed">
                    {travelPrefs.ageGroupPreference === 'same_age'
                      ? 'Matched with travelers in a similar peer age bracket for shared lifestyle pace and energy.'
                      : 'Open to travel across multi-generational groups with diverse age brackets.'}
                  </p>
                </div>

                {/* • Travel Mode */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Travel Mode (Decision Style)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                      {travelPrefs.travelMode === 'mode_na'
                        ? 'Non-Admin (Mode NA)'
                        : travelPrefs.travelMode === 'mode_a'
                        ? 'Admin-Led (Mode A)'
                        : 'Open to Both'}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-ink">
                    {travelPrefs.travelMode === 'mode_na'
                      ? 'Non-Admin / Collaborative (Mode NA)'
                      : travelPrefs.travelMode === 'mode_a'
                      ? 'Admin-Led / Guided (Mode A)'
                      : 'Flexible (Both Modes)'}
                  </h4>
                  <p className="font-sans text-xs text-slate leading-relaxed">
                    {travelPrefs.travelMode === 'mode_na'
                      ? 'Decisions on itinerary slots and changes are resolved democratically by group vote and branch merges.'
                      : travelPrefs.travelMode === 'mode_a'
                      ? 'A designated trip organizer/admin leads the itinerary approvals and logistical coordination.'
                      : 'Open to both democratic voting trips and dedicated leader-guided adventures.'}
                  </p>
                </div>

                {/* • Solo or Group Trips */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Solo or Group Trips
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-900 border border-blue-300">
                      {travelPrefs.tripType === 'both'
                        ? 'Both Solo & Group'
                        : travelPrefs.tripType === 'group_only'
                        ? 'Group Trips Only'
                        : 'Solo Matching'}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-ink">
                    {travelPrefs.tripType === 'both'
                      ? 'Both Solo & Group Trips'
                      : travelPrefs.tripType === 'group_only'
                      ? 'Group Trips Only'
                      : 'Solo Trips with Buddy Matching'}
                  </h4>
                  <p className="font-sans text-xs text-slate leading-relaxed">
                    {travelPrefs.tripType === 'both'
                      ? 'Participate in pre-planned multi-traveler group getaways and discover 1-on-1 solo travel companions.'
                      : travelPrefs.tripType === 'group_only'
                      ? 'Focus strictly on full group vacation itineraries with 3 to 8 members.'
                      : 'Match with another solo traveler heading to the same destination.'}
                  </p>
                </div>

                {/* • Budget Range */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Budget Range
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {travelPrefs.budgetRange === 'budget'
                        ? 'Budget (₹)'
                        : travelPrefs.budgetRange === 'mid'
                        ? 'Mid-Range (₹₹)'
                        : travelPrefs.budgetRange === 'luxury'
                        ? 'Luxury (₹₹₹)'
                        : 'Flexible'}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-ink">
                    {travelPrefs.budgetRange === 'budget'
                      ? 'Budget (₹1,500–₹4,000 / day)'
                      : travelPrefs.budgetRange === 'mid'
                      ? 'Mid-Range (₹4,000–₹12,000 / day)'
                      : travelPrefs.budgetRange === 'luxury'
                      ? 'Luxury (₹12,000+ / day)'
                      : 'Flexible / Destination-dependent'}
                  </h4>
                  <p className="font-sans text-xs text-slate leading-relaxed">
                    {travelPrefs.budgetRange === 'budget'
                      ? 'Cost-conscious travel, hostels & cozy homestays, public transit, and delicious local street food.'
                      : travelPrefs.budgetRange === 'mid'
                      ? 'Balanced comfort with boutique hotels or beach cabins, cozy cafes, and occasional guided experiences.'
                      : travelPrefs.budgetRange === 'luxury'
                      ? 'Premium resorts, fine dining, private transportation, and seamless high-end travel experiences.'
                      : 'Adaptable budget depending on group consensus, trip duration, and destination offerings.'}
                  </p>
                </div>

                {/* • Interests and Hash Tags */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-4 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-light/70 pb-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                      Interests and Hash Tags
                    </span>
                    <span className="text-xs font-mono text-slate">
                      {travelPrefs.interests.length} topics selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {travelPrefs.interests.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-full bg-paper border border-slate-light text-xs font-mono font-medium text-ink flex items-center gap-1 shadow-2xs hover:border-route transition-all"
                      >
                        <span className="text-route font-bold">#</span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* • Further Preferences Box */}
                <div className="bg-card border border-slate-light rounded-[14px] p-6 shadow-xs flex flex-col gap-3 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-light/70 pb-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-slate font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-route"></span>
                      Further Preferences &amp; Special Notes
                    </span>
                    <span className="text-xs font-mono text-slate">Custom traveler notes</span>
                  </div>

                  <div className="p-4 bg-paper rounded-lg border border-slate-light/60">
                    <p className="text-sm font-sans text-ink leading-relaxed">
                      {travelPrefs.furtherPreferences || 'No additional custom preferences specified yet.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable Travel Preferences Form */
              <form
                onSubmit={handleSavePrefs}
                className="bg-card border-2 border-route/40 rounded-[16px] p-6 sm:p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="border-b border-slate-light pb-3 flex items-center justify-between">
                  <h4 className="font-serif text-lg font-bold text-ink">Edit Travel Preferences</h4>
                  <span className="text-xs font-mono text-route font-semibold">Editing Mode Active</span>
                </div>

                {/* • Same Age Group Option */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono font-semibold text-slate uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-route"></span>
                    Same Age Group Matching
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.ageGroupPreference === 'same_age'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ageGroup"
                        checked={prefsForm.ageGroupPreference === 'same_age'}
                        onChange={() =>
                          setPrefsForm({
                            ...prefsForm,
                            ageGroupPreference: 'same_age',
                            ageGroupLabel: 'Prefer same age group (20–30 years)',
                          })
                        }
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Prefer Same Age Group</span>
                        <span className="text-slate mt-0.5">Match primarily with travelers in peer age bracket (e.g. 20–30 yrs).</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.ageGroupPreference === 'all_ages'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ageGroup"
                        checked={prefsForm.ageGroupPreference === 'all_ages'}
                        onChange={() =>
                          setPrefsForm({
                            ...prefsForm,
                            ageGroupPreference: 'all_ages',
                            ageGroupLabel: 'Open to all age groups',
                          })
                        }
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Open to All Age Groups</span>
                        <span className="text-slate mt-0.5">No age restriction; excited to explore with any fellow travel enthusiast.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* • Travel Mode: Admin-Led vs Non-Admin */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono font-semibold text-slate uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Travel Mode (Decision Style)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.travelMode === 'mode_na'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="travelMode"
                        checked={prefsForm.travelMode === 'mode_na'}
                        onChange={() => setPrefsForm({ ...prefsForm, travelMode: 'mode_na' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Non-Admin (Mode NA)</span>
                        <span className="text-slate mt-0.5">Democratic proposal debate &amp; voting by all members.</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.travelMode === 'mode_a'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="travelMode"
                        checked={prefsForm.travelMode === 'mode_a'}
                        onChange={() => setPrefsForm({ ...prefsForm, travelMode: 'mode_a' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Admin-Led (Mode A)</span>
                        <span className="text-slate mt-0.5">Single organizer coordinates bookings &amp; approvals.</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.travelMode === 'both'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="travelMode"
                        checked={prefsForm.travelMode === 'both'}
                        onChange={() => setPrefsForm({ ...prefsForm, travelMode: 'both' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Open to Both</span>
                        <span className="text-slate mt-0.5">Comfortable participating in either format.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* • Solo or Group Trips */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono font-semibold text-slate uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Solo or Group Trips
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.tripType === 'group_only'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tripType"
                        checked={prefsForm.tripType === 'group_only'}
                        onChange={() => setPrefsForm({ ...prefsForm, tripType: 'group_only' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Group Trips Only</span>
                        <span className="text-slate mt-0.5">Multi-person travel parties (3–8 people).</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.tripType === 'solo_matching'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tripType"
                        checked={prefsForm.tripType === 'solo_matching'}
                        onChange={() => setPrefsForm({ ...prefsForm, tripType: 'solo_matching' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Solo Matching</span>
                        <span className="text-slate mt-0.5">Finding 1-on-1 travel companions for solo explorations.</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.tripType === 'both'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tripType"
                        checked={prefsForm.tripType === 'both'}
                        onChange={() => setPrefsForm({ ...prefsForm, tripType: 'both' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Both Solo &amp; Group</span>
                        <span className="text-slate mt-0.5">Interested in both group journeys and solo companion matches.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* • Budget Range (New Question) */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono font-semibold text-slate uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Budget Range
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.budgetRange === 'budget'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="budgetRange"
                        checked={prefsForm.budgetRange === 'budget'}
                        onChange={() => setPrefsForm({ ...prefsForm, budgetRange: 'budget' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Budget (₹)</span>
                        <span className="text-slate mt-0.5">₹1,500–₹4,000/day. Hostels &amp; public transit.</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.budgetRange === 'mid'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="budgetRange"
                        checked={prefsForm.budgetRange === 'mid'}
                        onChange={() => setPrefsForm({ ...prefsForm, budgetRange: 'mid' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Mid-Range (₹₹)</span>
                        <span className="text-slate mt-0.5">₹4,000–₹12,000/day. Cozy stays &amp; cafes.</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.budgetRange === 'luxury'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="budgetRange"
                        checked={prefsForm.budgetRange === 'luxury'}
                        onChange={() => setPrefsForm({ ...prefsForm, budgetRange: 'luxury' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Luxury (₹₹₹)</span>
                        <span className="text-slate mt-0.5">₹12,000+/day. Premium resorts &amp; private tours.</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        prefsForm.budgetRange === 'flexible'
                          ? 'border-route bg-route/5 ring-1 ring-route'
                          : 'border-slate-light bg-paper hover:border-slate'
                      }`}
                    >
                      <input
                        type="radio"
                        name="budgetRange"
                        checked={prefsForm.budgetRange === 'flexible'}
                        onChange={() => setPrefsForm({ ...prefsForm, budgetRange: 'flexible' })}
                        className="mt-0.5 text-route focus:ring-route"
                      />
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-ink">Flexible</span>
                        <span className="text-slate mt-0.5">Adaptable to the trip and destination.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* • Interests & Hashtags (Moved to Travel Preferences) */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-mono font-semibold text-slate uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    Interests and Hash Tags (Click cross to remove or add below)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-paper rounded-lg border border-slate-light min-h-[46px]">
                    {prefsForm.interests.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-card border border-slate-light text-xs font-mono text-ink flex items-center gap-1.5"
                      >
                        <span className="text-route font-bold">#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-slate hover:text-red-600 font-bold ml-0.5"
                          title="Remove tag"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add new interest (e.g. ScubaDiving, Trekking, FoodTours)"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      className="flex-1 bg-paper border border-slate-light rounded-md px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-route"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddTag}
                      className="text-xs px-3 py-1.5"
                    >
                      + Add Tag
                    </Button>
                  </div>
                </div>

                {/* • Additional Box for Further Preferences */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono font-semibold text-slate uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-route"></span>
                    Further Preferences &amp; Special Notes
                  </label>
                  <textarea
                    rows={4}
                    value={prefsForm.furtherPreferences}
                    onChange={(e) => setPrefsForm({ ...prefsForm, furtherPreferences: e.target.value })}
                    placeholder="Write in any further preferences (e.g. dietary restrictions, morning vs night person, budget expectations, stay types, transport preferences, pets, etc.)..."
                    className="bg-paper border border-slate-light rounded-md px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-route resize-none"
                  />
                  <span className="font-mono text-[11px] text-slate">
                    This note is shared with matching algorithms and potential group members.
                  </span>
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-light">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditingPrefs(false)
                      setPrefsForm(travelPrefs)
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs">
                    Save Travel Preferences
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
