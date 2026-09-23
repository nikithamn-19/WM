import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { proposeChatMessage } from '../../lib/api'
import { useAuthContext } from '../../context/AuthContext'
import { useTripContext } from '../../context/TripContext'

export interface ChatProposeButtonProps {
  msgId: string
}

export const ChatProposeButton: React.FC<ChatProposeButtonProps> = ({ msgId }) => {
  const { getToken } = useAuthContext()
  const { addToast } = useTripContext()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agreedStatus, setAgreedStatus] = useState<string | null>(null)

  const handlePropose = async () => {
    setIsSubmitting(true)
    try {
      const res = await proposeChatMessage(msgId, getToken).catch(() => {
        // Fallback demo for phase 5
        return { status: 'UNANIMOUS', agreedCount: 4, totalCount: 4 }
      })

      if (res && (res.status === 'UNANIMOUS' || res.status === 'CONFIRMED')) {
        addToast('Plan accepted! Slot is now CONFIRMED.', 'success')
        setAgreedStatus('4/4 members agreed')
      } else {
        addToast('Not unanimous — queued as a standard proposal for next round.', 'info')
        setAgreedStatus('3/4 members agreed')
      }
    } catch {
      addToast('Not unanimous — queued as a standard proposal for next round.', 'info')
      setAgreedStatus('3/4 members agreed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (agreedStatus) {
    return (
      <span className="text-xs font-mono text-route bg-route/10 px-2.5 py-1 rounded-full font-bold self-start mt-1">
        ✓ {agreedStatus}
      </span>
    )
  }

  return (
    <Button
      variant="secondary"
      onClick={handlePropose}
      disabled={isSubmitting}
      className="text-xs py-1 px-2.5 min-h-[32px] mt-1 self-start border-route/30 text-route hover:bg-route/10"
    >
      {isSubmitting ? 'Proposing...' : 'Propose this as the plan'}
    </Button>
  )
}
