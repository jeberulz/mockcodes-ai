import { createAdminClient } from '@/utils/supabase/admin'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

type ClerkWebhookEvent = {
  type: string
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
      id: string
    }>
    first_name: string
    last_name: string
    image_url: string
    created_at: number
  }
}

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: ClerkWebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      const supabaseAdmin = createAdminClient()

      // Create user profile in Supabase
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .insert([
          {
            id: id,
            email: email_addresses[0]?.email_address || '',
            first_name: first_name || null,
            last_name: last_name || null,
            avatar_url: image_url || null,
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
      return NextResponse.json({ message: 'User profile created successfully' })
      
    } catch (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      const supabaseAdmin = createAdminClient()

      // Update user profile in Supabase
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          email: email_addresses[0]?.email_address || '',
          first_name: first_name || null,
          last_name: last_name || null,
          avatar_url: image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
      }

      console.log('User profile updated successfully:', data)
      return NextResponse.json({ message: 'User profile updated successfully' })
      
    } catch (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    try {
      const supabaseAdmin = createAdminClient()

      // Delete user profile from Supabase (this will cascade delete related data)
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting user profile:', error)
        return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
      }

      console.log('User profile deleted successfully for user:', id)
      return NextResponse.json({ message: 'User profile deleted successfully' })
      
    } catch (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  return NextResponse.json({ message: 'Webhook received' })
}