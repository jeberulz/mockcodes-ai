import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg']

// MIME type to extension mapping
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg'
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PNG and JPEG files are allowed.' 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    // Initialize Supabase client with service role for file uploads
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate unique filename with validation
    const timestamp = Date.now()
    
    // Extract and validate file extension
    let fileExtension: string
    const originalFileName = file.name
    const lastDotIndex = originalFileName.lastIndexOf('.')
    
    if (lastDotIndex === -1) {
      // No extension found, use MIME type to determine extension
      fileExtension = MIME_TO_EXTENSION[file.type] || 'bin'
    } else {
      // Extension exists, extract it
      const extractedExt = originalFileName.slice(lastDotIndex + 1).toLowerCase()
      const expectedExt = MIME_TO_EXTENSION[file.type]
      
      // Validate extension matches MIME type
      if (expectedExt && extractedExt !== expectedExt && extractedExt !== 'jpeg') {
        return NextResponse.json({ 
          error: `File extension '${extractedExt}' does not match file type '${file.type}'` 
        }, { status: 400 })
      }
      
      fileExtension = expectedExt || extractedExt
    }
    
    // Create anonymized user identifier
    const userHash = createHash('sha256').update(userId).digest('hex').substring(0, 12)
    const fileName = `screenshots/${userHash}/${timestamp}.${fileExtension}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file to storage' 
      }, { status: 500 })
    }

    // Get signed URL (since bucket is private)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(fileName, 3600) // 1 hour expiry

    if (urlError || !urlData.signedUrl) {
  console.error('Failed to get signed URL:', urlError)
  return NextResponse.json({ 
    error: 'Failed to get file URL' 
  }, { status: 500 })
}

    // Prepare storage file path (persist only the path, not the signed URL)
    const filePath = fileName

    // --- Begin atomic profile + project creation ---
    let newProfileCreated = false

    // Fetch existing profile (if any)
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfileError) {
      console.error('Failed to fetch user profile:', existingProfileError)
      // Roll back: remove uploaded file to prevent orphaned storage objects
      await supabase.storage.from('screenshots').remove([fileName])
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    if (!existingProfile) {
      // Need to create a new profile first
      const user = await currentUser()
      const email =
        user?.emailAddresses?.[0]?.emailAddress || `user-${userId}@placeholder.local`

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: userId,
            email,
            role: 'user',
            prompt_quota: 15,
            prompts_used: 0,
            created_at: new Date().toISOString()
          }
        ])

      if (profileError) {
        console.error('Failed to create user profile:', profileError)
        // Clean up uploaded file as profile creation failed
        await supabase.storage.from('screenshots').remove([fileName])
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }

      newProfileCreated = true
    }

    // Create project record linked to the user
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert([
        {
          user_id: userId,
          name: `Screenshot ${new Date().toISOString().split('T')[0]}`,
          screenshot_url: filePath,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (projectError) {
      console.error('Failed to create project:', projectError)
      // Roll back: remove uploaded file and newly-created profile (if any)
      await supabase.storage.from('screenshots').remove([fileName])
      if (newProfileCreated) {
        await supabase.from('user_profiles').delete().eq('id', userId)
      }
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imageUrl: urlData.signedUrl,
      projectId: projectData?.id,
      fileName: fileName
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}