import React, { useState } from 'react'
import { SignIn, useUser } from '@clerk/clerk-react'
import { useNavigate, Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleDevSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/trips')
  }

  return (
    <PageWrapper hideSidebar={true}>
      <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-paper">
        <div className="w-full max-w-md bg-card border border-slate-light p-8 rounded-[10px] shadow-sm flex flex-col gap-6">
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-route text-card font-serif text-xl font-bold flex items-center justify-center">
              WM
            </div>
            <h1 className="font-serif text-3xl font-bold text-ink">Welcome Back</h1>
            <p className="font-sans text-sm text-slate">
              Sign in to your WanderMatch group travel workspace
            </p>
          </div>

          {isSignedIn ? (
            <div className="text-center flex flex-col gap-4">
              <p className="font-sans text-sm text-ink font-medium">
                You are currently signed in!
              </p>
              <Button onClick={() => navigate('/trips')}>Go to My Trips &rarr;</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Clerk Sign-In Component Container */}
              <div className="flex justify-center">
                <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="flex-grow border-t border-slate-light"></div>
                <span className="flex-shrink mx-4 text-xs font-mono text-slate uppercase">
                  Or Quick Sign In
                </span>
                <div className="flex-grow border-t border-slate-light"></div>
              </div>

              <form onSubmit={handleDevSignIn} className="flex flex-col gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Button type="submit" className="py-3">
                  Sign In to Workspace &rarr;
                </Button>
              </form>

              <div className="text-center text-xs font-sans text-slate pt-2 border-t border-slate-light/60">
                Don't have an account?{' '}
                <Link to="/sign-up" className="text-route font-bold hover:underline">
                  Create one here
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
