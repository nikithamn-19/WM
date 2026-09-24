import { useState } from 'react'

export function useVotes() {
  const [submitting, setSubmitting] = useState(false)
  return { submitting, setSubmitting }
}
