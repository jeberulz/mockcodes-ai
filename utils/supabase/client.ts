import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export function createSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// For client-side usage
export const supabase = createSupabaseClient()