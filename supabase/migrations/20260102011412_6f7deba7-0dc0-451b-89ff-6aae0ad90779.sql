-- Add columns for manual cost estimates
ALTER TABLE public.user_financial_settings 
ADD COLUMN IF NOT EXISTS estimated_fixed_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_variable_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_bills_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS use_manual_estimates BOOLEAN DEFAULT true;