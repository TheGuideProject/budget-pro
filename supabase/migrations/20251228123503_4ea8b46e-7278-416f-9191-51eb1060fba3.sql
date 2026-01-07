-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoice-pdfs', 'invoice-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for invoice PDFs
CREATE POLICY "Users can upload their own invoice PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoice-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own invoice PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoice-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own invoice PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoice-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add pdf_url column to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;