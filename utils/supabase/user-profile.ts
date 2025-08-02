import { createClerkSupabaseClientSsr } from './server'
import { createAdminClient } from './admin'
import { auth, currentUser } from '@clerk/nextjs/server'
import type { Tables } from '@/types/database.types'

export async function getCurrentUserProfile(): Promise<Tables<'user_profiles'> | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const supabase = await createClerkSupabaseClientSsr()
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error)
    return null
  }
}

export async function ensureUserProfile(): Promise<Tables<'user_profiles'> | null> {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) return null

    // First, try to get existing profile using admin client
    const supabaseAdmin = createAdminClient()
    
    let { data: profile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    if (fetchError) {
      console.error('Error fetching user profile:', fetchError)
    }
    
    // If profile doesn't exist, create it
    if (!profile) {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .upsert([{
          id: userId,
          email: user.emailAddresses[0]?.emailAddress || '',
          first_name: user.firstName,
          last_name: user.lastName,
          avatar_url: user.imageUrl,
          role: 'user',
          prompt_quota: 15,
          prompts_used: 0
        }], {
          onConflict: 'id'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating/updating user profile:', error)
        
        // If it's a duplicate key error, try to fetch the existing profile
        if (error.code === '23505') {
          const { data: existingProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single()
          
          return existingProfile
        }
        
        return null
      }

      profile = data
    }

    return profile
  } catch (error) {
    console.error('Error in ensureUserProfile:', error)
    return null
  }
}