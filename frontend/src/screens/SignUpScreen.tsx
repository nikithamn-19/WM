import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSignUp } from '@clerk/clerk-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FaceRegistration } from '../components/face/FaceRegistration'
import { registerUser } from '../lib/api'
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
  const { currentUser, signInLocal } = useAuthContext()
  const isSignedIn = Boolean(currentUser)

  let signUp: any = null
  let isSignUpLoaded = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const clerkSignUp = useSignUp()
    signUp = clerkSignUp.signUp
    isSignUpLoaded = clerkSignUp.isLoaded
  } catch {
    // Fallback if Clerk context is inactive
  }

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2 state
  const [age, setAge] = useState<number>(27)
  const [pace, setPace] = useState<string>('moderate')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English'])
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Food', 'Trekking'])
  const [computedAgeGroup, setComputedAgeGroup] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

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

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await registerUser({
        displayName: name || 'Wanderer',
        email: email || 'user@example.com',
      })
      if (res?.usrId) {
        setActiveUserId(res.usrId)
        await signInLocal(res.usrId)
      }
    } catch (err) {
      console.warn('Dev register step 1 fallback:', err)
    }
    setStep(2)
  }

  const handleGoogleSignUp = async () => {
    if (isSignUpLoaded && signUp) {
      try {
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/onboarding',
        })
        return
      } catch (err) {
        console.warn('Clerk OAuth sign up error:', err)
      }
    }

    const cleanEmail = email.trim().toLowerCase() || `google_${Date.now()}@example.com`
    const cleanName = name.trim() || 'Google Wanderer'
    try {
      const res = await registerUser({
        displayName: cleanName,
        email: cleanEmail,
      })
      if (res?.usrId) {
        setActiveUserId(res.usrId)
        await signInLocal(res.usrId)
      }
    } catch (err) {
      console.warn('Google sign up fallback:', err)
    }
    setStep(2)
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await registerUser({
        displayName: name || 'Wanderer',
        email: email || 'user@example.com',
        age: Number(age),
        languages: selectedLanguages,
        interests: selectedInterests,
        pace,
      })
      if (res?.usrId) {
        setActiveUserId(res.usrId)
        await signInLocal(res.usrId)
      }
      if (res?.ageGroup) {
        setComputedAgeGroup(res.ageGroup)
      }
      setTimeout(() => {
        setStep(3)
      }, 1000)
    } catch (err) {
      setStep(3)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = async () => {
    if (activeUserId) {
      await signInLocal(activeUserId)
    } else {
      const cleanEmail = email.trim().toLowerCase() || `user_${Date.now()}@example.com`
      const cleanName = name.trim() || 'New Wanderer'
      const res = await registerUser({
        displayName: cleanName,
        email: cleanEmail,
        age: Number(age) || 25,
        languages: selectedLanguages,
        interests: selectedInterests,
        pace,
      })
      if (res?.usrId) {
        await signInLocal(res.usrId)
      }
    }
    navigate('/trips')
  }



  return (
    <PageWrapper>
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

          {/* Step 1: Account Creation Form */}
          {step === 1 && (
            <div className="flex flex-col items-center gap-6">
              {isSignedIn ? (
                <div className="bg-card border border-slate-light p-6 rounded-[10px] text-center flex flex-col gap-4 w-full">
                  <h3 className="font-serif text-xl font-bold text-ink">Account Active!</h3>
                  <p className="font-sans text-sm text-slate">
                    Now let's customize your travel profile preferences.
                  </p>
                  <Button onClick={() => setStep(2)}>Continue to Preferences &rarr;</Button>
                </div>
              ) : (
                <div className="w-full bg-card border border-slate-light p-6 rounded-[10px] shadow-sm flex flex-col gap-4">
                  <div className="text-center flex flex-col gap-1">
                    <h3 className="font-serif text-2xl font-bold text-ink">
                      Create Your Account
                    </h3>
                    <p className="font-sans text-xs text-slate">
                      Sign up to start matching with travel companions &amp; trips.
                    </p>
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-paper border border-slate-light hover:border-route rounded-[10px] text-xs font-sans font-medium text-ink transition-all min-h-[44px] mt-1"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign up with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center my-1">
                    <div className="flex-grow border-t border-slate-light"></div>
                    <span className="flex-shrink mx-4 text-xs font-mono text-slate">OR EMAIL</span>
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
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate font-sans">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-paper border border-slate-light rounded-[8px] px-3.5 py-2.5 text-sm text-ink outline-none focus:border-route transition-all"
                        required
                      />
                    </div>
                    <Button type="submit" className="py-3 font-semibold mt-1">
                      Continue to Preferences &rarr;
                    </Button>
                  </form>

                  <div className="text-center text-xs font-sans text-slate pt-3 border-t border-slate-light">
                    Already have an account?{' '}
                    <Link to="/sign-in" className="text-route font-bold hover:underline">
                      Log In Here
                    </Link>
                  </div>
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
