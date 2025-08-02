'use client'

import { useCallback, useRef, useState } from 'react'

const placeholder = 'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=1080&q=80'

export default function UploadDropzone() {
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const file = files[0]
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const highlight = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.add('border-orange-400')
  }, [])

  const unHighlight = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-orange-400')
  }, [])

  return (
    <div
      id="drop-zone"
      className="w-full max-w-xl rounded-3xl border-2 border-dashed border-white/20 hover:border-white/30 transition bg-white/5 backdrop-blur-sm p-8 sm:p-10 flex flex-col items-center gap-6 cursor-pointer"
      onDragEnter={highlight}
      onDragOver={highlight}
      onDragLeave={unHighlight}
      onDrop={(e) => {
        unHighlight(e)
        onFiles(e.dataTransfer.files)
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-upload-cloud text-orange-400"
      >
        <path d="M12 13v8" />
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="m8 17 4-4 4 4" />
      </svg>

      <p className="text-base font-medium font-geist tracking-tight">
        Drop screenshot here or{' '}
        <span className="underline decoration-orange-400">click to upload</span>
      </p>

      {preview && (
        <div className="w-full">
          <img
            src={preview || placeholder}
            alt="preview"
            className="rounded-2xl w-full h-auto object-contain ring-1 ring-white/10 shadow-lg"
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        id="file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  )
}
