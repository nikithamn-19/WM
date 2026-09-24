import { Star } from 'lucide-react'
import type { GuideMatch } from '../../types/solo'
import { getLanguageName } from './CompatibilityCard'

interface GuideCardProps {
  match: GuideMatch
}

export const GuideCard: React.FC<GuideCardProps> = ({ match }) => {
  const { guide, compatibilityScore, sharedLanguages } = match
  const readableLangs = sharedLanguages.map(getLanguageName).join(', ')

  return (
    <div className="bg-card border border-slate-light rounded-[10px] p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-sans font-medium text-ink text-lg">{guide.displayName}</h4>
            {guide.certified && (
              <span className="bg-amber/10 text-amber font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
                Certified Guide
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-slate capitalize">
            {guide.cityId} · {guide.specialisation} Specialisation
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-4xl font-bold text-route">{compatibilityScore}%</span>
          <span className="text-[10px] font-mono text-slate uppercase">Match</span>
        </div>
      </div>

      <p className="text-xs font-sans text-slate line-clamp-2">{guide.bio}</p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-light/40 text-xs font-mono">
        <span className="text-ink font-semibold">
          Day Rate: ${guide.dayRate} {guide.currency}/day
        </span>
        {guide.rating !== null && guide.rating !== undefined && (
          <span className="text-amber-700 font-bold flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            {guide.rating}
          </span>
        )}
      </div>


      {readableLangs && (
        <div className="text-[11px] font-mono text-slate">
          Languages: {readableLangs}
        </div>
      )}
    </div>
  )
}
