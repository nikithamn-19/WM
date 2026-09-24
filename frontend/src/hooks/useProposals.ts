import { useState } from 'react'

export function useProposals() {
  const [submitting, setSubmitting] = useState(false)
  return { submitting, setSubmitting }
}
