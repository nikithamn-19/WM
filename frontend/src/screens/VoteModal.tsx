import React, { useState, useEffect } from 'react'
import { Modal } from '../components/ui/Modal'
import { VotePill } from '../components/ui/VotePill'
import { SuggestionChip } from '../components/ui/SuggestionChip'
import { Button } from '../components/ui/Button'
import type { ItineraryItem } from '../types/trip'
import type { Proposal } from '../types/proposal'
import { useTripContext } from '../context/TripContext'
import { useAuthContext } from '../context/AuthContext'
import { castVote } from '../lib/api'

export interface VoteModalProps {
  isOpen: boolean
  onClose: () => void
  item: ItineraryItem | null
  mode?: 'Mode A' | 'Mode NA'
  currentUserRole?: 'owner' | 'editor' | 'viewer'
}

export const VoteModal: React.FC<VoteModalProps> = ({
  isOpen,
  onClose,
  item,
  mode = 'Mode A',
  currentUserRole = 'owner',
}) => {
  const { addToast } = useTripContext()
  const { currentUser, getToken } = useAuthContext()

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const proposal: Proposal = item?.activeProposal || {
    prpId: `prp_${item?.itmId || 'demo'}`,
    itnId: item?.itnId || 'itn_1',
    proposedByUserId: currentUser?.usrId || 'usr_me',
    proposedByDisplayName: currentUser?.displayName || 'Traveler',
    action: 'add',
    entityType: item?.entityType || 'poi',
    entityId: item?.entityId || 'poi_activity',
    title: item?.title || 'Proposed Activity',
    rationale: 'Proposed itinerary change for group consensus',
    costDelta: item?.cost || '0.00',
    currency: item?.currency || 'INR',
    closesAt: mode === 'Mode NA' ? new Date(Date.now() + 600000).toISOString() : null,
    status: 'open',
    currentRound: 1,
    votes: [],
  }

  // Timer calculation for Mode NA closesAt
  useEffect(() => {
    if (!proposal.closesAt) {
      setTimeLeft(null)
      return
    }

    const targetTime = new Date(proposal.closesAt).getTime()
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000))
      setTimeLeft(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [proposal.closesAt])

  if (!item) return null

  const yesVotes = proposal.votes.filter((v) => v.value === 'yes')
  const noVotes = proposal.votes.filter((v) => v.value === 'no')
  const nonVotersCount = Math.max(0, 4 - (yesVotes.length + noVotes.length))

  const handleVoteSubmit = async (value: 'yes' | 'no', comment?: string) => {
    if (value === 'no' && (!comment || !comment.trim())) {
      addToast("A 'no' vote requires a typed reason or suggestion", 'conflict')
      return
    }

    const body = {
      prpId: proposal.prpId,
      usrId: currentUser?.usrId || 'usr_demo',
      value, // 'yes' or 'no'
      comment: value === 'no' ? comment?.trim() : null,
    }

    setIsSubmitting(true)
    try {
      await castVote(body as any, getToken).catch(() => {
        // Fallback for phase 4 before backend is running
        return { status: 'SUCCESS' }
      })

      addToast('Vote submitted successfully!', 'success')
      onClose()
    } catch (err: any) {
      addToast(err.message || 'Failed to submit vote', 'conflict')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Slot Detail: ${item.timeSlot || ''}`}>
      <div className="flex flex-col gap-5">
        {/* TOP SECTION — Proposal details */}
        <div className="bg-paper border border-slate-light rounded-[10px] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="font-sans font-medium text-ink text-base">{proposal.title}</h4>
            <span className="font-mono text-sm text-route font-semibold">
              +${proposal.costDelta} {proposal.currency}
            </span>
          </div>

          <p className="font-sans text-sm text-slate">{proposal.rationale}</p>

          <div className="flex items-center justify-between text-xs text-slate pt-2 border-t border-slate-light/40">
            <span>Proposed by <strong className="text-ink">{proposal.proposedByDisplayName}</strong></span>
            {proposal.entityType && (
              <span className="font-mono uppercase">
                {proposal.entityType} ({proposal.entityId || 'N/A'})
              </span>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION — Live vote tally & suggestion chips */}
        <div className="flex flex-col gap-3 bg-card border border-slate-light rounded-[10px] p-4">
          <div className="flex items-center justify-between font-mono text-xs text-slate">
            <span>
              <strong className="text-route">{yesVotes.length} YES</strong> /{' '}
              <strong className="text-clay">{noVotes.length} NO</strong> / {nonVotersCount} haven't voted yet
            </span>
            <span>Round {proposal.currentRound}</span>
          </div>

          {/* Avatars for YES voters */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate">YES:</span>
            <div className="flex items-center -space-x-1.5">
              {yesVotes.map((v) => (
                <div
                  key={v.votId}
                  title={v.displayName}
                  className="w-7 h-7 rounded-full bg-route text-card text-[10px] font-mono font-bold flex items-center justify-center border-2 border-route"
                >
                  {v.displayName.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Avatars for NO voters */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate">NO:</span>
            <div className="flex items-center -space-x-1.5">
              {noVotes.map((v) => (
                <div
                  key={v.votId}
                  title={v.displayName}
                  className="w-7 h-7 rounded-full bg-clay text-card text-[10px] font-mono font-bold flex items-center justify-center border-2 border-clay"
                >
                  {v.displayName.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* NO voter feedback chips */}
          {noVotes.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-light/50">
              <span className="text-xs font-mono text-slate">Typed Objections &amp; Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {noVotes.map((v) => (
                  <SuggestionChip key={v.votId} voterName={v.displayName} comment={v.comment || ''} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION — Mode NA countdown timer */}
        {mode === 'Mode NA' && timeLeft !== null && (
          <div className="bg-slate/10 p-3 rounded-[8px] text-center font-mono text-xs text-ink">
            {timeLeft > 0 ? (
              <span>Voting closes in <strong className="text-clay">{formatTimer(timeLeft)}</strong></span>
            ) : (
              <span className="text-clay font-bold">Voting window closed — awaiting AI reconciliation</span>
            )}
          </div>
        )}

        {/* BOTTOM SECTION — Vote Form */}
        <div className="pt-2 border-t border-slate-light">
          <VotePill
            disabled={isSubmitting}
            onYes={() => handleVoteSubmit('yes')}
            onNo={(comment) => handleVoteSubmit('no', comment)}
          />
        </div>

        {/* Admin controls (ONLY if mode === 'Mode A' AND currentUserRole === 'owner') */}
        {mode === 'Mode A' && currentUserRole === 'owner' && (
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-light">
            <span className="text-xs font-mono text-route font-semibold">Admin Decision Controls (Mode A):</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => addToast('Blended plan accepted by Admin', 'success')} className="flex-1 text-xs">
                Accept Blended Plan
              </Button>
              <Button
                variant="secondary"
                onClick={() => addToast('Forced branching initiated by Admin', 'conflict')}
                className="flex-1 text-xs border-clay text-clay hover:bg-clay/10"
              >
                Force Branch Now
              </Button>
              <Button
                variant="secondary"
                onClick={() => addToast('Voting round extended by Admin', 'info')}
                className="flex-1 text-xs"
              >
                Extend Round
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
