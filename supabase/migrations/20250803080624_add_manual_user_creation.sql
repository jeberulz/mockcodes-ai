-- Helper function to manually create user profiles for testing
-- This is useful when Clerk webhooks aren't working in local development

CREATE OR REPLACE FUNCTION public.create_user_profile_if_missing()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO user_profiles (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    role,
    prompt_quota,
    prompts_used
  )
  SELECT 
    requesting_user_id(),
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email',
      'user@example.com'
    ),
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'given_name',
      'User'
    ),
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'family_name',
      'Test'
    ),
    current_setting('request.jwt.claims', true)::json->>'picture',
    'user',
    15,
    0
  WHERE requesting_user_id() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles WHERE id = requesting_user_id()
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile_if_missing() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_user_profile_if_missing() IS 'Creates user profile from JWT claims if it does not exist - useful for local development when webhooks are not working';