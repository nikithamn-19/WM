import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useAuthContext } from '../context/AuthContext'

export interface ChatMessageItem {
  id: string
  senderName: string
  text: string
  timestamp: string
  isMe?: boolean
}

export const TripChatScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const { currentUser } = useAuthContext()

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'm1',
      senderName: 'Maya',
      text: 'Hey everyone, are we still meeting at breakfast around 9?',
      timestamp: '10:14 AM',
      isMe: false,
    },
    {
      id: 'm2',
      senderName: 'Alex',
      text: 'I think that works. We can head to the beach together afterwards.',
      timestamp: '10:22 AM',
      isMe: false,
    },
    {
      id: 'm3',
      senderName: 'You',
      text: "Sounds good! I'll be there.",
      timestamp: '10:35 AM',
      isMe: true,
    },
  ])

  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const newMsg: ChatMessageItem = {
      id: `msg_${Date.now()}`,
      senderName: currentUser?.displayName || 'You',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText('')
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Goa Getaway">
      <div className="flex flex-col gap-4 max-w-4xl mx-auto h-[calc(100vh-160px)]">
        {/* Header Title (PDF Page 15 Design) */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold text-ink">Goa Getaway</h1>
          <p className="font-mono text-xs text-slate">June 12–15 • 6 members</p>
        </div>

        {/* Day Tabs */}
        <div className="flex items-center justify-center gap-4 border-b border-slate-light pb-2">
          <span className="font-mono text-xs font-bold text-route border-b-2 border-route pb-1">
            Day 1: Arrival
          </span>
          <span className="font-mono text-xs text-slate hover:text-ink cursor-pointer">
            Day 2: Beach
          </span>
          <span className="font-mono text-xs text-slate hover:text-ink cursor-pointer">
            Day 3: Explore
          </span>
        </div>

        {/* Message Stream (PDF Page 15 Design) */}
        <div className="flex-1 bg-card border border-slate-light rounded-[12px] p-6 overflow-y-auto flex flex-col gap-4 shadow-xs">
          <div className="text-center font-mono text-[10px] text-slate uppercase tracking-wider my-2">
            TODAY
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 max-w-lg ${
                msg.isMe ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div className="flex items-center gap-2 px-1 font-mono text-[11px] text-slate">
                <span className="font-bold text-ink">{msg.senderName}</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`p-3.5 rounded-[12px] text-sm font-sans ${
                  msg.isMe
                    ? 'bg-route text-card rounded-tr-none shadow-xs font-medium'
                    : 'bg-paper border border-slate-light text-ink rounded-tl-none shadow-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Bar (PDF Page 15 Design) */}
        <form
          onSubmit={handleSend}
          className="bg-card border border-slate-light p-2.5 rounded-[12px] flex items-center gap-3 shadow-xs"
        >
          <button
            type="button"
            className="p-2 text-slate hover:text-ink rounded-full"
            title="Attach file"
          >
            📎
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-ink font-sans px-2"
          />
          <Button
            type="submit"
            disabled={!inputText.trim()}
            className="rounded-[8px] px-4 py-2 min-h-[38px]"
          >
            &gt;
          </Button>
        </form>
      </div>
    </PageWrapper>
  )
}
