import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'

export const AuditHistoryScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'audit' | 'members'>('audit')

  const dummyAuditLogs = [
    {
      revId: 'rev_3',
      version: 'v3',
      action: 'AI Blended Plan accepted for Afternoon Slot (Dudhsagar Waterfalls)',
      actor: 'Alex Chen (Owner)',
      timestamp: '2026-10-12 14:30',
    },
    {
      revId: 'rev_2',
      version: 'v2',
      action: 'Vote cast (NO) with suggestion: "Dudhsagar Jeep safari instead of long trek"',
      actor: 'Priya Sharma (Editor)',
      timestamp: '2026-10-12 13:15',
    },
    {
      revId: 'rev_1',
      version: 'v1',
      action: 'Initial itinerary created with 4 time slots',
      actor: 'Alex Chen (Owner)',
      timestamp: '2026-10-12 10:00',
    },
  ]

  const dummyMembers = [
    { tmbId: 'tmb_1', name: 'Alex Chen', role: 'owner' as const, email: 'alex@example.com' },
    { tmbId: 'tmb_2', name: 'Priya Sharma', role: 'editor' as const, email: 'priya@example.com' },
    { tmbId: 'tmb_3', name: 'Jordan Lee', role: 'editor' as const, email: 'jordan@example.com' },
    { tmbId: 'tmb_4', name: 'Sam Rivera', role: 'viewer' as const, email: 'sam@example.com' },
  ]

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
            Trip Members
          </button>
        </div>

        {/* Tab 1: Audit Log */}
        {activeTab === 'audit' && (
          <div className="bg-card border border-slate-light rounded-[10px] p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-ink">Revision History</h3>
            <div className="flex flex-col gap-3 font-mono text-xs text-slate">
              {dummyAuditLogs.map((log) => (
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
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && (
          <div className="bg-card border border-slate-light rounded-[10px] p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-ink">Trip Members</h3>
            <div className="flex flex-col gap-3 text-sm">
              {dummyMembers.map((m) => (
                <div
                  key={m.tmbId}
                  className="flex justify-between items-center p-3.5 bg-paper rounded-[8px] border border-slate-light"
                >
                  <div className="flex flex-col">
                    <span className="font-sans font-medium text-ink">{m.name}</span>
                    <span className="font-mono text-xs text-slate">{m.email}</span>
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
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
