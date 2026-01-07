-- Add personal data columns to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS years_worked INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS family_structure TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS family_members_count INTEGER DEFAULT 1;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS housing_type TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS housing_sqm INTEGER;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS heating_type TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS has_car BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS car_count INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS city_size TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS region TEXT;

-- Add employee-specific columns to user_financial_settings
ALTER TABLE public.user_financial_settings ADD COLUMN IF NOT EXISTS vacation_days_total INTEGER DEFAULT 26;
ALTER TABLE public.user_financial_settings ADD COLUMN IF NOT EXISTS vacation_days_used INTEGER DEFAULT 0;
ALTER TABLE public.user_financial_settings ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC DEFAULT 1.25;
ALTER TABLE public.user_financial_settings ADD COLUMN IF NOT EXISTS gross_salary NUMERIC;
ALTER TABLE public.user_financial_settings ADD COLUMN IF NOT EXISTS tax_bracket TEXT;
ALTER TABLE public.user_financial_settings ADD COLUMN IF NOT EXISTS sick_days_used INTEGER DEFAULT 0;
ALTER TABLE public.user_financial_settings ADD COLUMN IF NOT EXISTS permits_used INTEGER DEFAULT 0;