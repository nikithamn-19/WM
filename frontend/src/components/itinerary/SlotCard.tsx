import React from 'react'
import type { ItineraryItem } from '../../types/trip'
import { StatusPill } from '../ui/StatusPill'
import { Button } from '../ui/Button'

export interface SlotCardProps {
  item: ItineraryItem
  onVote?: () => void
  onPropose?: () => void
  onViewBranches?: () => void
  onInvokeAI?: () => void
  isAdmin?: boolean
  currentUserRole?: 'owner' | 'editor' | 'viewer'
  mode?: 'Mode A' | 'Mode NA'
}

export const SlotCard: React.FC<SlotCardProps> = ({
  item,
  onVote,
  onPropose,
  onViewBranches,
  onInvokeAI,
  isAdmin = false,
  currentUserRole = 'owner',
  mode = 'Mode A',
}) => {
  const isConfirmed = item.slotStatus === 'CONFIRMED'
  const isBranched = item.slotStatus === 'BRANCHED'
  const isInConsensus = item.slotStatus === 'IN_CONSENSUS'
  const isEmpty = item.slotStatus === 'EMPTY'
  const canPropose = currentUserRole === 'owner' || currentUserRole === 'editor'

  const getCardStyle = () => {
    if (isConfirmed) {
      return 'bg-amber/5 border border-slate-light border-l-2 border-l-amber'
    }
    if (isBranched) {
      return 'bg-card border border-slate-light border-l-2 border-l-clay'
    }
    if (isInConsensus) {
      return 'bg-card border border-slate-light border-l-2 border-l-route'
    }
    if (isEmpty) {
      return 'bg-paper border border-dashed border-slate-light'
    }
    return 'bg-card border border-slate-light'
  }

  return (
    <div className={`rounded-[10px] p-4 flex flex-col gap-3 shadow-sm transition-all ${getCardStyle()}`}>
      {/* Top row */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate">
          {item.timeSlot || `Slot ${item.sortOrder}`}
        </span>
        <StatusPill status={item.slotStatus} />
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-1">
        <h4 className="font-sans font-medium text-ink text-base">{item.title}</h4>
        {item.entityType && (
          <span className="text-slate text-xs font-sans capitalize">
            {item.entityType} {item.entityId ? `(${item.entityId})` : ''}
          </span>
        )}
      </div>

      {/* Cost */}
      <div className="font-mono text-sm text-slate">
        ${item.cost} {item.currency}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-light/40">
        <span className="font-mono text-xs text-slate">
          {isEmpty ? 'No activity proposed' : '3 YES / 1 NO'}
        </span>

        <div className="flex items-center gap-2">
          {/* Admin "Invoke AI" button: ONLY if currentUser.role === 'owner' AND trip.mode === 'Mode A' */}
          {isAdmin && currentUserRole === 'owner' && mode === 'Mode A' && isInConsensus && onInvokeAI && (
            <Button variant="secondary" onClick={onInvokeAI} className="text-xs py-1 px-3 min-h-[36px]">
              Invoke AI
            </Button>
          )}

          {isBranched && onViewBranches && (
            <Button variant="secondary" onClick={onViewBranches} className="text-xs py-1 px-3 min-h-[36px] border-clay text-clay">
              View Branches &rarr;
            </Button>
          )}

          {isEmpty && canPropose && onPropose && (
            <Button variant="primary" onClick={onPropose} className="text-xs py-1 px-3 min-h-[36px]">
              + Propose
            </Button>
          )}

          {isInConsensus && onVote && (
            <Button variant="primary" onClick={onVote} className="text-xs py-1 px-3 min-h-[36px]">
              Vote / Review &rarr;
            </Button>
          )}

          {isConfirmed && onVote && (
            <Button variant="secondary" onClick={onVote} className="text-xs py-1 px-3 min-h-[36px]">
              Review &rarr;
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
