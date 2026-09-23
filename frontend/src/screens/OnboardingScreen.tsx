import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { FaceCapture } from '../components/face/FaceCapture'
import { useTripContext } from '../context/TripContext'

export const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { addToast } = useTripContext()

  // Step 1: Details
  const [fullName, setFullName] = useState('Jane Doe')
  const [email, setEmail] = useState('jane@example.com')
  const [password, setPassword] = useState('••••••••')

  // Step 2: Travel Style
  const [age, setAge] = useState('25')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English'])
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([
    'Relaxed',
    'Fun',
    'Beach',
  ])

  // Step 3: Identity
  const [straightPhoto, setStraightPhoto] = useState<File | null>(null)
  const [leftPhoto, setLeftPhoto] = useState<File | null>(null)
  const [rightPhoto, setRightPhoto] = useState<File | null>(null)

  const availableLanguages = ['English', 'Spanish', 'French', 'Japanese', 'Mandarin', 'Hindi']
  const availablePreferences = [
    'Relaxed',
    'Spiritual',
    'Calm',
    'Fun',
    'Adventurous',
    'Trekking',
    'Beach',
    'Heritage',
    'Foodie',
  ]

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  const togglePreference = (pref: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    )
  }

  const handleRegisterFaceAndComplete = () => {
    addToast('Travel style & face profile saved!', 'success')
    navigate('/trips')
  }

  const handleSkipFaceAndComplete = () => {
    addToast('Onboarding completed!', 'info')
    navigate('/trips')
  }

  return (
    <PageWrapper hideSidebar>
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4 py-8">
        <div className="w-full max-w-xl bg-card border border-slate-light rounded-[12px] p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          {/* Header */}
          <div className="text-center flex flex-col gap-1">
            <h1 className="font-serif text-3xl font-bold text-route">WanderMatch</h1>
            <p className="font-sans text-sm text-slate">Begin your journey.</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
            {/* 1. Your Details */}
            <div className="flex flex-col gap-3 pb-4 border-b border-slate-light">
              <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-route text-card font-mono text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>Your Details</span>
              </h3>

              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* 2. Travel Style */}
            <div className="flex flex-col gap-4 pb-4 border-b border-slate-light">
              <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-route text-card font-mono text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Travel Style</span>
              </h3>

              <div className="w-32">
                <Input
                  label="Age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              {/* Languages Spoken */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate font-sans">
                  Languages Spoken
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang)
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                          isSelected
                            ? 'bg-ink text-card font-bold'
                            : 'bg-paper text-slate border border-slate-light hover:text-ink'
                        }`}
                      >
                        {lang}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preferences */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate font-sans">
                  Preferences
                </label>
                <div className="flex flex-wrap gap-2">
                  {availablePreferences.map((pref) => {
                    const isSelected = selectedPreferences.includes(pref)
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => togglePreference(pref)}
                        className={`px-3.5 py-1.5 rounded-[8px] text-xs font-sans font-medium transition-all ${
                          isSelected
                            ? 'bg-ink text-card font-bold shadow-xs'
                            : 'bg-paper text-slate border border-slate-light hover:text-ink'
                        }`}
                      >
                        {pref}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 3. Identity (Optional) */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-route text-card font-mono text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>Identity (Optional)</span>
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  Beta
                </span>
              </div>

              <p className="text-xs font-sans text-slate">
                Register your face for faster check-ins at partner hostels and secure group photo verification. This step is strictly optional.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <FaceCapture
                  label="Straight"
                  selectedFile={straightPhoto}
                  onFileSelect={setStraightPhoto}
                />
                <FaceCapture
                  label="Left"
                  selectedFile={leftPhoto}
                  onFileSelect={setLeftPhoto}
                />
                <FaceCapture
                  label="Right"
                  selectedFile={rightPhoto}
                  onFileSelect={setRightPhoto}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleRegisterFaceAndComplete}
                  className="flex-1 py-2.5"
                >
                  Register my face
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSkipFaceAndComplete}
                  className="flex-1 py-2.5"
                >
                  Skip for now
                </Button>
              </div>
            </div>

            <div className="text-center pt-2 text-xs font-sans text-slate">
              Already have an account?{' '}
              <Link to="/sign-in" className="text-route font-bold hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  )
}
