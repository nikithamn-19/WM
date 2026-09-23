import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Trip, SlotStatus } from '../types/trip'
import type { Proposal } from '../types/proposal'
import type { WSEvent } from '../lib/websocket'
import { apiFetch } from '../lib/api'

export interface ToastItem {
  id: string
  message: string
  type: 'info' | 'success' | 'conflict'
}

export interface TripContextValue {
  trip: Trip | null
  setTrip: (trip: Trip | null) => void
  wsStatus: 'connecting' | 'connected' | 'disconnected'
  toasts: ToastItem[]
  dismissToast: (id: string) => void
  addToast: (message: string, type?: 'info' | 'success' | 'conflict') => void
}

const TripContext = createContext<TripContextValue | undefined>(undefined)

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'conflict' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Handle incoming WebSocket events cleanly
  const handleWSEvent = useCallback(
    (event: WSEvent) => {
      try {
        switch (event.type) {
          case 'voteCast': {
            addToast('New vote cast', 'info')
            setTrip((prev) => {
              if (!prev || !prev.itinerary) return prev
              const updatedItems = prev.itinerary.items.map((item) => {
                if (item.activeProposal && item.activeProposal.prpId === event.prpId) {
                  const existingVotes = item.activeProposal.votes.filter((v) => v.usrId !== event.usrId)
                  const newVote = {
                    votId: `vot_${Date.now()}`,
                    prpId: event.prpId,
                    usrId: event.usrId,
                    displayName: event.displayName || 'Member',
                    value: event.value as 'yes' | 'no',
                    comment: event.comment || null,
                    castAt: new Date().toISOString(),
                  }
                  return {
                    ...item,
                    activeProposal: {
                      ...item.activeProposal,
                      votes: [...existingVotes, newVote],
                    },
                  }
                }
                return item
              })
              return { ...prev, itinerary: { ...prev.itinerary, items: updatedItems } }
            })
            break
          }

          case 'proposalCreated': {
            addToast('New proposal added', 'info')
            if (event.proposal) {
              const newProp: Proposal = event.proposal
              setTrip((prev) => {
                if (!prev || !prev.itinerary) return prev
                const updatedItems = prev.itinerary.items.map((item) => {
                  if (item.itmId === newProp.itnId) {
                    return {
                      ...item,
                      slotStatus: 'IN_CONSENSUS' as SlotStatus,
                      activeProposal: newProp,
                    }
                  }
                  return item
                })
                return { ...prev, itinerary: { ...prev.itinerary, items: updatedItems } }
              })
            }
            break
          }

          case 'branchConfirmed': {
            addToast('Branch status updated', 'info')
            break
          }

          case 'slotStatusChanged': {
            const newStatus = event.slotStatus as SlotStatus
            if (newStatus === 'BRANCHED') {
              addToast(`Branching underway for slot`, 'conflict')
            } else {
              addToast(`Slot status updated: ${newStatus}`, newStatus === 'CONFIRMED' ? 'success' : 'info')
            }
            setTrip((prev) => {
              if (!prev || !prev.itinerary) return prev
              const updatedItems = prev.itinerary.items.map((item) => {
                if (item.itmId === event.itmId) {
                  return { ...item, slotStatus: newStatus }
                }
                return item
              })
              return { ...prev, itinerary: { ...prev.itinerary, items: updatedItems } }
            })
            break
          }

          case 'aiPlanGenerated': {
            addToast('AI plan ready', 'success')
            break
          }

          default:
            break
        }
      } catch (err) {
        console.error('Error handling WebSocket event:', err)
      }
    },
    [addToast]
  )

  // WebSocket connect logic
  useEffect(() => {
    if (!trip?.trpId) return

    const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'
    const usrId = trip.members?.[0]?.usrId || 'usr_demo_owner'
    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout>

    const connect = () => {
      setWsStatus('connecting')
      try {
        ws = new WebSocket(`${WS_BASE}/ws/trips/${trip.trpId}/${usrId}`)

        ws.onopen = () => {
          setWsStatus('connected')
        }

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data)
            handleWSEvent(data)
          } catch (err) {
            console.error('Error parsing WS message:', err)
          }
        }

        ws.onclose = () => {
          setWsStatus('disconnected')
          // Re-fetch trip state on disconnect/reconnect
          if (trip?.trpId) {
            apiFetch(`/api/trips/${trip.trpId}`)
              .then((data) => setTrip(data))
              .catch(() => {})
          }
          reconnectTimeout = setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          setWsStatus('disconnected')
        }
      } catch (err) {
        console.error('WS Connection error:', err)
        setWsStatus('disconnected')
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimeout)
      if (ws) ws.close()
    }
  }, [trip?.trpId, handleWSEvent])

  return (
    <TripContext.Provider
      value={{
        trip,
        setTrip,
        wsStatus,
        toasts,
        dismissToast,
        addToast,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export const useTripContext = () => {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used within TripProvider')
  return ctx
}
