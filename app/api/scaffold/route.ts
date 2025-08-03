import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  let requestBody: any = null
  let projectId: string | null = null
  
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

    // Initialize Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

    // Get the image as base64 instead of sending URL to AI agent
    let imageBase64: string | null = null
    if (project.screenshot_url) {
      try {
        // Extract file path from signed URL
        const urlParts = project.screenshot_url.split('/storage/v1/object/sign/')[1]
        const filePath = urlParts ? urlParts.split('?')[0] : null
        
        if (filePath) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('screenshots')
            .download(filePath.replace('screenshots/', ''))

          if (!downloadError && fileData) {
            const arrayBuffer = await fileData.arrayBuffer()
            const base64String = Buffer.from(arrayBuffer).toString('base64')
            
            const fileExt = filePath.toLowerCase().split('.').pop()
            const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 'image/png'
            imageBase64 = `data:${mimeType};base64,${base64String}`
          }
        }
      } catch (error) {
        console.warn('Failed to get image for AI agent:', error)
      }
    }

    // Update project status to processing
    await supabase
      .from('projects')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    // Send request to AI agent
    const agentResponse = await fetch(`${AI_AGENT_URL}/scaffold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        project_id: projectId,
        image_url: imageBase64,
        preferences: preferences || {}
      }),
    })

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
    await supabase
      .from('projects')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

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
    
    // Try to update project status to failed if we have the project ID
    try {
      if (projectId) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        await supabase
          .from('projects')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
      }
    } catch (updateError) {
      console.error('Failed to update project status:', updateError)
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