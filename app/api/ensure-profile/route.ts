import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST() {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user details from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabaseAdmin = createAdminClient()

    // Check if user profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking user profile:', checkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists',
        profileExists: true 
      })
    }

    // Create user profile
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert([
        {
          id: userId,
          email: user.emailAddresses[0]?.emailAddress || '',
          first_name: user.firstName || null,
          last_name: user.lastName || null,
          avatar_url: user.imageUrl || null,
          role: 'user',
          prompt_quota: 15, // Default starter quota
          prompts_used: 0,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    console.log('User profile created successfully:', data)
    return NextResponse.json({ 
      message: 'User profile created successfully',
      profileExists: true,
      profile: data
    })
    
  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}