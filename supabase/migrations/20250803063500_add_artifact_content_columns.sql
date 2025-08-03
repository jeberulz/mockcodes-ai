-- Add content columns to artifacts table for direct code storage
-- This allows the AI agent to store HTML, CSS, JS content directly

ALTER TABLE "public"."artifacts" 
ADD COLUMN "html_content" TEXT,
ADD COLUMN "css_content" TEXT,
ADD COLUMN "js_content" TEXT,
ADD COLUMN "preview_html" TEXT,
ADD COLUMN "preview_url" TEXT;

-- Update the artifact_type check constraint to include new types
ALTER TABLE "public"."artifacts" 
DROP CONSTRAINT IF EXISTS artifacts_artifact_type_check;

ALTER TABLE "public"."artifacts" 
ADD CONSTRAINT artifacts_artifact_type_check 
CHECK (artifact_type IN ('html', 'css', 'js', 'zip', 'preview', 'full_project'));

-- Add index for preview lookups
CREATE INDEX idx_artifacts_preview_url ON artifacts(preview_url) WHERE preview_url IS NOT NULL;