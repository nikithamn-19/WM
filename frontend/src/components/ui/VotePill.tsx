import React, { useState } from 'react'

export interface VotePillProps {
  onYes?: () => void
  onNo?: (comment: string) => void
  onVote?: (value: 'yes' | 'no', comment?: string) => void
  currentVote?: 'yes' | 'no' | null
  disabled?: boolean
}

export const VotePill: React.FC<VotePillProps> = ({
  onYes,
  onNo,
  onVote,
  currentVote = null,
  disabled = false,
}) => {
  const [selectedVote, setSelectedVote] = useState<'yes' | 'no' | null>(currentVote)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const handleYesClick = () => {
    if (disabled) return
    setSelectedVote('yes')
    setError('')
    if (onYes) onYes()
    if (onVote) onVote('yes')
  }

  const handleNoClick = () => {
    if (disabled) return
    setSelectedVote('no')
    setError('')
  }

  const handleNoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      setError("A 'no' vote requires a typed reason or suggestion")
      return
    }
    setError('')
    if (onNo) onNo(comment.trim())
    if (onVote) onVote('no', comment.trim())
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={handleYesClick}
          className={`flex-1 bg-route text-card rounded-[10px] px-4 py-2 min-h-[44px] font-sans font-medium transition-all ${
            selectedVote === 'yes' ? 'ring-2 ring-offset-2 ring-route' : 'opacity-90 hover:opacity-100'
          } disabled:opacity-50`}
        >
          YES
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleNoClick}
          className={`flex-1 bg-clay text-card rounded-[10px] px-4 py-2 min-h-[44px] font-sans font-medium transition-all ${
            selectedVote === 'no' ? 'ring-2 ring-offset-2 ring-clay' : 'opacity-90 hover:opacity-100'
          } disabled:opacity-50`}
        >
          NO
        </button>
      </div>

      {selectedVote === 'no' && (
        <form onSubmit={handleNoSubmit} className="flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value)
              if (error) setError('')
            }}
            placeholder="What would you prefer instead? (required)"
            className={`w-full bg-paper rounded-[8px] p-3 text-sm text-ink font-sans focus:outline-none min-h-[80px] ${
              !comment.trim() ? 'border-2 border-clay' : 'border border-slate-light focus:border-route'
            }`}
          />
          {error && <span className="text-xs text-clay font-medium font-sans">{error}</span>}
          <button
            type="submit"
            disabled={disabled || !comment.trim()}
            className="self-end bg-clay text-card rounded-[10px] px-4 py-2 min-h-[44px] font-sans font-medium text-sm disabled:opacity-50 hover:bg-clay/90"
          >
            Submit Objection
          </button>
        </form>
      )}
    </div>
  )
}
