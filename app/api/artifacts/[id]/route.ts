import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const projectId = params.id
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, name')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch the latest artifact for this project
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: 'No artifacts found for this project' }, { status: 404 })
    }

    // Return the artifact data
    return NextResponse.json({
      id: artifact.id,
      html: artifact.html_content,
      css: artifact.css_content,
      js: artifact.js_content,
      preview_url: artifact.preview_url,
      created_at: artifact.created_at
    })

  } catch (error) {
    console.error('Artifacts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artifact' }, 
      { status: 500 }
    )
  }
}