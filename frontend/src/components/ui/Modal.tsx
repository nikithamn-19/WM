import React from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-ink/40 p-4 overflow-y-auto">
      <div className="bg-card rounded-[10px] p-6 max-w-lg w-full mx-auto mt-20 relative z-50 shadow-lg border border-slate-light flex flex-col gap-4">
        <div className="flex items-center justify-between pr-8">
          {title && <h3 className="font-serif text-xl font-semibold text-ink">{title}</h3>}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate hover:text-ink text-xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] focus-visible:ring-2 focus-visible:ring-route"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
