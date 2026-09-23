import React from 'react'
import type { Proposal } from '../../types/proposal'
import { SuggestionChip } from '../ui/SuggestionChip'

interface ProposalCardProps {
  proposal: Proposal
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal }) => {
  const noVotes = proposal.votes.filter((v) => v.value === 'no' && v.comment)

  return (
    <div className="bg-paper border border-slate-light rounded-[10px] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-serif font-semibold text-ink text-base">{proposal.title}</h4>
        <span className="font-mono text-xs text-route font-medium">${proposal.costDelta} {proposal.currency}</span>
      </div>

      <p className="text-sm text-slate">{proposal.rationale}</p>

      {noVotes.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-light/50">
          <span className="text-xs font-mono text-slate">Feedback / Objections:</span>
          <div className="flex flex-wrap gap-1.5">
            {noVotes.map((v) => (
              <SuggestionChip key={v.votId} author={v.displayName} comment={v.comment || ''} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
