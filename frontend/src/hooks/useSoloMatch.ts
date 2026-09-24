import { useState } from 'react'
import type { GroupMatch, GuideMatch } from '../types/solo'

export function useSoloMatch() {
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([])
  const [guideMatches, setGuideMatches] = useState<GuideMatch[]>([])
  const [loading] = useState(false)

  return { groupMatches, guideMatches, loading, setGroupMatches, setGuideMatches }
}
