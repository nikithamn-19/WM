import React, { useState } from 'react'
import { SignUp, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FaceRegistration } from '../components/face/FaceRegistration'

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

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+']

export const SignUpScreen: React.FC = () => {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 mock state (if Clerk is offline/placeholder)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Step 2 state
  const [ageGroup, setAgeGroup] = useState('25-34')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English'])
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Food', 'Trekking'])

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

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(3)
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
            <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-route text-card font-bold' : 'bg-slate-light/40'}`}>
              1. Account
            </span>
            <span>&rarr;</span>
            <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-route text-card font-bold' : 'bg-slate-light/40'}`}>
              2. Preferences
            </span>
            <span>&rarr;</span>
            <span className={`px-2 py-1 rounded ${step === 3 ? 'bg-route text-card font-bold' : 'bg-slate-light/40'}`}>
              3. Face ID (Optional)
            </span>
          </div>

          {/* Step 1: Clerk Auth / Fallback Signup */}
          {step === 1 && (
            <div className="flex flex-col items-center gap-6">
              {isSignedIn ? (
                <div className="bg-card border border-slate-light p-6 rounded-[10px] text-center flex flex-col gap-4">
                  <h3 className="font-serif text-xl font-bold text-ink">Account Created!</h3>
                  <p className="font-sans text-sm text-slate">
                    Now let's customize your travel profile.
                  </p>
                  <Button onClick={() => setStep(2)}>Continue to Preferences &rarr;</Button>
                </div>
              ) : (
                <div className="w-full bg-card border border-slate-light p-6 rounded-[10px] shadow-sm flex flex-col gap-4">
                  <h3 className="font-serif text-2xl font-bold text-ink text-center">
                    Create Your Account
                  </h3>

                  {/* Standard Clerk component container */}
                  <div className="flex justify-center my-2">
                    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-light"></div>
                    <span className="flex-shrink mx-4 text-xs font-mono text-slate">OR DEV QUICK PASS</span>
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
              className="bg-card border border-slate-light p-6 rounded-[10px] shadow-sm flex flex-col gap-6"
            >
              <div className="text-center">
                <h3 className="font-serif text-2xl font-bold text-ink">Travel Preferences</h3>
                <p className="font-sans text-sm text-slate mt-1">
                  Help AI Concierge understand your group travel style
                </p>
              </div>

              {/* Age Group Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-semibold uppercase text-slate">
                  Age Group
                </label>
                <div className="flex flex-wrap gap-2">
                  {AGE_GROUPS.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setAgeGroup(group)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-mono transition-all min-h-[36px] ${
                        ageGroup === group
                          ? 'bg-route text-card font-bold shadow-sm'
                          : 'bg-paper border border-slate-light text-ink hover:border-slate'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages Multi-Select Chips */}
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
                        className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all min-h-[36px] ${
                          isSelected
                            ? 'bg-route text-card font-medium shadow-sm'
                            : 'bg-paper border border-slate-light text-slate hover:text-ink hover:border-slate'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{lang}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Interests Multi-Select Chips */}
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
                        className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all min-h-[36px] ${
                          isSelected
                            ? 'bg-route text-card font-medium shadow-sm'
                            : 'bg-paper border border-slate-light text-slate hover:text-ink hover:border-slate'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{interest}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button type="submit" className="mt-2 py-3">
                Continue to Face ID &rarr;
              </Button>
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
