import React from 'react'
import { Button } from './Button'

export interface EmptyStateProps {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-paper rounded-[10px] border border-dashed border-slate-light text-center gap-3 w-full">
      <h3 className="font-serif text-xl font-semibold text-ink">{title}</h3>
      {message && <p className="text-sm font-sans text-slate max-w-md">{message}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
