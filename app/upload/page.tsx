import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import UploadComponent from '@/components/Upload'

const SIGN_IN_PATH = '/sign-in'

export default async function UploadPage() {
  const { userId } = await auth()

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect(SIGN_IN_PATH)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Upload Your UI Screenshot
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload a screenshot of any UI design and we'll generate clean, 
            production-ready code using AI.
          </p>
        </div>

        <UploadComponent />

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Supported formats: PNG, JPEG • Maximum file size: 5MB
          </p>
        </div>
      </div>
    </div>
  )
}