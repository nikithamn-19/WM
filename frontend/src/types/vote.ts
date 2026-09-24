export interface Vote {
  votId: string
  prpId: string
  usrId: string
  displayName: string
  value: 'yes' | 'no' // NEVER 'abstain'
  comment: string | null // required when value === 'no'
  castAt: string
}
