'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import UploadComponent from '@/components/Upload'

export default function UploadDropzone() {
  const router = useRouter()
  const { isSignedIn } = useUser()

  const handleFileSelect = (file: File) => {
    console.log('File selected in landing:', file.name)
  }

  const handleUploadComplete = (imageUrl: string) => {
    console.log('Upload completed:', imageUrl)
    // Redirect to dashboard or preview page after upload
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-xl">
      <UploadComponent 
        onFileSelect={handleFileSelect}
        onUploadComplete={handleUploadComplete}
        className="bg-white/5 backdrop-blur-sm rounded-3xl border-2 border-dashed border-white/20 hover:border-white/30 transition p-8 sm:p-10"
      />
      
      {!isSignedIn && (
        <p className="text-sm text-white/70 text-center mt-4">
          You can upload files without signing in, but analysis requires an account
        </p>
      )}
    </div>
  )
}
