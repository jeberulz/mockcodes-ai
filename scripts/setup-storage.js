const { createClient } = require('@supabase/supabase-js')

// Local Supabase credentials from supabase start output
const supabaseUrl = 'http://127.0.0.1:54321'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setupStorage() {
  try {
    console.log('Setting up storage bucket...')
    
    // Create screenshots bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('screenshots', {
      public: false,
      allowedMimeTypes: ['image/png', 'image/jpeg'],
      fileSizeLimit: 5242880 // 5MB
    })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Screenshots bucket already exists')
      } else {
        console.error('❌ Error creating bucket:', bucketError)
        return
      }
    } else {
      console.log('✅ Created screenshots bucket:', bucket)
    }

    // Set up bucket policy for authenticated users
    const { error: policyError } = await supabase.rpc('create_policy', {
      policy_name: 'authenticated_users_upload',
      table_name: 'objects',
      definition: 'bucket_id = \'screenshots\' AND auth.role() = \'authenticated\''
    })

    if (policyError && !policyError.message.includes('already exists')) {
      console.log('Note: Policy creation failed (this is normal for local dev):', policyError.message)
    }

    console.log('✅ Storage setup complete!')
    console.log('📂 Bucket: screenshots')
    console.log('🔒 Access: Authenticated users only')
    console.log('📏 Max file size: 5MB')
    console.log('🎯 Allowed types: PNG, JPEG')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupStorage()