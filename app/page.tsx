import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SignInButton, SignUpButton } from '@clerk/nextjs'

export default async function Home() {
  const { userId } = await auth()
  
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <SignUpButton mode="modal">
              <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
                Get Started Free
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
  )
}
