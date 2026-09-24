import React, { useState } from 'react'
import { SignUp, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FaceRegistration } from '../components/face/FaceRegistration'
import { updateAuthPreferences } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import { Check } from 'lucide-react'

const LANGUAGES = [
  'English',
  'Hindi',
  'Kannada',
  'Tamil',
  'Telugu',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Japanese',
]

const INTERESTS = [
  'Heritage',
  'Food',
  'Trekking',
  'Wildlife',
  'Photography',
  'Religious',
  'Shopping',
  'Accessibility',
]

const PACES = ['relaxed', 'moderate', 'fast']

export const SignUpScreen: React.FC = () => {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const { getToken } = useAuthContext()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Step 2 state
  const [age, setAge] = useState<number>(27)
  const [pace, setPace] = useState<string>('moderate')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English'])
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Food', 'Trekking'])
  const [computedAgeGroup, setComputedAgeGroup] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await updateAuthPreferences(
        {
          age: Number(age),
          languages: selectedLanguages,
          interests: selectedInterests,
          pace,
        },
        getToken
      )
      if (res?.ageGroup) {
        setComputedAgeGroup(res.ageGroup)
      }
      // Brief timeout to display computed age group confirmation before advancing
      setTimeout(() => {
        setStep(3)
      }, 1200)
    } catch (err) {
      // Advance even if mock or auth fails in dev
      setStep(3)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = () => {
    navigate('/trips')
  }

  return (
    <PageWrapper>
      <TopNav />
      <div className="flex flex-col items-center justify-center p-6 min-h-[calc(100vh-65px)] bg-paper">
        <div className="w-full max-w-xl">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8 font-mono text-xs text-slate">
            <span className={`px-2.5 py-1 rounded ${step === 1 ? 'bg-route text-card font-bold' : 'bg-slate-light/40'}`}>
              1. Account
            </span>
            <span>&rarr;</span>
            <span className={`px-2.5 py-1 rounded ${step === 2 ? 'bg-route text-card font-bold' : 'bg-slate-light/40'}`}>
              2. Preferences
            </span>
            <span>&rarr;</span>
            <span className={`px-2.5 py-1 rounded ${step === 3 ? 'bg-route text-card font-bold' : 'bg-slate-light/40'}`}>
              3. Face ID (Optional)
            </span>
          </div>

          {/* Step 1: Clerk Auth / Quick Pass */}
          {step === 1 && (
            <div className="flex flex-col items-center gap-6">
              {isSignedIn ? (
                <div className="bg-card border border-slate-light p-6 rounded-[10px] text-center flex flex-col gap-4 w-full">
                  <h3 className="font-serif text-xl font-bold text-ink">Account Created!</h3>
                  <p className="font-sans text-sm text-slate">
                    Now let's customize your travel profile preferences.
                  </p>
                  <Button onClick={() => setStep(2)}>Continue to Preferences &rarr;</Button>
                </div>
              ) : (
                <div className="w-full bg-card border border-slate-light p-6 rounded-[10px] shadow-sm flex flex-col gap-4">
                  <h3 className="font-serif text-2xl font-bold text-ink text-center">
                    Create Your Account
                  </h3>

                  <div className="flex justify-center my-2">
                    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-light"></div>
                    <span className="flex-shrink mx-4 text-xs font-mono text-slate">OR QUICK PASS</span>
                    <div className="flex-grow border-t border-slate-light"></div>
                  </div>

                  <form onSubmit={handleStep1Submit} className="flex flex-col gap-4">
                    <Input
                      label="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Chen"
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      required
                    />
                    <Button type="submit">Continue &rarr;</Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preferences Form */}
          {step === 2 && (
            <form
              onSubmit={handleStep2Submit}
              className="bg-card border border-slate-light p-6 rounded-[10px] shadow-sm flex flex-col gap-5"
            >
              <div className="text-center">
                <h3 className="font-serif text-2xl font-bold text-ink">Travel Preferences</h3>
                <p className="font-sans text-sm text-slate mt-1">
                  Help WanderMatch find compatible trips and group members
                </p>
              </div>

              {/* Age Input */}
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Your Age"
                  type="number"
                  min={18}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  required
                />
                {computedAgeGroup && (
                  <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md self-start flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Your age group: {computedAgeGroup}
                  </span>
                )}
              </div>

              {/* Pace Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold uppercase text-slate">
                  Travel Pace
                </label>
                <div className="flex gap-2">
                  {PACES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPace(p)}
                      className={`flex-1 py-2 rounded-[8px] text-xs font-mono capitalize transition-all ${
                        pace === p
                          ? 'bg-route text-card font-bold shadow-xs'
                          : 'bg-paper border border-slate-light text-ink hover:border-slate'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages Multi-Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold uppercase text-slate">
                  Languages Spoken
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang)
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all min-h-[32px] flex items-center gap-1 ${
                          isSelected
                            ? 'bg-route text-card font-medium shadow-xs'
                            : 'bg-paper border border-slate-light text-slate hover:text-ink hover:border-slate'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {lang}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Interests Multi-Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold uppercase text-slate">
                  Travel Interests
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => {
                    const isSelected = selectedInterests.includes(interest)
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all min-h-[32px] flex items-center gap-1 ${
                          isSelected
                            ? 'bg-route text-card font-medium shadow-xs'
                            : 'bg-paper border border-slate-light text-slate hover:text-ink hover:border-slate'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {interest}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleFinish}
                  className="flex-1 py-2.5"
                >
                  Skip &amp; Go to Trips
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1 py-2.5">
                  {submitting ? 'Saving...' : 'Save & Continue →'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Optional Face Registration */}
          {step === 3 && (
            <FaceRegistration
              onComplete={handleFinish}
              onSkip={handleFinish}
            />
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
