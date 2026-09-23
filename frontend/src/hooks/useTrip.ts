import { useState } from 'react'
import type { Trip } from '../types/trip'

export function useTrip(_trpId?: string) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  return { trip, loading, error, setTrip }
}
