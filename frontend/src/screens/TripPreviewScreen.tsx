import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'

export const TripPreviewScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const navigate = useNavigate()

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col items-center gap-6">
        {/* Badge & Welcome Header (PDF Page 11 Design) */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <span className="font-mono text-[11px] text-slate font-bold uppercase tracking-wider">
            JOIN REQUEST ACCEPTED
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
            Welcome aboard.
          </h1>
        </div>

        {/* Hero Card Banner */}
        <div className="w-full bg-card border border-slate-light rounded-[16px] overflow-hidden shadow-sm flex flex-col gap-6">
          <div className="relative aspect-[16/8] bg-paper overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80"
              alt="Goa Getaway"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent flex items-end p-6">
              <div className="flex items-center justify-between w-full text-card">
                <div>
                  <h2 className="font-serif text-2xl font-bold">
                    Goa Sunsets &amp; Beach Getaway
                  </h2>
                  <span className="font-mono text-xs text-card/80">
                    OCT 12 – OCT 18, 2026
                  </span>
                </div>
                <div className="flex items-center -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-route text-card font-mono text-xs font-bold flex items-center justify-center border-2 border-card">
                    AC
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate text-card font-mono text-xs font-bold flex items-center justify-center border-2 border-card">
                    PS
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-light text-slate font-mono text-xs font-bold flex items-center justify-center border-2 border-card">
                    +2
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Itinerary Preview Section */}
          <div className="p-6 flex flex-col gap-4">
            <span className="font-mono text-xs font-bold text-slate uppercase tracking-wider">
              ITINERARY PREVIEW
            </span>

            <div className="flex flex-col gap-3">
              {/* Item 1 */}
              <div className="p-4 bg-paper border border-slate-light rounded-[10px] flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-sm font-bold text-ink">
                    Baga Beach Water Sports &amp; Arrival
                  </h4>
                  <span className="font-mono text-xs text-slate">
                    Calangute • 14:00
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Confirmed
                </span>
              </div>

              {/* Item 2 */}
              <div className="p-4 bg-paper border border-slate-light rounded-[10px] flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-sm font-bold text-ink">
                    Dudhsagar Jeep Safari &amp; Trek
                  </h4>
                  <span className="font-mono text-xs text-slate">
                    Mollem • 09:00 - 16:00
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Needs Vote
                </span>
              </div>

              {/* Item 3 */}
              <div className="p-4 bg-paper border border-slate-light rounded-[10px] flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-sm font-bold text-ink">
                    Anjuna Beach Shack Sunset Dinner
                  </h4>
                  <span className="font-mono text-xs text-slate">
                    Anjuna • 19:30
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Confirmed
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => navigate('/solo-matches')}
                className="flex-1 py-2.5"
              >
                Back
              </Button>
              <Button
                onClick={() => navigate(`/trips/${trpId}`)}
                className="flex-1 py-2.5"
              >
                Enter Trip Workspace &rarr;
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
