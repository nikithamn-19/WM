import React, { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useTripContext } from '../context/TripContext'

export interface MemoryPhotoItem {
  id: string
  folder: string
  day: string
  title: string
  url: string
  isMyPhoto?: boolean
  member?: string
}

export const MemoriesScreen: React.FC = () => {
  const { trpId = 'trp_goa_2026' } = useParams()
  const { addToast } = useTripContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const TRIP_MEMBERS = [
    'All Members',
    'Nikitha (You)',
    'Alex Chen',
    'Priya Sharma',
    'Maya Patel',
    'Jordan Lee',
    'Sam Rivera',
  ]

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
      isMyPhoto: true,
      member: 'Nikitha (You)',
    },
    {
      id: 'm2',
      folder: 'Arrival & Resort',
      day: 'Day 1',
      title: 'Poolside Sunset View',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      isMyPhoto: true,
      member: 'Alex Chen',
    },
    {
      id: 'm3',
      folder: 'Baga Beach & Water Sports',
      day: 'Day 2',
      title: 'Seafood Platter at Shack',
      url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
      isMyPhoto: false,
      member: 'Priya Sharma',
    },
    {
      id: 'm4',
      folder: 'Dudhsagar Trek & Spice Trail',
      day: 'Day 3',
      title: 'Heritage Fort Aguada View',
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
      isMyPhoto: false,
      member: 'Maya Patel',
    },
  ]

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [openedFolder, setOpenedFolder] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<string>('All Members')
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

  // Persistent Photos State
  const [photos, setPhotos] = useState<MemoryPhotoItem[]>(() => {
    try {
      const saved = localStorage.getItem(`wm_photos_${trpId}`)
      if (saved) {
        const parsed: MemoryPhotoItem[] = JSON.parse(saved)
        // Ensure every photo has a valid member assigned
        return parsed.map((p, idx) => ({
          ...p,
          member:
            p.member ||
            (p.isMyPhoto
              ? 'Nikitha (You)'
              : TRIP_MEMBERS[1 + (idx % (TRIP_MEMBERS.length - 1))]),
        }))
      }
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
    const targetPhotos =
      activeTab === 'my' && openedFolder
        ? photos.filter((p) => p.folder === openedFolder)
        : photos
    addToast(`Downloading ${targetPhotos.length} high-res trip photos...`, 'success')
  }

  const handleDownloadSelected = () => {
    addToast(`Downloading ${selectedPhotoIds.length} selected photos...`, 'success')
  }

  // Delete single photo
  const handleDeleteSingle = (id: string, title?: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    setSelectedPhotoIds((prev) => prev.filter((selectedId) => selectedId !== id))
    addToast(`Deleted "${title || 'photo'}"`, 'success')
  }

  // Delete selected photos
  const handleDeleteSelected = () => {
    const count = selectedPhotoIds.length
    if (count === 0) return
    setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(p.id)))
    setSelectedPhotoIds([])
    addToast(`Deleted ${count} photo(s) successfully!`, 'success')
  }

  // Create folder
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
    setNewFolderName('')
    setIsNewFolderOpen(false)
    addToast(`Folder "${name}" created and saved!`, 'success')
    if (activeTab === 'my') {
      setOpenedFolder(name)
    }
  }

  // Delete folder
  const handleDeleteFolder = (folderName: string) => {
    if (folderName === 'All') return
    const updatedFolders = folders.filter((f) => f !== folderName)
    setFolders(updatedFolders)

    // Reassign photos in the deleted folder to 'All'
    setPhotos((prev) =>
      prev.map((p) => (p.folder === folderName ? { ...p, folder: 'All' } : p))
    )

    if (selectedFolder === folderName) {
      setSelectedFolder('All')
    }

    if (openedFolder === folderName) {
      setOpenedFolder(null)
    }

    addToast(`Folder "${folderName}" deleted successfully!`, 'success')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const filesArray = Array.from(e.target.files)

    const targetFolder =
      activeTab === 'my' && openedFolder
        ? openedFolder
        : selectedFolder === 'All'
        ? 'Arrival & Resort'
        : selectedFolder
    const targetMember =
      selectedMember === 'All' || selectedMember === 'All Members'
        ? 'Nikitha (You)'
        : selectedMember

    const newItemsPromises = filesArray.map((file, idx) => {
      return new Promise<MemoryPhotoItem>((resolve) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string
          resolve({
            id: `m_upload_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
            folder: targetFolder,
            day: 'Day 1',
            title: file.name.replace(/\.[^/.]+$/, ''),
            url: dataUrl || URL.createObjectURL(file),
            isMyPhoto: true,
            member: targetMember,
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

  // Filtered photos for 'All Photos' tab
  const filteredAllPhotos = photos.filter((p) => {
    const photoMember =
      p.member || (p.isMyPhoto ? 'Nikitha (You)' : 'Alex Chen')
    const matchesMember =
      selectedMember === 'All' ||
      selectedMember === 'All Members' ||
      photoMember === selectedMember
    const matchesFolder = selectedFolder === 'All' || p.folder === selectedFolder
    return matchesMember && matchesFolder
  })

  // Photos for currently opened folder in 'My Photos'
  const photosInOpenedFolder = openedFolder
    ? photos.filter((p) => p.folder === openedFolder)
    : []

  // Reusable compact Photo Card component
  const renderPhotoCard = (photo: MemoryPhotoItem) => {
    const isSelected = selectedPhotoIds.includes(photo.id)
    return (
      <div
        key={photo.id}
        onClick={() => toggleSelectPhoto(photo.id)}
        className={`relative aspect-square rounded-[10px] overflow-hidden border cursor-pointer shadow-2xs group transition-all ${
          isSelected ? 'border-route ring-2 ring-route' : 'border-slate-light hover:border-route'
        }`}
      >
        <img
          src={photo.url}
          alt={photo.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Delete Photo Button (Top-Left) */}
        <div className="absolute top-1.5 left-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteSingle(photo.id, photo.title)
            }}
            className="w-5.5 h-5.5 rounded-full bg-paper/90 hover:bg-rose-600 text-slate hover:text-white border border-slate-light/80 shadow-xs flex items-center justify-center transition-all cursor-pointer opacity-70 group-hover:opacity-100 hover:scale-110"
            title="Delete photo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>

        {/* Checkbox overlay (Top-Right) */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all ${
              isSelected
                ? 'bg-route text-card border-route'
                : 'bg-paper/80 border-slate-light text-transparent hover:border-slate'
            }`}
          >
            ✓
          </div>
        </div>

        {/* Hover Metadata Overlay */}
        <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-card text-[11px] font-sans pointer-events-none">
          <span className="font-bold truncate">{photo.title}</span>
          <span className="font-mono text-[9px] text-card/90">
            👤 {photo.member || (photo.isMyPhoto ? 'Nikitha (You)' : 'Alex Chen')}
          </span>
        </div>
      </div>
    )
  }

  // Reusable + Add Photos Tile (Compact)
  const renderAddTile = (subtitle: string = 'from Gallery') => (
    <div
      onClick={triggerUpload}
      className="aspect-square rounded-[10px] border-2 border-dashed border-route/40 hover:border-route bg-route/5 hover:bg-route/10 flex flex-col items-center justify-center text-center p-2 cursor-pointer transition-all gap-1 group shadow-2xs"
    >
      <div className="w-8 h-8 rounded-full bg-route text-card font-mono text-base font-bold flex items-center justify-center group-hover:scale-110 transition-transform">
        +
      </div>
      <span className="font-sans text-[11px] font-bold text-route">
        Add Photos
      </span>
      <span className="font-mono text-[9px] text-slate">
        {subtitle}
      </span>
    </div>
  )

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

      <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-16">
        {/* GALLERY SECTION */}
        <div className="bg-card border border-slate-light rounded-[12px] p-6 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-light">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Gallery</h2>
              <p className="font-mono text-xs text-slate mt-0.5">
                {activeTab === 'all'
                  ? `${filteredAllPhotos.length} Photos displayed`
                  : openedFolder
                  ? `${photosInOpenedFolder.length} Photos in folder "${openedFolder}"`
                  : `${folders.filter((f) => f !== 'All').length} Folders in My Photos`}
              </p>
            </div>

            {/* Gallery Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleDownloadAll}
                className="text-xs px-3 py-1.5 min-h-[36px] cursor-pointer"
              >
                Download All
              </Button>

              {selectedPhotoIds.length > 0 && (
                <>
                  <Button
                    onClick={handleDownloadSelected}
                    className="text-xs px-3 py-1.5 min-h-[36px] cursor-pointer"
                  >
                    Download Selected ({selectedPhotoIds.length})
                  </Button>
                  <Button
                    onClick={handleDeleteSelected}
                    className="text-xs px-3 py-1.5 min-h-[36px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs border border-rose-700"
                  >
                    🗑 Delete Selected ({selectedPhotoIds.length})
                  </Button>
                </>
              )}

              <Button
                variant="secondary"
                onClick={() => setIsNewFolderOpen(true)}
                className="text-xs px-3 py-1.5 min-h-[36px] cursor-pointer"
              >
                + Create Folder
              </Button>
            </div>
          </div>

          {/* Subtabs: All Photos vs My Photos */}
          <div className="flex items-center gap-6 border-b border-slate-light/60 pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all')
                setOpenedFolder(null)
              }}
              className={`font-mono text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              All Photos
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('my')
                setOpenedFolder(null)
              }}
              className={`font-mono text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'my'
                  ? 'border-route text-route'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              My Photos
            </button>
          </div>

          {/* VIEW MODE 1: ALL PHOTOS (Filtered by Member & Folder, Smaller Compact Grid) */}
          {activeTab === 'all' && (
            <div className="flex flex-col gap-4">
              {/* Member & Folder Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="font-mono text-xs text-slate font-bold">Filter By Member:</label>
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="bg-paper border border-slate-light rounded-[8px] px-3 py-1.5 text-xs text-ink font-sans outline-none focus:border-route min-h-[36px]"
                  >
                    {TRIP_MEMBERS.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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

                  {/* Direct Delete Button for Selected Folder */}
                  {selectedFolder !== 'All' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(selectedFolder)}
                      className="text-xs font-mono font-medium text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-[8px] px-2.5 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer min-h-[36px] shadow-2xs"
                      title={`Delete folder "${selectedFolder}"`}
                    >
                      <span>🗑</span>
                      <span>Delete "{selectedFolder}"</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Smaller Grid of Photos */}
              {filteredAllPhotos.length === 0 ? (
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
                  <Button onClick={triggerUpload} className="py-2 px-5 text-xs font-semibold cursor-pointer">
                    + Add Photos from Gallery
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-2">
                  {renderAddTile('from Gallery')}
                  {filteredAllPhotos.map((photo) => renderPhotoCard(photo))}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: MY PHOTOS (Displays Folders First, Then Photos on Folder Click) */}
          {activeTab === 'my' && (
            <div className="flex flex-col gap-4">
              {!openedFolder ? (
                /* FOLDERS VIEW: Displays ONLY folders */
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate font-bold uppercase tracking-wider">
                      Folders ({folders.filter((f) => f !== 'All').length}):
                    </span>
                    <span className="font-sans text-xs text-slate">
                      Click a folder to view and add photos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-1">
                    {/* + Create New Folder Tile */}
                    <div
                      onClick={() => setIsNewFolderOpen(true)}
                      className="aspect-square rounded-[12px] border-2 border-dashed border-route/40 hover:border-route bg-route/5 hover:bg-route/10 flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-all gap-2 group shadow-2xs"
                    >
                      <div className="w-9 h-9 rounded-full bg-route text-card font-mono text-xl font-bold flex items-center justify-center group-hover:scale-110 transition-transform">
                        +
                      </div>
                      <span className="font-sans text-xs font-bold text-route">
                        Create Folder
                      </span>
                      <span className="font-mono text-[10px] text-slate">
                        New Album
                      </span>
                    </div>

                    {/* Folder Cards */}
                    {folders
                      .filter((f) => f !== 'All')
                      .map((folder) => {
                        const folderPhotos = photos.filter((p) => p.folder === folder)
                        const coverPhoto = folderPhotos[0]?.url

                        return (
                          <div
                            key={folder}
                            onClick={() => setOpenedFolder(folder)}
                            className="group relative aspect-square rounded-[12px] border border-slate-light hover:border-route bg-card p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                          >
                            {/* Folder Cover / Preview */}
                            {coverPhoto ? (
                              <div className="w-full flex-1 rounded-[8px] overflow-hidden mb-2 relative bg-paper min-h-[80px]">
                                <img
                                  src={coverPhoto}
                                  alt={folder}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />
                                <span className="absolute bottom-1.5 left-2 text-white font-mono text-[10px] font-bold">
                                  {folderPhotos.length} {folderPhotos.length === 1 ? 'photo' : 'photos'}
                                </span>
                              </div>
                            ) : (
                              <div className="w-full flex-1 rounded-[8px] bg-paper/80 border border-slate-light/60 flex flex-col items-center justify-center text-3xl mb-2 group-hover:scale-105 transition-transform min-h-[80px]">
                                📁
                                <span className="font-mono text-[10px] text-slate mt-1">Empty</span>
                              </div>
                            )}

                            {/* Folder Title & Delete Button */}
                            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-light/60">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm">📁</span>
                                <span
                                  className="font-serif font-bold text-xs text-ink truncate"
                                  title={folder}
                                >
                                  {folder}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFolder(folder)
                                }}
                                className="w-6 h-6 rounded-full text-slate hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-60 group-hover:opacity-100"
                                title={`Delete folder "${folder}"`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-3.5 h-3.5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ) : (
                /* INSIDE OPENED FOLDER: Displays photos in this specific folder */
                <div className="flex flex-col gap-4">
                  {/* Folder Breadcrumb & Navigation Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-light gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenedFolder(null)}
                        className="font-mono text-xs font-bold text-route hover:underline flex items-center gap-1 cursor-pointer bg-paper px-2.5 py-1.5 rounded-[6px] border border-slate-light/70 shadow-2xs"
                      >
                        <span>&larr;</span>
                        <span>Back to Folders</span>
                      </button>

                      <span className="font-serif text-lg font-bold text-ink flex items-center gap-1.5 ml-1">
                        <span>📁</span>
                        <span>{openedFolder}</span>
                      </span>
                      <span className="font-mono text-xs text-slate">
                        ({photosInOpenedFolder.length} photos)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={triggerUpload}
                        className="text-xs px-3 py-1.5 min-h-[34px] cursor-pointer"
                      >
                        + Add Photos to Folder
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(openedFolder)}
                        className="text-xs font-mono text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-[8px] px-2.5 py-1.5 flex items-center gap-1 transition-all cursor-pointer min-h-[34px]"
                      >
                        <span>🗑 Delete Folder</span>
                      </button>
                    </div>
                  </div>

                  {/* Photos Grid for this folder (in smaller size) */}
                  {photosInOpenedFolder.length === 0 ? (
                    <div className="p-10 border-2 border-dashed border-slate-light rounded-[16px] text-center flex flex-col items-center justify-center gap-4 bg-paper/30 my-4">
                      <div className="w-12 h-12 rounded-full bg-paper border border-slate-light text-slate flex items-center justify-center font-mono text-xl">
                        📁
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-bold text-ink">
                          Folder "{openedFolder}" is empty
                        </h3>
                        <p className="font-sans text-xs text-slate mt-1 max-w-sm">
                          No photos have been added to this folder yet. Click below to add photos from your gallery!
                        </p>
                      </div>
                      <Button onClick={triggerUpload} className="py-2 px-5 text-xs font-semibold cursor-pointer">
                        + Add Photos to "{openedFolder}"
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-1">
                      {renderAddTile(`to ${openedFolder}`)}
                      {photosInOpenedFolder.map((photo) => renderPhotoCard(photo))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Create & Manage Folders */}
        {isNewFolderOpen && (
          <Modal
            isOpen={isNewFolderOpen}
            onClose={() => setIsNewFolderOpen(false)}
            title="Create & Manage Photo Folders"
          >
            <div className="flex flex-col gap-5">
              <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
                <Input
                  label="New Folder Name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Sunset Cruise"
                  required
                />
                <div className="flex gap-2 justify-end pt-1">
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

              {/* List of Existing Custom Folders with Option to Delete */}
              {folders.filter((f) => f !== 'All').length > 0 && (
                <div className="pt-3 border-t border-slate-light flex flex-col gap-2">
                  <span className="font-mono text-xs text-slate font-bold uppercase tracking-wider">
                    Existing Folders ({folders.filter((f) => f !== 'All').length}):
                  </span>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {folders
                      .filter((f) => f !== 'All')
                      .map((folder) => (
                        <div
                          key={folder}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-paper border border-slate-light/70 text-xs font-sans"
                        >
                          <span className="flex items-center gap-2 text-ink font-medium">
                            <span>📁</span>
                            <span>{folder}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(folder)}
                            className="text-rose-600 hover:text-white hover:bg-rose-600 px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 border border-rose-300 transition-all cursor-pointer"
                            title={`Delete folder "${folder}"`}
                          >
                            <span>🗑 Delete</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </PageWrapper>
  )
}
