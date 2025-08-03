-- Update projects table status constraint to include processing states
ALTER TABLE "public"."projects" 
DROP CONSTRAINT IF EXISTS "projects_status_check";

ALTER TABLE "public"."projects" 
ADD CONSTRAINT "projects_status_check" 
CHECK (status IN ('active', 'archived', 'deleted', 'processing', 'completed', 'failed'));