import { createClerkSupabaseClientSsr } from './server'
import { createAdminClient } from './admin'
import type { Database, Tables, TablesInsert } from '@/types/database.types'

// User profile queries
export async function createUserProfile(profile: TablesInsert<'user_profiles'>) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert([profile])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserProfile(userId: string) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<Tables<'user_profiles'>>) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Project queries
export async function createProject(project: TablesInsert<'projects'>) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserProjects(userId: string) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getProject(projectId: string) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      prompts(*),
      artifacts(*)
    `)
    .eq('id', projectId)
    .single()
  
  if (error) throw error
  return data
}

export async function updateProject(projectId: string, updates: Partial<Tables<'projects'>>) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Prompt queries
export async function createPrompt(prompt: TablesInsert<'prompts'>) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('prompts')
    .insert([prompt])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getProjectPrompts(projectId: string) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Usage and quota queries
export async function usePromptQuota(userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.rpc('use_prompt_quota', {
    p_user_id: userId
  })
  
  if (error) throw error
  return data as boolean
}

export async function logUsage(log: TablesInsert<'usage_logs'>) {
  const supabase = await createClerkSupabaseClientSsr()
  
  const { data, error } = await supabase
    .from('usage_logs')
    .insert([log])
    .select()
    .single()
  
  if (error) throw error
  return data
}