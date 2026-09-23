import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'

export const SoloOrGroupDecisionScreen: React.FC = () => {
  const navigate = useNavigate()

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center py-10 px-4 min-h-[calc(100vh-140px)] max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink text-center mb-10 leading-tight">
          Are you travelling solo or already with a group?
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Card 1: Solo */}
          <div className="bg-card border border-slate-light rounded-[16px] p-8 shadow-sm flex flex-col justify-between items-center text-center gap-6 hover:border-route transition-all">
            <div className="w-12 h-12 rounded-full bg-paper border border-slate-light flex items-center justify-center text-route">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-ink mb-2">
                Solo — I'm looking for a trip
              </h3>
              <p className="font-sans text-xs text-slate leading-relaxed">
                Travel alone but together. Find a matching group based on your interests and travel style.
              </p>
            </div>

            <Button
              onClick={() => navigate('/solo-matches')}
              className="w-full py-3 mt-2"
            >
              Find My Trip
            </Button>
          </div>

          {/* Card 2: Group */}
          <div className="bg-card border border-slate-light rounded-[16px] p-8 shadow-sm flex flex-col justify-between items-center text-center gap-6 hover:border-route transition-all">
            <div className="w-12 h-12 rounded-full bg-paper border border-slate-light flex items-center justify-center text-route">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-ink mb-2">
                Already in a group — We're planning
              </h3>
              <p className="font-sans text-xs text-slate leading-relaxed">
                Organize your group trip. Set up an itinerary, track expenses, and chat with your friends.
              </p>
            </div>

            <Button
              onClick={() => navigate('/trips/new')}
              className="w-full py-3 mt-2"
            >
              Create a Trip
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
