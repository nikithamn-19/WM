import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { apiFetch } from '../../lib/api'
import { useAuthContext } from '../../context/AuthContext'
import { useTripContext } from '../../context/TripContext'
import { CheckCircle2, AlertTriangle } from 'lucide-react'


export interface BlendedPlanData {
  title: string
  rationale: string
  costDelta: string
  currency: string
  constraintStatus: 'satisfied' | 'regenerated'
}

export interface ConflictResolutionPanelProps {
  currentRound?: number
  blendedPlan?: BlendedPlanData
  mode?: 'Mode A' | 'Mode NA'
  currentUserRole?: 'owner' | 'editor' | 'viewer'
  itmId?: string
  prpId?: string
  onAccept?: () => void
  onForceBranch?: () => void
  onExtend?: () => void
}

export const dummyBlendedPlan = {
  action: 'BLENDED',
  blendedPlan: {
    title: 'Dudhsagar Waterfalls & Jungle Jeep Safari Combo',
    rationale: 'Combines the jungle jeep adventure with spice plantation tour to accommodate both adventurous and relaxed member preferences.',
    costDelta: '2500.00',
    currency: 'INR',
    constraintStatus: 'satisfied' as const,
  },
  currentRound: 2,
}

export const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  currentRound = 2,
  blendedPlan = dummyBlendedPlan.blendedPlan,
  mode = 'Mode A',
  currentUserRole = 'owner',
  itmId,
  prpId,
  onAccept,
  onForceBranch,
  onExtend,
}) => {
  const { getToken } = useAuthContext()
  const { addToast } = useTripContext()

  const [loadingAction, setLoadingAction] = useState<'accept' | 'branch' | 'extend' | null>(null)

  const isOwner = currentUserRole === 'owner'
  const isModeA = mode === 'Mode A'

  const handleAdminAction = async (action: 'accept' | 'branch' | 'extend') => {
    setLoadingAction(action)
    try {
      if (action === 'accept') {
        await apiFetch('/api/consensus/accept', {
          method: 'POST',
          body: JSON.stringify({ prpId, itmId }),
        }, getToken).catch(() => null)
        addToast('Accepted Blended Plan!', 'success')
        if (onAccept) onAccept()
      } else if (action === 'branch') {
        await apiFetch('/api/consensus/branch', {
          method: 'POST',
          body: JSON.stringify({ prpId, itmId }),
        }, getToken).catch(() => null)
        addToast('Forced Branching initiated!', 'conflict')
        if (onForceBranch) onForceBranch()
      } else if (action === 'extend') {
        await apiFetch('/api/consensus/extend', {
          method: 'POST',
          body: JSON.stringify({ prpId, itmId }),
        }, getToken).catch(() => null)
        addToast('Voting round extended!', 'info')
        if (onExtend) onExtend()
      }
    } catch (err: any) {
      addToast(err.message || 'Action failed', 'conflict')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="bg-paper border border-route rounded-[10px] p-4 flex flex-col gap-3 shadow-sm mt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-route uppercase tracking-wide font-semibold">
            AI CONCIERGE
          </span>
          <span className="text-slate/40">•</span>
          <h3 className="font-sans font-medium text-ink text-base">AI Consensus Suggestion</h3>
        </div>
        <span className="font-mono text-xs text-slate">
          Round {currentRound} of ~3
        </span>
      </div>

      {/* Blended Plan Section */}
      <div className="bg-card border border-slate-light/60 rounded-[8px] p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="font-sans font-medium text-ink text-sm">{blendedPlan.title}</h4>
          <span className="font-mono text-sm text-route font-semibold">
            +${blendedPlan.costDelta} {blendedPlan.currency}
          </span>
        </div>

        <p className="font-sans text-sm text-slate">{blendedPlan.rationale}</p>

        <div className="pt-1.5 border-t border-slate-light/40 flex items-center justify-between text-xs">
          {blendedPlan.constraintStatus === 'satisfied' ? (
            <span className="text-route font-medium font-sans flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              All constraints satisfied
            </span>
          ) : (
            <span className="text-amber-800 font-medium font-sans flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Regenerated once
            </span>
          )}
        </div>
      </div>

      {/* Mode A Admin Controls */}
      {isModeA && isOwner && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-light">
          <Button
            onClick={() => handleAdminAction('accept')}
            disabled={loadingAction !== null}
            className="flex-1 text-xs"
          >
            {loadingAction === 'accept' ? 'Accepting...' : 'Accept Blended Plan'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleAdminAction('branch')}
            disabled={loadingAction !== null}
            className="border-clay text-clay hover:bg-clay/10 text-xs flex-1"
          >
            {loadingAction === 'branch' ? 'Branching...' : 'Force Branch Now'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleAdminAction('extend')}
            disabled={loadingAction !== null}
            className="text-xs flex-1"
          >
            {loadingAction === 'extend' ? 'Extending...' : 'Extend Round'}
          </Button>
        </div>
      )}

      {/* Mode NA Info Section */}
      {mode === 'Mode NA' && (
        <div className="pt-2 border-t border-slate-light flex flex-col gap-1">
          <p className="font-sans text-sm text-slate">
            The group is re-voting on this plan
          </p>
          {currentRound >= 3 && (
            <p className="text-clay text-xs font-mono font-medium">
              All rounds exhausted — branching now
            </p>
          )}
        </div>
      )}
    </div>
  )
}
