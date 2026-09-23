import React from 'react'
import type { SlotStatus } from '../../types/trip'

export interface StatusPillProps {
  status: SlotStatus
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const config = {
    EMPTY: { bg: 'bg-slate/10 text-slate', label: 'Empty', icon: '○' },
    IN_CONSENSUS: { bg: 'bg-route/10 text-route', label: 'In Consensus', icon: '◎' },
    BRANCHED: { bg: 'bg-clay/10 text-clay', label: 'Branched', icon: '⑂' },
    CONFIRMED: { bg: 'bg-amber/10 text-amber', label: 'Confirmed', icon: '✓' },
  }

  const { bg, label, icon } = config[status] || config.EMPTY

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${bg}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
