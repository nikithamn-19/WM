import React from 'react'
import type { Branch } from '../../types/branch'

interface BranchTabsProps {
  branches: Branch[]
  activeBranchId?: string
  onSelectBranch: (branchId: string) => void
}

export const BranchTabs: React.FC<BranchTabsProps> = ({
  branches,
  activeBranchId,
  onSelectBranch,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {branches.map((branch) => {
        const isActive = branch.brcId === activeBranchId
        return (
          <button
            key={branch.brcId}
            onClick={() => onSelectBranch(branch.brcId)}
            className={`px-4 py-2 rounded-[10px] text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-clay text-paper'
                : 'bg-paper text-ink border border-slate-light hover:bg-slate-light/30'
            }`}
          >
            {branch.title}
          </button>
        )
      })}
    </div>
  )
}
