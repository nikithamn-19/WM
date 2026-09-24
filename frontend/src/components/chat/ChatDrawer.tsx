import React, { useEffect, useState, useRef } from 'react'
import { ChatMessageItem } from './ChatMessage'
import { Button } from '../ui/Button'
import { getChatMessages, sendChatMessage, type ChatMessage } from '../../lib/api'
import { useAuthContext } from '../../context/AuthContext'
import { useTripContext } from '../../context/TripContext'
import { X } from 'lucide-react'


export interface ChatDrawerProps {
  trpId: string
  isOpen?: boolean
  onClose?: () => void
  isMobileDrawer?: boolean
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  trpId,
  isOpen = true,
  onClose,
  isMobileDrawer = false,
}) => {
  const { getToken, currentUser } = useAuthContext()
  const { addToast } = useTripContext()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!isOpen || !trpId) return

    setIsLoading(true)
    getChatMessages(trpId, getToken)
      .then((data) => {
        setMessages(data || [])
      })
      .catch(() => {
        setMessages([])
      })
      .finally(() => {
        setIsLoading(false)
        scrollToBottom()
      })
  }, [trpId, isOpen, getToken])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const messageText = inputText.trim()
    setInputText('')

    // Optimistic Update
    const tempMsg: ChatMessage = {
      msgId: `temp_${Date.now()}`,
      trpId,
      usrId: currentUser?.usrId || 'usr_me',
      displayName: currentUser?.displayName || 'Alex Chen',
      text: messageText,
      sentAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempMsg])

    try {
      const realMsg = await sendChatMessage({ trpId, text: messageText }, getToken).catch(() => {
        return tempMsg
      })

      // Replace optimistic message with real message
      setMessages((prev) =>
        prev.map((m) => (m.msgId === tempMsg.msgId ? realMsg || tempMsg : m))
      )
    } catch {
      addToast('Failed to send chat message', 'conflict')
      // Revert optimistic update
      setMessages((prev) => prev.filter((m) => m.msgId !== tempMsg.msgId))
    }
  }

  if (!isOpen && isMobileDrawer) return null

  const drawerContent = (
    <div className="flex flex-col h-full bg-card border-l border-slate-light w-full md:w-80 shadow-md">
      {/* Drawer Header */}
      <div className="px-4 py-3 border-b border-slate-light flex items-center justify-between bg-card sticky top-0 z-10">
        <div>
          <h3 className="font-serif font-bold text-ink text-base">Trip Chat</h3>
          <span className="font-mono text-xs text-slate">Always-on group discussion</span>
        </div>

        {onClose && isMobileDrawer && (
          <button
            onClick={onClose}
            className="text-slate hover:text-ink font-mono text-lg font-bold px-2 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-slate" />
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="text-center font-mono text-xs text-slate p-4 animate-pulse">
            Loading chat messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center font-mono text-xs text-slate p-8 border border-dashed border-slate-light rounded-[8px] flex flex-col items-center justify-center gap-1">
            <span className="font-bold text-ink text-sm">No messages yet</span>
            <span>Start the group conversation for this trip!</span>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageItem
              key={msg.msgId}
              msgId={msg.msgId}
              displayName={msg.displayName}
              text={msg.text}
              sentAt={msg.sentAt}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-light bg-paper flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message or proposal..."
          className="flex-1 bg-card border border-slate-light rounded-[8px] px-3 py-2 text-sm font-sans text-ink focus:border-route outline-none"
        />
        <Button type="submit" className="text-xs px-3 py-2 min-h-[40px]">
          Send
        </Button>
      </form>
    </div>
  )

  if (isMobileDrawer) {
    return (
      <div className="fixed inset-0 z-50 bg-ink/50 flex justify-end md:hidden">
        {drawerContent}
      </div>
    )
  }

  return drawerContent
}
