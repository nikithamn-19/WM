import React from 'react'
import type { GroupMatch } from '../../types/solo'
import { Button } from '../ui/Button'
import { CheckCircle } from 'lucide-react'

export const languageNames: Record<string, string> = {
  'en': 'English',
  'en-IN': 'English (India)',
  'hi': 'Hindi',
  'kn': 'Kannada',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'ja': 'Japanese',
  'zh': 'Mandarin',
}

export function getLanguageName(code: string): string {
  return languageNames[code] ?? code
}

interface CompatibilityCardProps {
  match: GroupMatch
  onJoinClick?: () => void
}

export const CompatibilityCard: React.FC<CompatibilityCardProps> = ({ match, onJoinClick }) => {
  const readableLangs = match.sharedLanguages.map(getLanguageName).join(', ')

  return (
    <div className="bg-card border border-slate-light rounded-[10px] p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-sans font-medium text-ink text-lg">{match.trip.title}</h4>
          <span className="text-sm font-mono text-slate">
            {match.trip.destinationCityId} · {match.trip.startDate} to {match.trip.endDate}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-4xl font-bold text-route">{match.compatibilityScore}%</span>
          <span className="text-[10px] font-mono text-slate uppercase">Compatibility</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-mono text-slate">
        {match.ageGroupMatch && (
          <span className="bg-route/10 text-route px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Age Group
          </span>
        )}

        {match.sharedLanguages.length > 0 && (
          <span className="bg-slate/10 px-2.5 py-1 rounded-full">
            Languages: {readableLangs}
          </span>
        )}
        {match.sharedInterests.length > 0 && (
          <span className="bg-slate/10 px-2.5 py-1 rounded-full">
            Interests: {match.sharedInterests.join(', ')}
          </span>
        )}
        <span className="bg-slate/10 px-2.5 py-1 rounded-full">
          Overlap: {match.dateOverlapDays} days
        </span>
      </div>

      <Button onClick={onJoinClick} className="w-full mt-1">
        Request to Join
      </Button>
    </div>
  )
}
