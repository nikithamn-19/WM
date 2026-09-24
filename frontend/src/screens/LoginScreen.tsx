import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSignIn } from '@clerk/clerk-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuthContext } from '../context/AuthContext'
import { loginUser } from '../lib/api'

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate()
  const { signInLocal } = useAuthContext()

  let signIn: any = null
  let isSignInLoaded = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const clerkSignIn = useSignIn()
    signIn = clerkSignIn.signIn
    isSignInLoaded = clerkSignIn.isLoaded
  } catch {
    // Fallback if Clerk context is inactive
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const res = await loginUser({ email: cleanEmail, password })
      if (res?.usrId) {
        await signInLocal(res.usrId)
        navigate('/trips')
      } else {
        setErrorMsg('Account not found for this email. Please click "Create Account / Sign Up" below.')
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('404') || msg.includes('not found') || msg.includes('Sign Up')) {
        setErrorMsg(`No account found for "${cleanEmail}". Please click "Create Account / Sign Up" below to register.`)
      } else {
        setErrorMsg('Login failed. Please check your credentials or click Sign Up to create an account.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (isSignInLoaded && signIn) {
      try {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/trips',
        })
        return
      } catch (err) {
        console.warn('Clerk OAuth sign in error:', err)
      }
    }

    const cleanEmail = email.trim().toLowerCase() || 'google_user@example.com'
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await loginUser({ email: cleanEmail })
      if (res?.usrId) {
        await signInLocal(res.usrId)
        navigate('/trips')
      } else {
        setErrorMsg('Google Account not registered yet. Please click Sign Up to create your account.')
      }
    } catch (err: any) {
      setErrorMsg('Google login requires account registration. Please click Sign Up to create your profile.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <PageWrapper hideSidebar={true}>
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
        {/* Brand Header */}
        <h1 className="font-serif text-3xl font-bold text-route mb-6 tracking-tight">
          WanderMatch
        </h1>

        {/* Login Card */}
        <div className="w-full max-w-md bg-card border border-slate-light p-8 rounded-[12px] shadow-sm flex flex-col gap-6">
          <div className="text-center flex flex-col gap-1">
            <h2 className="font-serif text-2xl font-bold text-ink">Welcome Back</h2>
            <p className="font-sans text-xs text-slate">Log in to access your trip dashboard &amp; explore companions.</p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-md font-sans">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSignInSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate font-sans">Password</label>
                <a href="#forgot" className="text-xs font-sans text-slate hover:text-ink">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-paper border border-slate-light rounded-[8px] px-3.5 py-2.5 text-sm text-ink outline-none focus:border-route transition-all"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="py-3 mt-2 font-semibold text-sm">
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-1">
            <div className="flex-grow border-t border-slate-light"></div>
            <span className="flex-shrink mx-4 text-xs font-mono text-slate">or</span>
            <div className="flex-grow border-t border-slate-light"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-paper border border-slate-light hover:border-route rounded-[10px] text-xs font-sans font-medium text-ink transition-all min-h-[44px]"
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
            <span>Continue with Google</span>
          </button>

          <div className="text-center text-xs font-sans text-slate pt-2 border-t border-slate-light/60">
            Don't have an account?{' '}
            <Link to="/sign-up" className="text-route font-bold hover:underline">
              Create Account / Sign Up
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

