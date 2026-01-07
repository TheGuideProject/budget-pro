-- Make payment-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'payment-screenshots';

-- Drop public policies
DROP POLICY IF EXISTS "Public read access for payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public insert access for payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for payment screenshots" ON storage.objects;

-- Create user-scoped policies (files stored as user_id/filename)
CREATE POLICY "Users can upload their payment screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their payment screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their payment screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);