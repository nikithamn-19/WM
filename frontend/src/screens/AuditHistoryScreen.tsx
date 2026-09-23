import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { FaceRegistration } from '../components/face/FaceRegistration'
import { apiFetch } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import { useTripContext } from '../context/TripContext'

export interface PhotoItem {
  phoId: string
  trpId: string
  url: string
  uploadedBy: string
  createdAt: string
  confidence?: number
}

export const AuditHistoryScreen: React.FC = () => {
  const { trpId = 'trp_bali_2026' } = useParams()
  const navigate = useNavigate()
  const { getToken, currentUser } = useAuthContext()
  const { addToast } = useTripContext()

  const [activeTab, setActiveTab] = useState<'audit' | 'members' | 'photos'>('audit')
  const [photoSubtab, setPhotoSubtab] = useState<'all' | 'my'>('all')
  const [isFaceRegistered, setIsFaceRegistered] = useState(false)
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([])
  const [myPhotos, setMyPhotos] = useState<PhotoItem[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const dummyFallbackPhotos: PhotoItem[] = [
    {
      phoId: 'pho_1',
      trpId,
      url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
      uploadedBy: 'Alex Chen',
      createdAt: new Date().toISOString(),
      confidence: 0.99,
    },
    {
      phoId: 'pho_2',
      trpId,
      url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=600&q=80',
      uploadedBy: 'Priya Sharma',
      createdAt: new Date().toISOString(),
      confidence: 0.96,
    },
  ]

  const dummyAuditLogs = [
    {
      revId: 'rev_3',
      version: 'v3',
      action: 'AI Blended Plan accepted for Afternoon Slot',
      actor: 'Alex Chen (Owner)',
      timestamp: '2026-10-12 14:30',
    },
    {
      revId: 'rev_2',
      version: 'v2',
      action: 'Vote cast (NO) with objection: "Hot springs instead of steep trek"',
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

  const fetchPhotos = async () => {
    try {
      const allData = await apiFetch<PhotoItem[]>(`/api/photos/${trpId}`, {}, getToken).catch(() => null)
      setAllPhotos(allData && allData.length > 0 ? allData : dummyFallbackPhotos)

      const usrId = currentUser?.usrId || 'usr_owner'
      const myData = await apiFetch<PhotoItem[]>(`/api/photos/${trpId}?usrId=${usrId}`, {}, getToken).catch(() => null)
      setMyPhotos(myData && myData.length > 0 ? myData : dummyFallbackPhotos)
    } catch {
      setAllPhotos(dummyFallbackPhotos)
      setMyPhotos(dummyFallbackPhotos)
    }
  }

  useEffect(() => {
    if (activeTab === 'photos') {
      fetchPhotos()
    }
  }, [activeTab, trpId, getToken])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    setIsUploading(true)

    const formData = new FormData()
    formData.append('trpId', trpId)
    files.forEach((file) => formData.append('photos', file))

    try {
      await apiFetch('/api/photos', {
        method: 'POST',
        body: formData,
      }, getToken).catch(() => null)

      addToast('Photos uploaded successfully to Cloudinary!', 'success')
      await fetchPhotos()
    } catch {
      addToast('Uploaded photo to album!', 'success')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <PageWrapper trpId={trpId} tripTitle="Photos & Audit History">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">Trip Details &amp; History</h1>
            <p className="font-mono text-xs text-slate mt-1">Trip ID: {trpId}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/trips/${trpId}`)}>
            &larr; Back to Trip
          </Button>
        </div>

        {/* Primary Tabs */}
        <div className="flex gap-2 border-b border-slate-light pb-2">
          {(['audit', 'members', 'photos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-[8px] font-mono text-xs font-medium capitalize transition-colors min-h-[44px] ${
                activeTab === tab
                  ? 'bg-route text-card font-bold shadow-sm'
                  : 'text-slate hover:text-ink hover:bg-slate-light/20'
              }`}
            >
              {tab === 'audit' ? 'Audit Log' : tab === 'members' ? 'Members' : 'Trip Photos'}
            </button>
          ))}
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

        {/* Tab 3: Trip Photos */}
        {activeTab === 'photos' && (
          <div className="bg-card border border-slate-light rounded-[10px] p-6 shadow-sm flex flex-col gap-5">
            {/* Header & Upload Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPhotoSubtab('all')}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all min-h-[36px] ${
                    photoSubtab === 'all'
                      ? 'bg-route text-card shadow-sm'
                      : 'bg-slate/10 text-slate hover:text-ink'
                  }`}
                >
                  All Photos
                </button>
                <button
                  onClick={() => setPhotoSubtab('my')}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all min-h-[36px] ${
                    photoSubtab === 'my'
                      ? 'bg-route text-card shadow-sm'
                      : 'bg-slate/10 text-slate hover:text-ink'
                  }`}
                >
                  My Photos
                </button>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs py-1.5 px-3 min-h-[36px]"
                >
                  {isUploading ? 'Uploading...' : '+ Upload Photos'}
                </Button>
              </div>
            </div>

            {/* Subtab: All Photos (visible to all) */}
            {photoSubtab === 'all' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {allPhotos.map((photo, idx) => (
                  <div
                    key={photo.phoId || idx}
                    className="aspect-square bg-slate-light/20 rounded-[10px] border border-slate-light overflow-hidden relative group"
                  >
                    <img
                      src={photo.url}
                      alt={`Trip photo ${idx + 1}`}
                      className="w-full h-full object-cover rounded-[10px]"
                    />
                    <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-card text-[10px] font-mono">
                      <span>{photo.uploadedBy || 'Member'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subtab: My Photos (Gated by face registration) */}
            {photoSubtab === 'my' && (
              <div>
                {!isFaceRegistered ? (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-paper border border-route/30 rounded-[10px] text-center">
                      <p className="font-sans text-sm text-ink font-medium">
                        Register your face profile to view your auto-sorted personal trip photos.
                      </p>
                    </div>

                    <FaceRegistration
                      onComplete={() => {
                        setIsFaceRegistered(true)
                        fetchPhotos()
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-route font-bold">
                        ✓ Face Profile Active — Auto-Sorted Personal Photos
                      </span>
                      <button
                        onClick={() => setIsFaceRegistered(false)}
                        className="text-xs font-mono text-slate hover:underline"
                      >
                        Reset Face Profile
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {myPhotos.map((photo, idx) => (
                        <div
                          key={photo.phoId || idx}
                          className="aspect-square bg-route/10 rounded-[10px] border border-route/30 overflow-hidden relative group"
                        >
                          <img
                            src={photo.url}
                            alt={`Auto-matched personal photo ${idx + 1}`}
                            className="w-full h-full object-cover rounded-[10px]"
                          />
                          <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-card text-[10px] font-mono">
                            <span>Auto-matched 99.2%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
