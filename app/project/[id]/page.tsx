import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProjectClient from './ProjectClient'

interface ProjectPageProps {
  params: { id: string }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const projectId = params.id
  if (!projectId) {
    redirect('/dashboard')
  }

  // Fetch project data
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

  // Generate a fresh signed URL so the client can access the image
  if (project && project.screenshot_url) {
    // Use the full path as stored (already includes screenshots/ prefix)
    const normalizedPath = project.screenshot_url.replace(/^\/+/, '') // remove leading slashes only
    const { data: signedData } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(normalizedPath, 3600)
    if (signedData?.signedUrl) {
      project.screenshot_url = signedData.signedUrl
    }
  }

  if (error || !project) {
    redirect('/dashboard')
  }

  return <ProjectClient project={project} />
}