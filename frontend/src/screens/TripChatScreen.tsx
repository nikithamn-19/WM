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
  replyTo?: {
    id: string
    senderName: string
    text: string
  }
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
    {
      id: 'm4',
      senderName: 'Nikitha',
      text: '👍 👍',
      timestamp: '02:48 PM',
      isMe: true,
    },
  ])

  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState<ChatMessageItem | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleReply = (msg: ChatMessageItem) => {
    if (replyingTo?.id === msg.id) {
      setReplyingTo(null)
    } else {
      setReplyingTo(msg)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const newMsg: ChatMessageItem = {
      id: `msg_${Date.now()}`,
      senderName: currentUser?.displayName || 'You',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
          }
        : undefined,
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText('')
    setReplyingTo(null)
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Goa Getaway">
      <div className="flex flex-col gap-4 max-w-4xl mx-auto h-[calc(100vh-160px)]">
        {/* Header Title */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold text-ink">Goa Getaway</h1>
          <p className="font-mono text-xs text-slate">June 12–15 • 6 members</p>
        </div>

        {/* Message Stream */}
        <div className="flex-1 bg-card border border-slate-light rounded-[12px] p-6 overflow-y-auto flex flex-col gap-5 shadow-xs">
          <div className="text-center font-mono text-[10px] text-slate uppercase tracking-wider my-1">
            TODAY
          </div>

          {messages.map((msg) => {
            const isTargeted = replyingTo?.id === msg.id

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex flex-col gap-1 max-w-md sm:max-w-lg transition-all ${
                  msg.isMe ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                {/* Sender & Timestamp & Reply Toggle */}
                <div
                  className={`flex items-center gap-2 px-1 font-mono text-[11px] text-slate ${
                    msg.isMe ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <span className="font-bold text-ink">{msg.senderName}</span>
                  <span>{msg.timestamp}</span>

                  <button
                    type="button"
                    onClick={() => toggleReply(msg)}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      isTargeted
                        ? 'bg-route/15 text-route font-bold ring-1 ring-route/30'
                        : 'text-slate/80 hover:text-route hover:bg-paper'
                    }`}
                    title={isTargeted ? 'Cancel reply' : 'Reply to this message'}
                  >
                    {isTargeted ? '✕ Cancel' : '↩ Reply'}
                  </button>
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative p-3.5 rounded-[12px] text-sm font-sans transition-all shadow-xs ${
                    isTargeted ? 'ring-2 ring-route ring-offset-2' : ''
                  } ${
                    msg.isMe
                      ? 'bg-route text-card rounded-tr-none font-medium'
                      : 'bg-paper border border-slate-light text-ink rounded-tl-none'
                  }`}
                >
                  {/* Quoted Message (if this message was a reply) */}
                  {msg.replyTo && (
                    <div
                      onClick={() => {
                        const el = document.getElementById(`msg-${msg.replyTo?.id}`)
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                      className={`mb-2.5 p-2 rounded-[6px] text-xs font-sans cursor-pointer transition-opacity hover:opacity-90 border-l-[3px] ${
                        msg.isMe
                          ? 'bg-black/20 border-card text-card/95'
                          : 'bg-card border-route text-slate'
                      }`}
                      title="Click to jump to message"
                    >
                      <div className="font-bold font-mono text-[10px] uppercase tracking-wider mb-0.5 opacity-85">
                        ↩ Replying to {msg.replyTo.senderName}
                      </div>
                      <div className="truncate text-xs opacity-90 italic">
                        "{msg.replyTo.text}"
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="leading-relaxed break-words">{msg.text}</div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer with Reply-To Preview Banner */}
        <div className="flex flex-col">
          {replyingTo && (
            <div className="bg-paper border border-b-0 border-slate-light px-4 py-2 rounded-t-[12px] flex items-center justify-between shadow-2xs animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2 overflow-hidden text-xs">
                <span className="font-mono font-bold text-route shrink-0">
                  ↩ Replying to {replyingTo.senderName}:
                </span>
                <span className="truncate italic text-slate font-sans">
                  "{replyingTo.text}"
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-slate hover:text-ink text-xs font-mono ml-3 px-1.5 py-0.5 rounded hover:bg-slate-light/40 cursor-pointer"
                title="Cancel reply"
              >
                ✕ Cancel
              </button>
            </div>
          )}

          <form
            onSubmit={handleSend}
            className={`bg-card border border-slate-light p-2.5 flex items-center gap-3 shadow-xs ${
              replyingTo ? 'rounded-b-[12px] border-t-slate-light/60' : 'rounded-[12px]'
            }`}
          >
            <button
              type="button"
              className="p-2 text-slate hover:text-ink rounded-full cursor-pointer"
              title="Attach file"
            >
              📎
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : 'Type a message...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-ink font-sans px-2"
            />
            <Button
              type="submit"
              disabled={!inputText.trim()}
              className="rounded-[8px] px-4 py-2 min-h-[38px] cursor-pointer"
            >
              &gt;
            </Button>
          </form>
        </div>
      </div>
    </PageWrapper>
  )
}
