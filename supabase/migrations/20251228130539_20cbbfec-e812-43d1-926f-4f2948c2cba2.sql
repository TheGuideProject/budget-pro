-- Create expense-receipts storage bucket for business expense receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('expense-receipts', 'expense-receipts', true);

-- Allow authenticated users to upload their own receipts
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expense-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own receipts
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'expense-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own receipts
CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'expense-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view receipts (bucket is public)
CREATE POLICY "Public can view expense receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-receipts');

-- Add project_id column to invoices table to link invoice to a project
ALTER TABLE public.invoices 
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;