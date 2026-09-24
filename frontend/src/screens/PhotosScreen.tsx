import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Folder } from 'lucide-react'

import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { FaceRegistration } from '../components/face/FaceRegistration'
import { useTripContext } from '../context/TripContext'
import { apiFetch, getTrip } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'
import type { Trip } from '../types/trip'

export interface PhotoItem {
  id: string
  folder: string
  title: string
  caption: string
  url: string
  uploadedBy: string
  timestamp: string
}

export const PhotosScreen: React.FC = () => {
  const { trpId } = useParams<{ trpId: string }>()
  const { addToast } = useTripContext()
  const { getToken } = useAuthContext()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [folders, setFolders] = useState<string[]>([
    'All Photos',
    'General Gallery',
  ])
  const [selectedFolder, setSelectedFolder] = useState<string>('All Photos')

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [isFaceRegistered, setIsFaceRegistered] = useState(false)

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadUrl, setUploadUrl] = useState('')
  const [uploadFolderTarget, setUploadFolderTarget] = useState('General Gallery')

  // New Folder Form State
  const [newFolderName, setNewFolderName] = useState('')

  const fetchPhotos = async () => {
    if (!trpId) return
    setIsLoading(true)
    try {
      const data = await apiFetch<any[]>(`/api/trips/${trpId}/photos`, {}, getToken)
      if (data) {
        const mapped: PhotoItem[] = data.map((p) => ({
          id: p.photoId,
          folder: 'General Gallery',
          title: 'Trip Memory',
          caption: '',
          url: p.photoUrl,
          uploadedBy: p.uploaderName || 'Traveler',
          timestamp: new Date(p.createdAt || Date.now()).toLocaleDateString(),
        }))
        setPhotos(mapped)
      }
    } catch {
      setPhotos([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!trpId) return
    getTrip(trpId, getToken)
      .then((t) => setTrip(t))
      .catch(() => null)
    fetchPhotos()
  }, [trpId, getToken])

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    const formatted = newFolderName.trim()
    if (folders.includes(formatted)) {
      addToast('Folder already exists', 'conflict')
      return
    }
    setFolders((prev) => [...prev, formatted])
    setSelectedFolder(formatted)
    setNewFolderName('')
    setIsNewFolderOpen(false)
    addToast(`Folder "${formatted}" created`, 'success')
  }

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadUrl.trim() || !trpId) return

    try {
      const res = await apiFetch(`/api/trips/${trpId}/photos`, {
        method: 'POST',
        body: JSON.stringify({ photoUrl: uploadUrl.trim() }),
      }, getToken)

      const newPhoto: PhotoItem = {
        id: res.photoId,
        folder: uploadFolderTarget,
        title: uploadTitle.trim() || 'Trip Memory',
        caption: uploadCaption.trim(),
        url: res.photoUrl,
        uploadedBy: res.uploaderName || 'Traveler',
        timestamp: new Date().toLocaleDateString(),
      }

      setPhotos((prev) => [newPhoto, ...prev])
      setIsUploadOpen(false)
      setUploadTitle('')
      setUploadCaption('')
      setUploadUrl('')
      addToast('Photo uploaded successfully!', 'success')
    } catch (err: any) {
      addToast('Failed to upload photo to backend', 'conflict')
    }
  }

  const filteredPhotos =
    selectedFolder === 'All Photos'
      ? photos
      : photos.filter((p) => p.folder === selectedFolder)

  return (
    <PageWrapper
      trpId={trpId}
      tripTitle={trip?.title || 'Goa Sunsets, Beaches & Heritage Getaway'}
      mode={trip?.mode || 'Mode A'}
    >
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">Trip Photos</h1>
            {isLoading && <p className="font-mono text-xs text-slate mt-1">Loading gallery photos...</p>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsNewFolderOpen(true)}
            >
              + New Folder
            </Button>
            <Button onClick={() => setIsUploadOpen(true)}>
              + Upload Photo
            </Button>
          </div>
        </div>

        {/* Face Registration Banner */}
        {!isFaceRegistered && (
          <div className="bg-card border border-slate-light p-4 rounded-[10px] shadow-xs">
            <FaceRegistration onComplete={() => setIsFaceRegistered(true)} />
          </div>
        )}

        {/* Folder Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-light pb-2 scrollbar-none">
          {folders.map((folder) => (
            <button
              key={folder}
              type="button"
              onClick={() => setSelectedFolder(folder)}
              className={`px-4 py-2 rounded-[8px] font-mono text-xs font-medium transition-all whitespace-nowrap min-h-[40px] ${
                selectedFolder === folder
                  ? 'bg-route text-card font-bold shadow-xs'
                  : 'bg-paper text-slate hover:text-ink border border-slate-light/60'
              }`}
            >
              <Folder className="w-3.5 h-3.5 inline mr-1" />
              {folder}
            </button>
          ))}
        </div>

        {/* Photos Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="p-12 text-center bg-card border border-slate-light rounded-[10px] font-mono text-sm text-slate">
            No photos found in folder "{selectedFolder}". Upload the first photo!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-card border border-slate-light rounded-[12px] overflow-hidden shadow-xs hover:border-route transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-paper overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 right-2 bg-ink/70 text-card font-mono text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {photo.folder}
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-ink leading-snug">
                      {photo.title}
                    </h3>
                    {photo.caption && (
                      <p className="font-sans text-xs text-slate mt-1 leading-relaxed">
                        {photo.caption}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-light/50 pt-2.5 font-mono text-[11px] text-slate">
                    <span>By {photo.uploadedBy}</span>
                    <span>{photo.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Folder */}
        {isNewFolderOpen && (
          <Modal
            isOpen={isNewFolderOpen}
            onClose={() => setIsNewFolderOpen(false)}
            title="Create New Photo Folder"
          >
            <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
              <Input
                label="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Day 3 - Waterfalls"
                required
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsNewFolderOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!newFolderName.trim()}>
                  Create Folder
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal: Upload Photo */}
        {isUploadOpen && (
          <Modal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            title="Upload Trip Photo"
          >
            <form onSubmit={handleUploadPhoto} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate font-sans">
                  Select Folder
                </label>
                <select
                  value={uploadFolderTarget}
                  onChange={(e) => setUploadFolderTarget(e.target.value)}
                  className="bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-sm text-ink outline-none min-h-[44px]"
                >
                  {folders
                    .filter((f) => f !== 'All Photos')
                    .map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                </select>
              </div>

              <Input
                label="Photo Image URL"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                required
              />

              <Input
                label="Header / Title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Beach Sunset at Canggu"
                required
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate font-sans">
                  Caption / Description
                </label>
                <textarea
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Add details about this memory..."
                  rows={3}
                  className="bg-paper border border-slate-light rounded-[8px] p-3 text-sm text-ink outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsUploadOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!uploadTitle.trim() || !uploadUrl.trim()}>
                  Upload Photo
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </PageWrapper>
  )
}
