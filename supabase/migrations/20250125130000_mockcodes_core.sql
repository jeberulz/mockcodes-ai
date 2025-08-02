-- Mockcodes Core Tables Migration
-- This adds the essential tables for the Mockcodes application

-- User profiles table (extends Clerk auth)
CREATE TABLE "public"."user_profiles" (
    "id" TEXT PRIMARY KEY, -- Clerk user ID
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "avatar_url" TEXT,
    "role" TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    "prompt_quota" INTEGER DEFAULT 15,
    "prompts_used" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Projects table
CREATE TABLE "public"."projects" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "screenshot_url" TEXT, -- URL of uploaded screenshot
    "code_type" TEXT DEFAULT 'html', -- html, react, vue, etc.
    "status" TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    "prompt_count" INTEGER DEFAULT 0, -- Number of prompts used for this project
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Prompts table (stores AI-generated prompts)
CREATE TABLE "public"."prompts" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    "content" TEXT NOT NULL, -- The actual prompt text
    "ai_model" TEXT, -- GPT-4o, Claude 3 Sonnet, etc.
    "generated_code_url" TEXT, -- URL where generated code is stored
    "status" TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'customized', 'used')),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Generated artifacts table (stores code outputs)
CREATE TABLE "public"."artifacts" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "prompt_id" UUID REFERENCES prompts(id) ON DELETE SET NULL,
    "user_id" TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    "artifact_type" TEXT NOT NULL CHECK (artifact_type IN ('html', 'css', 'js', 'zip', 'preview')),
    "file_url" TEXT NOT NULL, -- URL in Supabase Storage
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Usage tracking table (for quota management)
CREATE TABLE "public"."usage_logs" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    "action" TEXT NOT NULL, -- 'prompt_generated', 'code_scaffolded', etc.
    "project_id" UUID REFERENCES projects(id) ON DELETE SET NULL,
    "prompt_id" UUID REFERENCES prompts(id) ON DELETE SET NULL,
    "metadata" JSONB, -- Extra data about the action
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX idx_prompts_project_id ON prompts(project_id);
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);

CREATE INDEX idx_artifacts_project_id ON artifacts(project_id);
CREATE INDEX idx_artifacts_user_id ON artifacts(user_id);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prompts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."artifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."usage_logs" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles: users can only see/edit their own profile
CREATE POLICY "users_can_view_own_profile" ON "public"."user_profiles"
    FOR SELECT USING (id = requesting_user_id());

CREATE POLICY "users_can_update_own_profile" ON "public"."user_profiles"
    FOR UPDATE USING (id = requesting_user_id());

CREATE POLICY "users_can_insert_own_profile" ON "public"."user_profiles"
    FOR INSERT WITH CHECK (id = requesting_user_id());

-- Projects: users can only access their own projects
CREATE POLICY "users_can_view_own_projects" ON "public"."projects"
    FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "users_can_create_own_projects" ON "public"."projects"
    FOR INSERT WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "users_can_update_own_projects" ON "public"."projects"
    FOR UPDATE USING (user_id = requesting_user_id());

CREATE POLICY "users_can_delete_own_projects" ON "public"."projects"
    FOR DELETE USING (user_id = requesting_user_id());

-- Prompts: users can only access prompts for their own projects
CREATE POLICY "users_can_view_own_prompts" ON "public"."prompts"
    FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "users_can_create_own_prompts" ON "public"."prompts"
    FOR INSERT WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "users_can_update_own_prompts" ON "public"."prompts"
    FOR UPDATE USING (user_id = requesting_user_id());

-- Artifacts: users can only access artifacts for their own projects
CREATE POLICY "users_can_view_own_artifacts" ON "public"."artifacts"
    FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "users_can_create_own_artifacts" ON "public"."artifacts"
    FOR INSERT WITH CHECK (user_id = requesting_user_id());

-- Usage logs: users can only view their own usage
CREATE POLICY "users_can_view_own_usage" ON "public"."usage_logs"
    FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "users_can_create_own_usage" ON "public"."usage_logs"
    FOR INSERT WITH CHECK (user_id = requesting_user_id());

-- Admin policies (admins can access all data)
CREATE POLICY "admins_can_view_all_profiles" ON "public"."user_profiles"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = requesting_user_id() AND role = 'admin'
        )
    );

CREATE POLICY "admins_can_view_all_projects" ON "public"."projects"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = requesting_user_id() AND role = 'admin'
        )
    );

-- Functions for quota management
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_profiles 
    SET prompts_used = 0
    WHERE prompts_used > 0;
END;
$$;

-- Function to check and update quota usage
CREATE OR REPLACE FUNCTION use_prompt_quota(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_quota INTEGER;
    current_used INTEGER;
BEGIN
    SELECT prompt_quota, prompts_used 
    INTO current_quota, current_used
    FROM user_profiles 
    WHERE id = p_user_id;
    
    IF current_used >= current_quota THEN
        RETURN FALSE; -- Quota exceeded
    END IF;
    
    UPDATE user_profiles 
    SET prompts_used = prompts_used + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE; -- Quota used successfully
END;
$$;