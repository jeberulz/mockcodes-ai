'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useUser } from '@clerk/nextjs'
import { Upload, X, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import Image from 'next/image'

interface UploadProps {
  onFileSelect?: (file: File) => void
  onUploadComplete?: (imageUrl: string) => void
  className?: string
}

export default function UploadComponent({ 
  onFileSelect, 
  onUploadComplete, 
  className = '' 
}: UploadProps) {
  const { user, isSignedIn } = useUser()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxFileSize = 5 * 1024 * 1024 // 5MB in bytes
  const acceptedFileTypes = {
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg']
  }

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File size must be less than 5MB')
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Only PNG and JPEG files are allowed')
      } else {
        setError('Invalid file. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setUploadedFile(file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      
      // Notify parent component
      onFileSelect?.(file)
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    multiple: false
  })

  const handleAnalyze = async () => {
    if (!uploadedFile) return

    if (!isSignedIn) {
      setError('Please sign in to analyze your screenshot')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('userId', user?.id || '')

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      onUploadComplete?.(data.imageUrl)
      
      // Success state - keep the preview but show success
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 1000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadProgress(0)
      setIsUploading(false)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setError(null)
    setUploadProgress(0)
  }

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 text-gray-400">
              <Upload className="w-full h-full" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isDragActive ? 'Drop your screenshot here' : 'Upload a UI screenshot'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Drag and drop or click to select • PNG, JPEG • Max 5MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* File Preview */}
          <div className="relative">
            {previewUrl && (
              <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-700">
                <Image
                  src={previewUrl}
                  alt="Screenshot preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <button
              onClick={removeFile}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* File Info */}
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <ImageIcon className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col space-y-2">
              {!isSignedIn && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sign in to analyze your screenshot and generate code
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={handleAnalyze}
                disabled={isUploading || !isSignedIn}
                className="w-full"
              >
                {isUploading ? 'Processing...' : 'Analyze Screenshot'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={removeFile}
                className="w-full"
              >
                Upload Different Image
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}