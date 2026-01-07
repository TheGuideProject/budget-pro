-- Add initial balance fields to user_financial_settings
ALTER TABLE public.user_financial_settings 
ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_balance_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS use_custom_initial_balance BOOLEAN DEFAULT false;