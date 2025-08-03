import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8000'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is not defined')
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Environment variable SUPABASE_SERVICE_ROLE_KEY is not defined')
}

export async function POST(request: NextRequest) {
  // Initialize Supabase client once for the entire handler
  const supabase = createClient(
    SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY!
  )

  let requestBody: any = null
  let projectId: string | null = null
  let projectValidated = false
  
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    requestBody = await request.json()
    const { prompt, preferences } = requestBody
    projectId = requestBody.projectId
    
    if (!prompt || !projectId) {
      return NextResponse.json({ 
        error: 'Prompt and project ID are required' 
      }, { status: 400 })
    }



    // Verify project ownership and get screenshot details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, name, screenshot_url')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Project exists and belongs to user, mark as validated
    projectValidated = true

    // Get the image as base64 instead of sending URL to AI agent
    let imageBase64: string | null = null
    if (project.screenshot_url) {
      try {
        // screenshot_url now stores the relative path inside the bucket
        // Use the exact storage object path as saved during upload
        const normalizedPath = project.screenshot_url.replace(/^\/+/, '')

        // Basic traversal safety check
        if (normalizedPath.includes('..')) {
          throw new Error('Unsafe screenshot path detected')
        }

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('screenshots')
          .download(normalizedPath)

        if (!downloadError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer()
          const base64String = Buffer.from(arrayBuffer).toString('base64')

          const fileExt = normalizedPath.toLowerCase().split('.').pop()
          const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 'image/png'
          imageBase64 = `data:${mimeType};base64,${base64String}`
        }
      } catch (error) {
        console.warn('Failed to get image for AI agent:', error)
      }
    }

    // Update project status to processing and ensure the operation succeeds
    const { error: processingError } = await supabase
      .from('projects')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (processingError) {
      console.error('Failed to mark project as processing:', processingError)
      return NextResponse.json(
        { success: false, error: 'Failed to update project status' },
        { status: 500 },
      )
    }

    // Send request to AI agent with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60_000) // 60s

    let agentResponse: Response
    try {
      agentResponse = await fetch(`${AI_AGENT_URL}/scaffold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          project_id: projectId,
          image_base64: imageBase64,
          preferences: preferences || {}
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!agentResponse.ok) {
      // Update project status to failed
      await supabase
        .from('projects')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      const errorText = await agentResponse.text()
      throw new Error(`AI agent error: ${agentResponse.status} - ${errorText}`)
    }

    const result = await agentResponse.json()

    // Update project status to completed
    const { error: completionError } = await supabase
      .from('projects')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (completionError) {
      console.error('Failed to mark project as completed:', completionError)
      return NextResponse.json(
        { success: false, error: 'Failed to update project status' },
        { status: 500 }
      )
    }

    // Check and use prompt quota for the user
    const { data: quotaUsed, error: usageError } = await supabase.rpc('use_prompt_quota', {
      p_user_id: userId
    })

    if (usageError) {
      console.error('Failed to check prompt quota:', usageError)
      return NextResponse.json(
        { success: false, error: 'Failed to check prompt quota' },
        { status: 500 }
      )
    }

    if (!quotaUsed) {
      return NextResponse.json(
        { success: false, error: 'Monthly prompt quota exceeded. Please upgrade your plan or wait for next month.' },
        { status: 429 }
      )
    }

    return NextResponse.json({
      success: true,
      artifactId: result.artifact_id,
      previewUrl: result.preview_url,
      status: result.status,
      message: result.message || 'Code generated successfully'
    })

  } catch (error) {
    console.error('Scaffold API error:', error)
    
    // Mark project as failed only if validation succeeded
    if (projectValidated && projectId) {
      try {
        await supabase
          .from('projects')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
      } catch (updateError) {
        console.error('Failed to update project status:', updateError)
      }
    }

    if (error instanceof Error) {
      if (error.message.includes('AI agent')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again.' }, 
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate code' }, 
      { status: 500 }
    )
  }
}