-- Add status column to artifacts table for tracking artifact lifecycle
-- This column is required by the AI agent's artifact manager
-- Also make some fields optional since AI agent stores content directly in new columns

-- Add status column with appropriate constraints
ALTER TABLE "public"."artifacts" 
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Make file_url and file_name optional since AI agent uses content columns directly
ALTER TABLE "public"."artifacts" 
ALTER COLUMN "file_url" DROP NOT NULL,
ALTER COLUMN "file_name" DROP NOT NULL;

-- Set default values for artifact_type since AI agent creates web artifacts
ALTER TABLE "public"."artifacts" 
ALTER COLUMN "artifact_type" SET DEFAULT 'preview';

-- Add index for performance when querying by status
CREATE INDEX idx_artifacts_status ON artifacts(status);

-- Update existing artifacts to have 'completed' status
-- (assuming existing artifacts are completed since they were created)
UPDATE "public"."artifacts" SET "status" = 'completed' WHERE "status" = 'pending';

-- Add comments for documentation
COMMENT ON COLUMN "public"."artifacts"."status" IS 'Tracks the lifecycle status of the artifact: pending, processing, completed, or failed';
COMMENT ON COLUMN "public"."artifacts"."file_url" IS 'Optional URL for file storage - can be null when content is stored in content columns';
COMMENT ON COLUMN "public"."artifacts"."file_name" IS 'Optional filename - can be null when content is stored directly';