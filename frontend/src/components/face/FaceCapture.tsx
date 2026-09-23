import React, { useRef } from 'react'

export interface FaceCaptureProps {
  label: string
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
}

export const FaceCapture: React.FC<FaceCaptureProps> = ({
  label,
  selectedFile,
  onFileSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0])
    } else {
      onFileSelect(null)
    }
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[10px] p-3 bg-paper min-h-[130px] cursor-pointer text-center gap-2 transition-all ${
        selectedFile ? 'border-route bg-route/5' : 'border-slate-light hover:border-slate'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-route text-card font-mono text-xs font-bold flex items-center justify-center">
            ✓
          </div>
          <span className="text-xs font-sans text-ink font-medium truncate max-w-[90px]">
            {selectedFile.name}
          </span>
          <span className="text-[10px] font-mono text-route">Click to change</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-slate-light/50 flex items-center justify-center text-slate">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <span className="text-xs font-mono font-medium text-ink">{label}</span>
          <span className="text-[10px] font-sans text-slate">Click to upload</span>
        </div>
      )}
    </div>
  )
}
