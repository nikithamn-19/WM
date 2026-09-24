import React from 'react'
import { ChatProposeButton } from './ChatProposeButton'

export interface ChatMessageProps {
  msgId: string
  displayName: string
  text: string
  sentAt: string
}

export const ChatMessageItem: React.FC<ChatMessageProps> = ({
  msgId,
  displayName,
  text,
  sentAt,
}) => {
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ME'

  const formattedTime = new Date(sentAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex gap-3 bg-paper border border-slate-light p-3.5 rounded-[10px] shadow-sm">
      {/* Sender Avatar */}
      <div className="w-8 h-8 rounded-full bg-route text-card font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-route">
        {initials}
      </div>

      {/* Message Content */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-sans text-sm font-medium text-ink">{displayName}</span>
          <span className="font-mono text-xs text-slate">{formattedTime}</span>
        </div>

        <p className="font-sans text-sm text-ink leading-normal">{text}</p>

        {/* "Propose this as the plan" Button */}
        <ChatProposeButton msgId={msgId} />
      </div>
    </div>
  )
}
