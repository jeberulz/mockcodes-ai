-- Fix infinite recursion in RLS policies caused by admin policy checking user_profiles from within user_profiles policy

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON "public"."user_profiles";

-- Recreate admin policy without recursion by using a simpler approach
-- We'll check if the requesting user has admin role via a direct function instead of subquery
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = requesting_user_id() AND role = 'admin'
  );
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO public;

-- Now create the admin policy using the function (this won't cause recursion)
CREATE POLICY "admins_can_view_all_profiles" ON "public"."user_profiles"
    FOR SELECT USING (is_admin_user());

-- Also fix the admin policy for projects
DROP POLICY IF EXISTS "admins_can_view_all_projects" ON "public"."projects";
CREATE POLICY "admins_can_view_all_projects" ON "public"."projects"
    FOR SELECT USING (is_admin_user());

-- Add comment for clarity
COMMENT ON FUNCTION public.is_admin_user() IS 'Check if the current user has admin role - used to prevent RLS policy recursion';