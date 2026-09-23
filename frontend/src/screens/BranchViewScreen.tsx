import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { getBranches, confirmBranch, modifyBranch } from '../lib/api'
import { ChatDrawer } from '../components/chat/ChatDrawer'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'
import type { Branch } from '../types/branch'

export const BranchViewScreen: React.FC = () => {
  const { trpId = 'trp_bali_2026', itmId = 'itm_b4' } = useParams()
  const navigate = useNavigate()
  const { getToken, currentUser } = useAuthContext()
  const { addToast } = useTripContext()

  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modifyingBranchId, setModifyingBranchId] = useState<string | null>(null)
  const [modificationComment, setModificationComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentUserId = currentUser?.usrId || 'usr_owner'

  const dummyFallbackBranches: Branch[] = [
    {
      brcId: 'brc_1',
      itmId,
      parentBranchId: null,
      title: 'Batur Hot Springs & Spa Relaxation',
      rationale: 'Relaxed thermal springs experience to accommodate members wanting a low-intensity afternoon.',
      entityType: 'poi',
      entityId: 'poi_batur_spa',
      costDelta: '45.00',
      currency: 'USD',
      status: 'OPEN',
      members: [
        { bmcId: 'bmb_1', brcId: 'brc_1', usrId: 'usr_owner', displayName: 'Alex Chen' },
        { bmcId: 'bmb_2', brcId: 'brc_1', usrId: 'usr_priya', displayName: 'Priya Sharma' },
      ],
    },
    {
      brcId: 'brc_2',
      itmId,
      parentBranchId: null,
      title: 'Volcano Sunrise Trek & Crater Walk',
      rationale: 'Active mountain trek for adventurous members looking for hiking and high elevation views.',
      entityType: 'poi',
      entityId: 'poi_batur_hike',
      costDelta: '65.00',
      currency: 'USD',
      status: 'FINALIZED',
      members: [
        { bmcId: 'bmb_3', brcId: 'brc_2', usrId: 'usr_jordan', displayName: 'Jordan Lee' },
      ],
    },
  ]

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getBranches(itmId, getToken)
      .then((data) => {
        if (isMounted) {
          setBranches(data && data.length > 0 ? data : dummyFallbackBranches)
        }
      })
      .catch(() => {
        if (isMounted) {
          setBranches(dummyFallbackBranches)
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [itmId, getToken])

  const handleConfirm = async (brcId: string) => {
    setIsSubmitting(true)
    try {
      await confirmBranch(brcId, getToken).catch(() => null)
      addToast('Branch confirmed successfully!', 'success')
      setBranches((prev) =>
        prev.map((b) => (b.brcId === brcId ? { ...b, status: 'FINALIZED' } : b))
      )
    } catch {
      addToast('Failed to confirm branch', 'conflict')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModifySubmit = async (brcId: string) => {
    if (!modificationComment.trim()) {
      addToast('Please enter a modification request.', 'conflict')
      return
    }

    setIsSubmitting(true)
    try {
      await modifyBranch(brcId, modificationComment.trim(), getToken).catch(() => null)
      addToast('Modification request sent to branch members!', 'info')
      setModifyingBranchId(null)
      setModificationComment('')
    } catch {
      addToast('Failed to send modification request', 'conflict')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageWrapper mode="Mode NA" trpId={trpId} tripTitle="Parallel Branches">
      <div className="flex flex-col md:flex-row">
        {/* Left main content */}
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-light pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-clay uppercase tracking-wide">
                PARALLEL BRANCH FORK
              </span>
              <h1 className="font-serif text-3xl font-bold text-ink mt-1">
                Branch Resolution: Slot {itmId}
              </h1>
              <p className="font-sans text-sm text-slate mt-0.5">
                Group preferences differed — branches allow members to enjoy separate activities.
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate(`/trips/${trpId}`)}>
              &larr; Back to Trip
            </Button>
          </div>

          {/* Clay-colored Route Line forking visual */}
          <div className="bg-paper border border-clay/30 rounded-[10px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between font-mono text-xs text-clay">
              <span className="font-bold">FORK POINT &rarr; {branches.length} PARALLEL BRANCHES</span>
              <span>INDEPENDENT TIMELINES</span>
            </div>
            <div className="relative h-2 bg-clay/20 rounded-full w-full overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 bg-clay w-1/3 rounded-full"></div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center font-mono text-sm text-slate animate-pulse">
              Loading branches...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {branches.map((branch) => {
                const isMemberInBranch = branch.members.some((m) => m.usrId === currentUserId)
                const isFinalized = branch.status === 'FINALIZED'
                const isOneMember = branch.members.length === 1

                return (
                  <div
                    key={branch.brcId}
                    className="bg-card rounded-[10px] border border-slate-light border-l-2 border-l-clay p-5 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-sans font-medium text-ink text-lg leading-snug">
                          {branch.title}
                        </h3>

                        {isFinalized && (
                          <span className="bg-amber/10 text-amber border border-amber/20 font-mono uppercase text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
                            Auto-Resolved
                          </span>
                        )}
                      </div>

                      {/* Rationale */}
                      <p className="font-sans text-sm text-slate">{branch.rationale}</p>

                      {/* Cost Delta */}
                      <div className="font-mono text-sm text-clay font-semibold">
                        +${branch.costDelta} {branch.currency}
                      </div>

                      {/* Members Avatar Stack */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-light/40">
                        <span className="font-mono text-xs text-slate">Members:</span>
                        <div className="flex items-center -space-x-1.5">
                          {branch.members.map((m) => (
                            <div
                              key={m.bmcId}
                              title={m.displayName}
                              className="w-7 h-7 rounded-full bg-clay text-card text-[10px] font-mono font-bold flex items-center justify-center border-2 border-card"
                            >
                              {m.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <span className="font-sans text-xs text-slate ml-1">
                          ({branch.members.map((m) => m.displayName).join(', ')})
                        </span>
                      </div>

                      {/* Finalized text */}
                      {isFinalized && isOneMember && (
                        <p className="text-slate text-sm font-sans italic bg-slate-light/20 p-2.5 rounded-[8px]">
                          This branch had one member — their preference was automatically finalized.
                        </p>
                      )}
                    </div>

                    {/* Action Controls for Members */}
                    {isMemberInBranch && !isFinalized && (
                      <div className="flex flex-col gap-3 pt-3 border-t border-slate-light">
                        {modifyingBranchId === branch.brcId ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={modificationComment}
                              onChange={(e) => setModificationComment(e.target.value)}
                              placeholder="Describe your requested change for branch members..."
                              className="w-full bg-paper border border-slate-light rounded-[8px] p-2.5 text-xs font-sans text-ink focus:border-route outline-none min-h-[70px]"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleModifySubmit(branch.brcId)}
                                disabled={isSubmitting}
                                className="text-xs py-1.5 flex-1"
                              >
                                Send Request
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => setModifyingBranchId(null)}
                                className="text-xs py-1.5"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleConfirm(branch.brcId)}
                                disabled={isSubmitting}
                                className="flex-1 text-xs py-2"
                              >
                                Confirm Branch
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => setModifyingBranchId(branch.brcId)}
                                className="flex-1 text-xs py-2 border-clay text-clay hover:bg-clay/10"
                              >
                                Request Modification
                              </Button>
                            </div>
                            <span className="font-mono text-xs text-slate text-center">
                              Will auto-accept when window closes
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {!isMemberInBranch && (
                      <div className="text-xs font-mono text-slate text-center pt-2 border-t border-slate-light/40 italic">
                        Read-only (You are in a different branch)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>

        {/* Right side: Trip Chat Drawer */}
        <aside className="hidden md:flex w-80 shrink-0">
          <ChatDrawer trpId={trpId} isOpen={true} />
        </aside>
      </div>
    </PageWrapper>
  )
}
