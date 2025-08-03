import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkSupabaseClientSsr } from '@/utils/supabase/server'
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

    // Initialize Supabase client
    const supabase = await createClerkSupabaseClientSsr()

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
      .from('artifacts')
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('artifacts')
      .getPublicUrl(fileName)

    if (!urlData.publicUrl) {
      return NextResponse.json({ 
        error: 'Failed to get file URL' 
      }, { status: 500 })
    }

    // Create project record in database
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert([
        {
          user_id: userId,
          name: `Screenshot ${new Date().toISOString().split('T')[0]}`,
          screenshot_url: urlData.publicUrl,
          status: 'active'
        }
      ])
      .select()
      .single()

    if (projectError) {
      console.error('Database error:', projectError)
      // Don't return error here - file is uploaded, just log the database issue
    }

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
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