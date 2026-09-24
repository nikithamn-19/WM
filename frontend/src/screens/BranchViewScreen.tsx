import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useTripContext } from '../context/TripContext'
import { Users, Clock, XCircle, CheckCircle2, Bot } from 'lucide-react'


export interface ProposalOption {
  id: string
  tag: 'INITIAL PLAN' | 'AI SUGGESTION' | 'MEMBER PROPOSAL'
  title: string
  whyCreated: string
  yesVotes: number
  noVotes: number
  userVote?: 'yes' | 'no'
}

export const BranchViewScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const navigate = useNavigate()
  const { addToast } = useTripContext()

  const [options, setOptions] = useState<ProposalOption[]>([
    {
      id: 'opt_1',
      tag: 'INITIAL PLAN',
      title: 'Anjuna Beach',
      whyCreated: 'The original plan still has support from members who prefer a lively beach experience.',
      yesVotes: 2,
      noVotes: 1,
    },
    {
      id: 'opt_2',
      tag: 'AI SUGGESTION',
      title: 'Candolim Beach',
      whyCreated: "Created to address concerns about crowds while preserving the group's preference for a relaxed beach activity.",
      yesVotes: 0,
      noVotes: 0,
    },
    {
      id: 'opt_3',
      tag: 'MEMBER PROPOSAL',
      title: 'Fort Aguada + Beach',
      whyCreated: 'Accommodates members who wanted sightseeing while keeping part of the original beach experience.',
      yesVotes: 1,
      noVotes: 0,
    },
  ])

  const handleVote = (id: string, vote: 'yes' | 'no') => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== id) return opt
        const prevVote = opt.userVote
        let newYes = opt.yesVotes
        let newNo = opt.noVotes

        if (prevVote === 'yes') newYes--
        if (prevVote === 'no') newNo--

        if (vote === 'yes') newYes++
        if (vote === 'no') newNo++

        return { ...opt, userVote: vote, yesVotes: newYes, noVotes: newNo }
      })
    )
    addToast(`Vote cast (${vote.toUpperCase()})`, 'success')
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Goa Getaway">
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Header Title (PDF Page 13 Design) */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold text-ink">Goa Getaway</h1>
          <p className="font-mono text-xs text-slate">Day 1: Arrival • 12:00 PM • 6 members</p>
        </div>

        {/* Day Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-light pb-2">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-bold text-route border-b-2 border-route pb-1">
              Day 1
            </span>
            <span className="font-mono text-xs text-slate hover:text-ink cursor-pointer">
              Day 2
            </span>
            <span className="font-mono text-xs text-slate hover:text-ink cursor-pointer">
              Day 3
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/trips/${trpId}`)}
            className="font-mono text-xs text-route font-bold hover:underline"
          >
            &larr; Back to Plan
          </button>
        </div>

        {/* Live Voting Status Bar (PDF Page 13 Design) */}
        <div className="bg-paper border border-slate-light rounded-[10px] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 font-mono text-xs text-slate">
            <Users className="w-4 h-4 text-slate" />
            <span>Collecting preferences — 4 of 6 members responded</span>
          </div>
          <div className="bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Round 1 ends in 06:42</span>
          </div>
        </div>

        {/* Round 1 — Resolution Options Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">Round 1 — Resolution Options</h2>
            <p className="font-mono text-xs text-slate">Vote to lock in a plan</p>
          </div>

          <Button
            onClick={() => addToast('Opening proposal form...', 'info')}
            className="text-xs py-1.5 px-3 min-h-[36px]"
          >
            + Propose Activity
          </Button>
        </div>

        {/* Side-by-Side Resolution Options Cards (PDF Page 13 Design) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((opt) => (
            <div
              key={opt.id}
              className="bg-card border border-slate-light rounded-[12px] overflow-hidden shadow-xs flex flex-col justify-between hover:border-route transition-all"
            >
              <div>
                {/* Image Header */}
                <div className="relative aspect-video bg-paper overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80"
                    alt={opt.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-ink/80 text-card font-mono text-[9px] font-bold px-2 py-0.5 rounded">
                    {opt.tag}
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {opt.title}
                  </h3>

                  <span className="font-mono text-[10px] text-slate font-bold uppercase">
                    WHY THIS PLAN:
                  </span>
                  <p className="font-sans text-xs text-slate leading-relaxed">
                    {opt.whyCreated}
                  </p>

                  <div className="font-mono text-xs text-slate pt-2 border-t border-slate-light/60">
                    Current Votes: <strong className="text-emerald-700">{opt.yesVotes} Yes</strong> • <strong className="text-clay">{opt.noVotes} No</strong>
                  </div>
                </div>
              </div>

              {/* Vote Buttons */}
              <div className="p-4 pt-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleVote(opt.id, 'no')}
                  className={`flex-1 py-1.5 rounded-[8px] font-mono text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                    opt.userVote === 'no'
                      ? 'bg-clay text-card border-clay shadow-xs'
                      : 'bg-paper text-clay border-clay/30 hover:bg-clay/10'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  No
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(opt.id, 'yes')}
                  className={`flex-1 py-1.5 rounded-[8px] font-mono text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                    opt.userVote === 'yes'
                      ? 'bg-emerald-700 text-card border-emerald-700 shadow-xs'
                      : 'bg-paper text-emerald-700 border-emerald-700/30 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Yes
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* AI Concierge Panel (PDF Page 13 Design) */}
        <div className="bg-paper border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-route text-card font-mono text-xs font-bold flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-card" />
            </span>
            <h3 className="font-serif text-base font-bold text-ink">
              AI Concierge — Round 1 Analysis
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs text-slate">
            <div className="flex flex-col gap-1 p-3 bg-card rounded-[8px] border border-slate-light">
              <span className="font-mono text-[10px] font-bold text-ink uppercase">
                WHAT HAPPENED
              </span>
              <p>
                Candolim received mixed votes, while Fort Aguada gained support from 50% of active voters.
              </p>
            </div>

            <div className="flex flex-col gap-1 p-3 bg-card rounded-[8px] border border-slate-light">
              <span className="font-mono text-[10px] font-bold text-ink uppercase">
                WHAT CONCERNS REMAIN
              </span>
              <p>
                The group is split 50/50 between sightseeing and wanting a purely beach-focused afternoon.
              </p>
            </div>

            <div className="flex flex-col gap-1 p-3 bg-card rounded-[8px] border border-slate-light">
              <span className="font-mono text-[10px] font-bold text-ink uppercase">
                WHAT I RECOMMEND NEXT
              </span>
              <p>
                I will propose a split itinerary for the afternoon, reuniting for dinner at a central location.
              </p>
            </div>
          </div>
        </div>

        {/* Queued Round 2 Indicator (PDF Page 13 Design) */}
        <div className="p-4 bg-card border border-slate-light rounded-[12px] text-center font-mono text-xs text-slate opacity-75">
          ⌛ Round 2 — Updated Options (Generating based on feedback...)
        </div>
      </div>
    </PageWrapper>
  )
}
