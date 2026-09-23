import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useTripContext } from '../context/TripContext'
import { ProposeActivityModal } from './ProposeActivityModal'

export interface ProposalVote {
  usrId: string
  vote: 'yes' | 'no' | 'abstain'
  comment?: string
}

export interface ProposalItem {
  prpId: string
  actionType: 'Add' | 'Replace' | 'Remove'
  title: string
  status: 'accepted' | 'proposed' | 'in_consensus' | 'rejected'
  rationale: string
  proposedBy: string
  costDelta: string
  currency: string
  votes: ProposalVote[]
  userVote?: 'yes' | 'no' | 'abstain'
}

const QUICK_OBJECTIONS = [
  'Only if we skip the museum',
  'Too crowded and noisy during midday',
  'Budget delta is too high for this slot',
  'Sun is too harsh; prefer shaded indoor activity',
  'Clashes with scheduled lunch booking',
  'Too far from hotel',
]

export const BranchViewScreen: React.FC = () => {
  const { trpId = 'trp_098ba70a', itmId = 'itm_b94582f9' } = useParams()
  const { addToast } = useTripContext()

  const [isProposeOpen, setIsProposeOpen] = useState(false)
  const [activeNoPromptPrpId, setActiveNoPromptPrpId] = useState<string | null>(null)
  const [typedReason, setTypedReason] = useState('')

  // Slot details (matches Photo 2)
  const slotDetails = {
    dayLabel: 'DAY 1',
    status: 'confirmed',
    title: 'Garden Niwas Resort',
    cost: 'INR 17500.00',
    duration: '0m',
    source: 'vote',
  }

  const [proposals, setProposals] = useState<ProposalItem[]>([
    {
      prpId: 'prp_1',
      actionType: 'Add',
      title: 'Alleppey Bazaar',
      status: 'accepted',
      rationale: 'Opens at six, so it works before the train.',
      proposedBy: 'usr_e459a18c',
      costDelta: 'INR 350.00',
      currency: 'INR',
      votes: [
        { usrId: 'usr_4e65d08a', vote: 'abstain' },
        { usrId: 'usr_e459a18c', vote: 'yes', comment: 'Only if we skip the museum.' },
      ],
      userVote: undefined,
    },
  ])

  // Count votes
  const getVoteCounts = (proposal: ProposalItem) => {
    let yes = 0
    let no = 0
    let abstain = 0

    proposal.votes.forEach((v) => {
      if (v.vote === 'yes') yes++
      if (v.vote === 'no') no++
      if (v.vote === 'abstain') abstain++
    })

    return { yes, no, abstain }
  }

  // Cast YES vote
  const handleVoteYes = (prpId: string) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.prpId !== prpId) return p
        const filtered = p.votes.filter((v) => v.usrId !== 'usr_nikitha')
        return {
          ...p,
          userVote: 'yes',
          votes: [...filtered, { usrId: 'usr_nikitha', vote: 'yes' }],
        }
      })
    )
    addToast('Vote registered: Yes 👍', 'success')
  }

  // Cast ABSTAIN vote
  const handleVoteAbstain = (prpId: string) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.prpId !== prpId) return p
        const filtered = p.votes.filter((v) => v.usrId !== 'usr_nikitha')
        return {
          ...p,
          userVote: 'abstain',
          votes: [...filtered, { usrId: 'usr_nikitha', vote: 'abstain' }],
        }
      })
    )
    addToast('Vote registered: Abstain ⊘', 'info')
  }

  // Cast NO vote with reason
  const submitNoVote = (prpId: string) => {
    if (!typedReason.trim()) {
      addToast('WanderMatch requires a typed reason for NO votes so the AI can build a compromise.', 'conflict')
      return
    }

    const objectionText = typedReason.trim()

    setProposals((prev) =>
      prev.map((p) => {
        if (p.prpId !== prpId) return p
        const filtered = p.votes.filter((v) => v.usrId !== 'usr_nikitha')
        return {
          ...p,
          userVote: 'no',
          votes: [
            ...filtered,
            { usrId: 'usr_nikitha', vote: 'no', comment: objectionText },
          ],
        }
      })
    )

    setActiveNoPromptPrpId(null)
    setTypedReason('')
    addToast(`NO vote recorded with reason: "${objectionText}"`, 'info')
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Trip Workspace">
      <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-16">
        {/* Navigation & Action Bar (Matching Photo 2) */}
        <div className="flex items-center justify-between pt-1">
          <Link
            to={`/trips/${trpId}`}
            className="text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1.5"
          >
            <span>&larr;</span>
            <span>Back to Trip Itinerary</span>
          </Link>

          <Button
            onClick={() => setIsProposeOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 shadow-xs"
          >
            <span className="w-4 h-4 rounded-full border border-white/60 flex items-center justify-center text-[11px] font-bold">
              +
            </span>
            <span>Propose Alternative</span>
          </Button>
        </div>

        {/* Selected Slot Box (Matching Photo 2) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-mono">
              SELECTED SLOT ({slotDetails.dayLabel})
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              {slotDetails.status}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
            {slotDetails.title}
          </h1>

          <p className="text-xs text-gray-500 font-sans mt-0.5">
            Cost: {slotDetails.cost} · Duration: {slotDetails.duration} · Source: {slotDetails.source}
          </p>
        </div>

        {/* Open Proposals & Member Votes Section Header (Matching Photo 2) */}
        <div className="pt-2">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Open Proposals &amp; Member Votes ({proposals.length})
          </h2>
        </div>

        {/* Proposals List (Matching Photo 2) */}
        <div className="flex flex-col gap-4">
          {proposals.map((proposal) => {
            const counts = getVoteCounts(proposal)

            return (
              <div
                key={proposal.prpId}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs flex flex-col gap-3"
              >
                {/* Proposal Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                      {proposal.actionType}: {proposal.title}
                    </h3>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded border capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                      {proposal.status}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                      {proposal.actionType}
                    </span>
                  </div>

                  {/* Vote Counts Pills (Matching Photo 2: 1 Yes, 0 No, 1 Abstain) */}
                  <div className="flex items-center gap-2 shrink-0 text-xs font-medium">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2.5 py-1 flex items-center gap-1">
                      <span>👍</span>
                      <span>{counts.yes} Yes</span>
                    </span>
                    <span className="bg-rose-50 text-rose-800 border border-rose-200 rounded px-2.5 py-1 flex items-center gap-1">
                      <span>👎</span>
                      <span>{counts.no} No</span>
                    </span>
                    <span className="bg-gray-100 text-gray-700 border border-gray-200 rounded px-2.5 py-1 flex items-center gap-1">
                      <span>⊘</span>
                      <span>{counts.abstain} Abstain</span>
                    </span>
                  </div>
                </div>

                {/* Proposal Rationale / Description Quote (Matching Photo 2) */}
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-gray-800 italic">
                    "{proposal.rationale}"
                  </p>
                  <p className="text-xs text-gray-500 font-sans">
                    Proposed by <span className="font-mono text-gray-700 font-medium">{proposal.proposedBy}</span> · Cost delta: {proposal.costDelta}
                  </p>
                </div>

                {/* Member Votes & Visibility Sub-card (Matching Photo 2) */}
                <div className="bg-gray-50/70 border border-gray-100 rounded-lg p-3.5 flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <span>👥</span>
                    <span>Member Votes &amp; Visibility:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {proposal.votes.map((v, vIdx) => {
                      const isYes = v.vote === 'yes'
                      const isNo = v.vote === 'no'

                      return (
                        <div
                          key={vIdx}
                          className={`text-xs font-mono px-2.5 py-1 rounded-md border flex items-center gap-1 shadow-2xs ${
                            isYes
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-medium'
                              : isNo
                              ? 'bg-rose-50 text-rose-900 border-rose-200 font-medium'
                              : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          <span className="font-bold">{v.usrId}:</span>
                          <span className="capitalize">{v.vote}</span>
                          {v.comment && (
                            <span className="italic text-gray-600">
                              ("{v.comment}")
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Inline Objection Prompt if NO was clicked */}
                {activeNoPromptPrpId === proposal.prpId && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3.5 flex flex-col gap-2.5 mt-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-rose-900 flex items-center gap-1">
                        <span>👎</span>
                        <span>State your objection reason (Required for AI Consensus):</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveNoPromptPrpId(null)}
                        className="text-xs text-gray-400 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_OBJECTIONS.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setTypedReason(chip)}
                          className="text-[11px] font-sans px-2.5 py-1 rounded bg-white border border-gray-200 text-gray-700 hover:border-rose-400 hover:bg-rose-50/50 transition-all text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={typedReason}
                      onChange={(e) => setTypedReason(e.target.value)}
                      placeholder="e.g. Only if we skip the museum; too crowded; over budget..."
                      className="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveNoPromptPrpId(null)}
                        className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => submitNoVote(proposal.prpId)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs px-3.5 py-1.5 rounded shadow-xs"
                      >
                        Submit Objection &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* Vote Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleVoteYes(proposal.prpId)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md border flex items-center gap-1 transition-colors ${
                      proposal.userVote === 'yes'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-emerald-700 border-gray-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span>👍</span>
                    <span>Vote Yes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNoPromptPrpId(proposal.prpId)
                      setTypedReason('')
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md border flex items-center gap-1 transition-colors ${
                      proposal.userVote === 'no'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-rose-700 border-gray-200 hover:bg-rose-50'
                    }`}
                  >
                    <span>👎</span>
                    <span>Vote No</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVoteAbstain(proposal.prpId)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md border flex items-center gap-1 transition-colors ${
                      proposal.userVote === 'abstain'
                        ? 'bg-gray-700 text-white border-gray-700 shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>⊘</span>
                    <span>Abstain</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal for Propose Alternative */}
        <ProposeActivityModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          trpId={trpId}
          itmId={itmId}
          slotTime="Garden Niwas Resort (Day 1)"
          onSuccess={() => {
            addToast('Alternative proposal added to Open Proposals!', 'success')
          }}
        />

        {/* Bottom Footer (Matching Photo 2) */}
        <footer className="text-center text-xs text-gray-400 mt-10 pt-4 border-t border-gray-200">
          WanderMatch · KogniVera Hackathon 2026 · PS-11 Real Architecture
        </footer>
      </div>
    </PageWrapper>
  )
}
