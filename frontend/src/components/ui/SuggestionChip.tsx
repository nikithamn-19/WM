import React from 'react'

export interface SuggestionChipProps {
  comment: string
  voterName?: string
  author?: string
}

export const SuggestionChip: React.FC<SuggestionChipProps> = ({ comment, voterName, author }) => {
  const name = voterName || author || 'User'
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="inline-flex items-center gap-2 bg-paper border border-slate-light rounded-full px-3 py-1 text-xs text-ink font-mono">
      <div className="w-4 h-4 rounded-full bg-slate-light text-ink text-[9px] font-bold flex items-center justify-center">
        {initials}
      </div>
      <span className="font-semibold text-ink">{name}:</span>
      <span>"{comment}"</span>
    </div>
  )
}
