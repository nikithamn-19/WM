import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'
import { getTrip } from '../lib/api'
import type { Trip } from '../types/trip'

export interface ChatMessageItem {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
  isEdited?: boolean
  isDeleted?: boolean
}

export const TripChatScreen: React.FC = () => {
  const { trpId } = useParams<{ trpId: string }>()
  const { currentUser } = useAuthContext()
  const { addToast } = useTripContext()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'msg_1',
      senderId: 'usr_priya',
      senderName: 'Priya Sharma',
      text: 'Hey everyone! Excited for Bali 🌴 Should we lock in the Uluwatu Sunset Tour for Day 2?',
      timestamp: '10:14 AM',
    },
    {
      id: 'msg_2',
      senderId: 'usr_owner',
      senderName: 'Alex Chen',
      text: 'Sounds great! I created a proposal for Uluwatu Temple in the itinerary timeline.',
      timestamp: '10:18 AM',
    },
    {
      id: 'msg_3',
      senderId: 'usr_dev',
      senderName: 'Dev Patel',
      text: 'Count me in for seafood dinner afterwards in Jimbaran Bay 🦀',
      timestamp: '10:25 AM',
    },
  ])

  const [inputText, setInputText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!trpId) return
    getTrip(trpId, async () => null)
      .then((t) => setTrip(t))
      .catch(() => null)
  }, [trpId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const newMsg: ChatMessageItem = {
      id: `msg_${Date.now()}`,
      senderId: currentUser?.usrId || 'usr_me',
      senderName: currentUser?.displayName || 'Alex Chen',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText('')
  }

  const handleStartEdit = (msg: ChatMessageItem) => {
    setEditingId(msg.id)
    setEditText(msg.text)
  }

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, text: editText.trim(), isEdited: true } : m
      )
    )
    setEditingId(null)
    setEditText('')
    addToast('Message updated', 'info')
  }

  const handleDelete = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
    addToast('Message deleted', 'info')
  }

  return (
    <PageWrapper
      trpId={trpId}
      tripTitle={trip?.title || 'Bali Tropical Escape'}
      mode={trip?.mode || 'Mode A'}
    >
      <div className="flex flex-col h-[calc(100vh-140px)] bg-card border border-slate-light rounded-[12px] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-light bg-paper flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold text-ink">Trip Group Chat</h1>
            <p className="text-xs font-mono text-slate">
              {trip?.title || 'Bali Trip'} • {messages.length} Messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs text-slate">Online Discussion</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-paper/30">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate font-mono text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === (currentUser?.usrId || 'usr_me') || msg.senderName === 'Alex Chen'
              const isEditing = editingId === msg.id

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-2xl group ${
                    isMe ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                      isMe
                        ? 'bg-route text-card border-route'
                        : 'bg-card text-ink border-slate-light'
                    }`}
                  >
                    {msg.senderName.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Message Bubble */}
                  <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 px-1">
                      <span className="font-sans text-xs font-bold text-ink">
                        {msg.senderName}
                      </span>
                      <span className="font-mono text-[10px] text-slate">{msg.timestamp}</span>
                      {msg.isEdited && (
                        <span className="font-mono text-[9px] text-slate italic">(edited)</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col gap-2 p-3 bg-card border border-route rounded-[10px] min-w-[260px]">
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs font-mono text-slate hover:text-ink"
                          >
                            Cancel
                          </button>
                          <Button
                            onClick={() => handleSaveEdit(msg.id)}
                            className="min-h-[36px] py-1 text-xs"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`p-3.5 rounded-[12px] text-sm font-sans relative ${
                          isMe
                            ? 'bg-route text-card rounded-tr-none shadow-xs'
                            : 'bg-card border border-slate-light text-ink rounded-tl-none shadow-xs'
                        }`}
                      >
                        {msg.text}

                        {/* Action buttons on hover */}
                        <div
                          className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card border border-slate-light rounded-[6px] px-1.5 py-0.5 shadow-sm ${
                            isMe ? '-left-16' : '-right-16'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleStartEdit(msg)}
                            title="Edit Message"
                            className="p-1 text-slate hover:text-route text-xs"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            title="Delete Message"
                            className="p-1 text-slate hover:text-clay text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-4 bg-card border-t border-slate-light flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="Type a message to your trip members..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-paper border border-slate-light rounded-[8px] px-4 py-2.5 text-sm text-ink font-sans outline-none focus:border-route transition-all min-h-[44px]"
          />
          <Button type="submit" disabled={!inputText.trim()}>
            Send
          </Button>
        </form>
      </div>
    </PageWrapper>
  )
}
