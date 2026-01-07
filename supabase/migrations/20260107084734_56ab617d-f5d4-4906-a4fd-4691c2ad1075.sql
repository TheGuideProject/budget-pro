-- Add company data fields to invoice_settings
ALTER TABLE public.invoice_settings
ADD COLUMN IF NOT EXISTS company_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS company_address text DEFAULT '',
ADD COLUMN IF NOT EXISTS company_country text DEFAULT 'Italia',
ADD COLUMN IF NOT EXISTS company_iban text DEFAULT '',
ADD COLUMN IF NOT EXISTS company_bic text DEFAULT '',
ADD COLUMN IF NOT EXISTS company_bank_address text DEFAULT '',
ADD COLUMN IF NOT EXISTS company_vat text DEFAULT '',
ADD COLUMN IF NOT EXISTS company_email text DEFAULT '';

-- Add email field to user_clients for invoice sending
ALTER TABLE public.user_clients
ADD COLUMN IF NOT EXISTS email text DEFAULT '';