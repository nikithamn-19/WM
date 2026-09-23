export interface BranchMember {
  bmcId: string
  brcId: string
  usrId: string
  displayName: string
}

export interface Branch {
  brcId: string
  itmId: string
  parentBranchId: string | null
  title: string
  rationale: string // NOT description
  entityType: string | null
  entityId: string | null
  costDelta: string // money as string, NOT estimatedCost
  currency: string
  status: 'OPEN' | 'FINALIZED'
  members: BranchMember[]
}
