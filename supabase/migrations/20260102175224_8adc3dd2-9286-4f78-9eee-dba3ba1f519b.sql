-- Add income_type to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS income_type text DEFAULT NULL;

-- Add salary and bonus fields to user_financial_settings
ALTER TABLE public.user_financial_settings 
ADD COLUMN IF NOT EXISTS monthly_salary numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_thirteenth boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_fourteenth boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS thirteenth_month integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS fourteenth_month integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS production_bonus_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS production_bonus_month integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sales_bonus_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_bonus_months integer[] DEFAULT '{}';