import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface ToastProps {
  message: string
  type?: 'info' | 'success' | 'conflict' | 'error'
  onDismiss?: () => void
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const typeStyles = {
    info: 'border-route/40 text-route',
    success: 'border-amber/40 text-amber',
    conflict: 'border-clay/40 text-clay',
    error: 'border-red-300 text-red-800 bg-red-50',
  }

  return (
    <div className={`fixed top-4 right-4 z-50 bg-card border border-slate-light rounded-[10px] shadow-sm px-4 py-3 font-sans text-sm text-ink flex items-center justify-between gap-3 min-w-[280px] max-w-sm transition-transform ${typeStyles[type]}`}>
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate hover:text-ink text-sm font-bold p-1 rounded min-h-[32px] min-w-[32px] flex items-center justify-center"
        >
          <X className="w-4 h-4 text-slate" />
        </button>
      )}
    </div>
  )
}
