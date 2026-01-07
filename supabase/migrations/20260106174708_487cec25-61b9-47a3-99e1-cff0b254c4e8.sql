-- Make storage buckets private and update policies

-- 1. Make invoice-pdfs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'invoice-pdfs';

-- 2. Make expense-receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';

-- 3. Drop the overly permissive public read policy on expense-receipts
DROP POLICY IF EXISTS "Public can view expense receipts" ON storage.objects;

-- 4. Create proper authenticated read policies for invoice-pdfs
-- Users can only read their own invoices (files are stored as user_id/filename)
DROP POLICY IF EXISTS "Users can view own invoice pdfs" ON storage.objects;
CREATE POLICY "Users can view own invoice pdfs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoice-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Create proper authenticated read policies for expense-receipts
DROP POLICY IF EXISTS "Users can view own expense receipts" ON storage.objects;
CREATE POLICY "Users can view own expense receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'expense-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);