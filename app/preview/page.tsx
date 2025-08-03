import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import PreviewClient from './PreviewClient'

interface PreviewPageProps {
  searchParams: { project?: string }
}

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const { userId } = await auth()
  
  console.log('[Preview Server] userId:', userId)
  console.log('[Preview Server] searchParams:', searchParams)
  
  if (!userId) {
    console.log('[Preview Server] No userId, redirecting to sign-in')
    redirect('/sign-in')
  }

  const projectId = searchParams.project
  if (!projectId) {
    console.log('[Preview Server] No projectId, redirecting to dashboard')
    redirect('/dashboard')
  }

  console.log('[Preview Server] Fetching project:', projectId, 'for user:', userId)

  // Fetch project data using service role (since user is already authenticated via Clerk middleware)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  console.log('[Preview Server] Project query result:', { project, error })

  if (error || !project) {
    console.log('[Preview Server] Project fetch failed, redirecting to dashboard')
    console.log('[Preview Server] Error:', error)
    redirect('/dashboard')
  }

  console.log('[Preview Server] Successfully loaded project, rendering PreviewClient')
  return <PreviewClient project={project} />
}