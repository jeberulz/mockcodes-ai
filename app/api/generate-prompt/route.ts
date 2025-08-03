import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get project details to find the image file path
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('screenshot_url, user_id')
      .eq('id', projectId)
      .eq('user_id', userId) // Ensure user owns this project
      .single()

    if (projectError || !project) {
      console.error('Project not found:', projectError)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Extract the file path from the screenshot URL
    // URL format: http://127.0.0.1:54321/storage/v1/object/sign/screenshots/path/file.png?token=...
    const urlParts = project.screenshot_url.split('/storage/v1/object/sign/')[1]
    const filePath = urlParts ? urlParts.split('?')[0] : null
    
    if (!filePath) {
      console.error('Could not extract file path from URL:', project.screenshot_url)
      return NextResponse.json({ error: 'Invalid screenshot URL' }, { status: 400 })
    }

    // Download the image directly from Supabase storage
    let imageBase64: string
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('screenshots')
        .download(filePath.replace('screenshots/', ''))

      if (downloadError || !fileData) {
        console.error('Failed to download image:', downloadError)
        return NextResponse.json({ 
          error: 'Failed to access image file' 
        }, { status: 400 })
      }

      // Convert blob to base64
      const arrayBuffer = await fileData.arrayBuffer()
      const base64String = Buffer.from(arrayBuffer).toString('base64')
      
      // Determine MIME type from file extension or default to PNG
      const fileExt = filePath.toLowerCase().split('.').pop()
      const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 'image/png'
      imageBase64 = `data:${mimeType};base64,${base64String}`
      
    } catch (fetchError) {
      console.error('Failed to process image:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to process image. Please try uploading again.' 
      }, { status: 400 })
    }

    // Analyze the image using GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert UI/UX designer and frontend developer. Analyze the provided UI screenshot and generate a detailed prompt for creating the exact same interface using HTML, CSS (Tailwind CSS), and JavaScript.

Your response must be a JSON object with the following structure:
{
  "prompt": "Detailed prompt for recreating the UI",
  "components": ["list", "of", "detected", "components"],
  "colors": ["primary colors", "detected"],
  "typography": ["font styles", "detected"],
  "layout": "Brief description of the layout structure"
}

The prompt should include:
1. Exact layout structure and positioning
2. All UI components (buttons, forms, cards, navigation, etc.)
3. Color scheme with specific Tailwind CSS classes
4. Typography and text styling
5. Spacing and sizing details
6. Interactive elements and hover states
7. Responsive design considerations
8. Any icons or imagery placeholders

Make the prompt comprehensive enough that a developer could recreate the interface exactly.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this UI screenshot and generate a comprehensive prompt for recreating it:"
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let analysisResult
    try {
      analysisResult = JSON.parse(content)
    } catch (parseError) {
      // Fallback if JSON parsing fails
      analysisResult = {
        prompt: content,
        components: ["UI Elements"],
        colors: ["Various colors detected"],
        typography: ["Multiple font styles"],
        layout: "Complex layout structure"
      }
    }

    // Validate the response structure
    if (!analysisResult.prompt) {
      throw new Error('Invalid response format from AI')
    }

    return NextResponse.json(analysisResult)

  } catch (error) {
    console.error('Generate prompt error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' }, 
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate prompt' }, 
      { status: 500 }
    )
  }
}