-- Add payment verification columns to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_screenshot_url text,
ADD COLUMN IF NOT EXISTS verification_method text CHECK (verification_method IN ('ocr', 'manual', null));

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for public read access
CREATE POLICY "Public read access for payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots');

-- Storage policy for public insert
CREATE POLICY "Public insert access for payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots');

-- Storage policy for public update
CREATE POLICY "Public update access for payment screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-screenshots');

-- Storage policy for public delete
CREATE POLICY "Public delete access for payment screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-screenshots');