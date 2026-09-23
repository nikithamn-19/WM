import React, { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { FaceRegistration } from '../components/face/FaceRegistration'
import { useTripContext } from '../context/TripContext'

export interface MemoryPhotoItem {
  id: string
  folder: string
  day: string
  title: string
  url: string
}

export const MemoriesScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const { addToast } = useTripContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const INITIAL_FOLDERS = [
    'All',
    'Arrival & Resort',
    'Baga Beach & Water Sports',
    'Dudhsagar Trek & Spice Trail',
  ]

  const INITIAL_PHOTOS: MemoryPhotoItem[] = [
    {
      id: 'm1',
      folder: 'Baga Beach & Water Sports',
      day: 'Day 1',
      title: 'Group Jump at Sunset',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'm2',
      folder: 'Arrival & Resort',
      day: 'Day 1',
      title: 'Poolside Sunset View',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'm3',
      folder: 'Baga Beach & Water Sports',
      day: 'Day 2',
      title: 'Seafood Platter at Shack',
      url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'm4',
      folder: 'Dudhsagar Trek & Spice Trail',
      day: 'Day 3',
      title: 'Heritage Fort Aguada View',
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    },
  ]

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [selectedDay, setSelectedDay] = useState<string>('All')
  const [selectedFolder, setSelectedFolder] = useState<string>('All')

  // Persistent Folders State
  const [folders, setFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`wm_folders_${trpId}`)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Error reading folders from localStorage', e)
    }
    return INITIAL_FOLDERS
  })

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isFaceRegistered, setIsFaceRegistered] = useState(false)
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [tripStory, setTripStory] = useState(
    'The trip kicked off with lazy mornings at Artjuna, sipping fresh coffee under the banyan trees. As the days blurred into sun-drenched afternoons on Candolim, the evenings were marked by long, reflective sunset walks along the shoreline capturing the vibrant hues of the Arabian Sea.'
  )

  // Persistent Photos State
  const [photos, setPhotos] = useState<MemoryPhotoItem[]>(() => {
    try {
      const saved = localStorage.getItem(`wm_photos_${trpId}`)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Error reading photos from localStorage', e)
    }
    return INITIAL_PHOTOS
  })

  // Save folders & photos to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem(`wm_folders_${trpId}`, JSON.stringify(folders))
    } catch (e) {
      console.error('Error saving folders to localStorage', e)
    }
  }, [folders, trpId])

  React.useEffect(() => {
    try {
      localStorage.setItem(`wm_photos_${trpId}`, JSON.stringify(photos))
    } catch (e) {
      console.error('Error saving photos to localStorage', e)
    }
  }, [photos, trpId])

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleDownloadAll = () => {
    addToast(`Downloading all ${photos.length} high-res trip photos...`, 'success')
  }

  const handleDownloadSelected = () => {
    addToast(`Downloading ${selectedPhotoIds.length} selected photos...`, 'success')
  }

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    const name = newFolderName.trim()
    if (folders.includes(name)) {
      addToast('Folder already exists', 'conflict')
      return
    }
    const updatedFolders = [...folders, name]
    setFolders(updatedFolders)
    setSelectedFolder(name)
    setNewFolderName('')
    setIsNewFolderOpen(false)
    addToast(`Folder "${name}" created and saved!`, 'success')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const filesArray = Array.from(e.target.files)

    const targetFolder = selectedFolder === 'All' ? 'Arrival & Resort' : selectedFolder
    const targetDay = selectedDay === 'All' ? 'Day 1' : selectedDay

    const newItemsPromises = filesArray.map((file, idx) => {
      return new Promise<MemoryPhotoItem>((resolve) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string
          resolve({
            id: `m_upload_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
            folder: targetFolder,
            day: targetDay,
            title: file.name.replace(/\.[^/.]+$/, ''),
            url: dataUrl || URL.createObjectURL(file),
          })
        }
        reader.readAsDataURL(file)
      })
    })

    const newPhotoItems = await Promise.all(newItemsPromises)
    setPhotos((prev) => [...newPhotoItems, ...prev])
    addToast(`Attached & saved ${filesArray.length} photo(s) in folder "${targetFolder}"!`, 'success')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleGenerateStory = () => {
    setIsGeneratingStory(true)
    setTimeout(() => {
      setTripStory(
        'From thrilling Dudhsagar jungle jeep treks to peaceful sunset dinners at Anjuna Beach, the crew explored Old Goa’s heritage forts and relished coastal seafood feasts together.'
      )
      setIsGeneratingStory(false)
      addToast('New narrative trip story generated with AI!', 'success')
    }, 1200)
  }

  const filteredPhotos = photos.filter((p) => {
    const matchesDay = selectedDay === 'All' || p.day === selectedDay
    const matchesFolder = selectedFolder === 'All' || p.folder === selectedFolder
    return matchesDay && matchesFolder
  })

  return (
    <PageWrapper trpId={trpId} tripTitle="Goa Getaway">
      {/* Hidden File Input for uploading local gallery photos */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col gap-8 max-w-5xl mx-auto">
        {/* 1. TOP SECTION: Memory Highlights & Featured Narrative (PDF Page 16 Design) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Highlights Panel */}
          <div className="bg-card border border-slate-light rounded-[12px] p-5 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
                <span>✨ Memory Highlights</span>
              </h3>

              <div className="flex flex-col gap-2 font-sans text-xs text-slate mt-3">
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>Beach Day - Most photographed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🍽️</span>
                  <span>Food Memories - Beach shack dinner</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>Group Moments - {photos.length} photos</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleGenerateStory}
              disabled={isGeneratingStory}
              className="w-full py-2 text-xs"
            >
              {isGeneratingStory ? 'Generating...' : 'Generate Trip Story ✨'}
            </Button>
          </div>

          {/* Right Narrative Story Panel */}
          <div className="md:col-span-2 bg-paper border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] text-slate uppercase font-bold tracking-wider">
                FEATURED NARRATIVE
              </span>
              <h2 className="font-serif text-2xl font-bold text-ink mt-1">
                Your Goa Story
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate leading-relaxed mt-2">
                {tripStory}
              </p>
            </div>

            <a href="#full-story" className="font-mono text-xs font-bold text-route hover:underline">
              View Full Story &rarr;
            </a>
          </div>
        </div>

        {/* 2. GALLERY SECTION */}
        <div className="bg-card border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-light">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Gallery</h2>
              <p className="font-mono text-xs text-slate mt-0.5">{filteredPhotos.length} Photos displayed</p>
            </div>

            {/* Gallery Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleDownloadAll}
                className="text-xs px-3 py-1.5 min-h-[36px]"
              >
                Download All
              </Button>

              {selectedPhotoIds.length > 0 && (
                <Button
                  onClick={handleDownloadSelected}
                  className="text-xs px-3 py-1.5 min-h-[36px]"
                >
                  Download Selected ({selectedPhotoIds.length})
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => setIsNewFolderOpen(true)}
                className="text-xs px-3 py-1.5 min-h-[36px]"
              >
                + Create Folder
              </Button>
            </div>
          </div>

          {/* Gallery Subtabs & Filters inside Gallery section */}
          <div className="flex flex-col gap-3">
            {/* All Photos / My Photos tabs */}
            <div className="flex items-center gap-6 border-b border-slate-light/60 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`font-mono text-xs font-bold pb-2 border-b-2 transition-all ${
                  activeTab === 'all'
                    ? 'border-route text-route'
                    : 'border-transparent text-slate hover:text-ink'
                }`}
              >
                All Photos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my')}
                className={`font-mono text-xs font-bold pb-2 border-b-2 transition-all ${
                  activeTab === 'my'
                    ? 'border-route text-route'
                    : 'border-transparent text-slate hover:text-ink'
                }`}
              >
                My Photos (Face Matched)
              </button>
            </div>

            {/* Day & Folder Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <label className="font-mono text-xs text-slate font-bold">Filter Day:</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="bg-paper border border-slate-light rounded-[8px] px-3 py-1.5 text-xs text-ink font-mono outline-none focus:border-route min-h-[36px]"
                >
                  {['All', 'Day 1', 'Day 2', 'Day 3', 'Day 4'].map((day) => (
                    <option key={day} value={day}>
                      {day === 'All' ? 'All Days' : day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="font-mono text-xs text-slate font-bold">Filter Folder:</label>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="bg-paper border border-slate-light rounded-[8px] px-3 py-1.5 text-xs text-ink font-sans outline-none focus:border-route min-h-[36px]"
                >
                  {folders.map((folder) => (
                    <option key={folder} value={folder}>
                      📁 {folder === 'All' ? 'All Folders' : folder}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Face Registration prompt for My Photos */}
          {activeTab === 'my' && !isFaceRegistered && (
            <div className="p-4 bg-paper border border-slate-light rounded-[10px] my-2">
              <FaceRegistration onComplete={() => setIsFaceRegistered(true)} />
            </div>
          )}

          {/* Photo Grid & Empty State */}
          {filteredPhotos.length === 0 ? (
            /* Empty State for Newly Created or Empty Folders */
            <div className="p-10 border-2 border-dashed border-slate-light rounded-[16px] text-center flex flex-col items-center justify-center gap-4 bg-paper/30 my-4">
              <div className="w-12 h-12 rounded-full bg-paper border border-slate-light text-slate flex items-center justify-center font-mono text-xl">
                📁
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-ink">
                  No photos attached yet
                </h3>
                <p className="font-sans text-xs text-slate mt-1 max-w-sm">
                  There are no photos in folder "{selectedFolder}". Upload photos from your gallery to add memories here!
                </p>
              </div>
              <Button onClick={triggerUpload} className="py-2 px-5 text-xs font-semibold">
                + Add Photos from Gallery
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
              {/* Instant + Add Photo Tile */}
              <div
                onClick={triggerUpload}
                className="aspect-square rounded-[12px] border-2 border-dashed border-route/40 hover:border-route bg-route/5 hover:bg-route/10 flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-route text-card font-mono text-xl font-bold flex items-center justify-center group-hover:scale-110 transition-transform">
                  +
                </div>
                <span className="font-sans text-xs font-bold text-route">
                  Add Photos
                </span>
                <span className="font-mono text-[10px] text-slate">
                  from Gallery
                </span>
              </div>

              {/* Render Existing Photos */}
              {filteredPhotos.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id)
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelectPhoto(photo.id)}
                    className={`relative aspect-square rounded-[12px] overflow-hidden border cursor-pointer shadow-xs group transition-all ${
                      isSelected ? 'border-route ring-2 ring-route' : 'border-slate-light hover:border-route'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Checkbox overlay */}
                    <div className="absolute top-2 right-2">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-route text-card border-route' : 'bg-paper/80 border-slate-light text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-card text-xs font-sans">
                      <span className="font-bold">{photo.title}</span>
                      <span className="font-mono text-[10px] text-card/80">{photo.day}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal: New Folder */}
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
                placeholder="e.g. Sunset Cruise"
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
      </div>
    </PageWrapper>
  )
}
