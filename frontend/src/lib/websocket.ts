const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'

export type WSEventType =
  | 'voteCast'
  | 'proposalCreated'
  | 'branchConfirmed'
  | 'slotStatusChanged'
  | 'aiPlanGenerated'

export interface WSEvent {
  type: WSEventType
  trpId: string
  [key: string]: any
}

export function connectTripWebSocket(
  trpId: string,
  usrId: string,
  onMessage: (event: WSEvent) => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/trips/${trpId}/${usrId}`)
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch (err) {
      console.error('WebSocket parse error:', err)
    }
  }
  return ws
}
