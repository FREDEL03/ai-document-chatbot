-- Allow service role to manage storage objects in 'documents' bucket
CREATE POLICY "Service role full access" ON storage.objects
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');