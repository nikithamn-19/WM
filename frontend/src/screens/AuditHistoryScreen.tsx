import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { getTrip } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import type { Trip } from '../types/trip'

export const AuditHistoryScreen: React.FC = () => {
  const { trpId = '' } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuthContext()

  const [activeTab, setActiveTab] = useState<'audit' | 'members'>('audit')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!trpId) return
    setIsLoading(true)
    getTrip(trpId, getToken)
      .then((data) => setTrip(data))
      .catch(() => setTrip(null))
      .finally(() => setIsLoading(false))
  }, [trpId, getToken])

  const auditLogs = trip?.itinerary ? [
    {
      revId: `rev_${trip.itinerary.version}`,
      version: `v${trip.itinerary.version}`,
      action: `Itinerary version ${trip.itinerary.version} active (${trip.itinerary.items.length} slots)`,
      actor: trip.ownerId || 'Trip Owner',
      timestamp: new Date().toLocaleDateString(),
    }
  ] : []

  const members = trip?.members || []

  return (
    <PageWrapper trpId={trpId} tripTitle="Audit Log & Members">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">Audit Log &amp; Members</h1>
            <p className="font-mono text-xs text-slate mt-1">Trip ID: {trpId}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/trips/${trpId}`)}>
            &larr; Back to Trip
          </Button>
        </div>

        {/* Primary Tabs */}
        <div className="flex gap-2 border-b border-slate-light pb-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-[8px] font-mono text-xs font-medium capitalize transition-colors min-h-[44px] ${
              activeTab === 'audit'
                ? 'bg-route text-card font-bold shadow-sm'
                : 'text-slate hover:text-ink hover:bg-slate-light/20'
            }`}
          >
            Audit Log
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-[8px] font-mono text-xs font-medium capitalize transition-colors min-h-[44px] ${
              activeTab === 'members'
                ? 'bg-route text-card font-bold shadow-sm'
                : 'text-slate hover:text-ink hover:bg-slate-light/20'
            }`}
          >
            Trip Members ({members.length})
          </button>
        </div>

        {/* Tab 1: Audit Log */}
        {activeTab === 'audit' && (
          <div className="bg-card border border-slate-light rounded-[10px] p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-ink">Revision History</h3>
            {isLoading ? (
              <p className="font-mono text-xs text-slate">Loading audit log...</p>
            ) : auditLogs.length === 0 ? (
              <p className="font-mono text-xs text-slate">No audit records found for this trip.</p>
            ) : (
              <div className="flex flex-col gap-3 font-mono text-xs text-slate">
                {auditLogs.map((log) => (
                  <div
                    key={log.revId}
                    className="p-4 bg-paper rounded-[8px] border border-slate-light flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-route font-bold text-sm">{log.version}</span>
                      <span className="text-[11px] text-slate">{log.timestamp}</span>
                    </div>
                    <p className="font-sans text-sm text-ink font-medium">{log.action}</p>
                    <span className="text-[11px] text-slate">By {log.actor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && (
          <div className="bg-card border border-slate-light rounded-[10px] p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-ink">Trip Members</h3>
            {isLoading ? (
              <p className="font-mono text-xs text-slate">Loading trip members...</p>
            ) : members.length === 0 ? (
              <p className="font-mono text-xs text-slate">No members recorded for this trip.</p>
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                {members.map((m: any) => (
                  <div
                    key={m.memberId || m.usrId}
                    className="flex justify-between items-center p-3.5 bg-paper rounded-[8px] border border-slate-light"
                  >
                    <div className="flex flex-col">
                      <span className="font-sans font-medium text-ink">{m.displayName || m.usrId}</span>
                      <span className="font-mono text-xs text-slate">User ID: {m.usrId}</span>
                    </div>
                    <span
                      className={`font-mono text-xs px-2.5 py-1 rounded-full font-bold capitalize ${
                        m.role === 'owner'
                          ? 'bg-route text-card'
                          : m.role === 'editor'
                          ? 'bg-slate text-card'
                          : 'bg-slate-light text-slate'
                      }`}
                    >
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
