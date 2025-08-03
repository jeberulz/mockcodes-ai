-- Create storage buckets for file uploads
-- This is required for the upload functionality to work

-- Create screenshots bucket for image uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create artifacts bucket for generated code files (if needed)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('artifacts', 'artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for screenshots bucket
CREATE POLICY "Screenshots are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots');

CREATE POLICY "Users can upload screenshots" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'screenshots' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own screenshots" ON storage.objects FOR UPDATE USING (
  bucket_id = 'screenshots' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own screenshots" ON storage.objects FOR DELETE USING (
  bucket_id = 'screenshots' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Set up RLS policies for artifacts bucket
CREATE POLICY "Artifacts are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'artifacts');

CREATE POLICY "Users can upload artifacts" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'artifacts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own artifacts" ON storage.objects FOR UPDATE USING (
  bucket_id = 'artifacts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own artifacts" ON storage.objects FOR DELETE USING (
  bucket_id = 'artifacts' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);