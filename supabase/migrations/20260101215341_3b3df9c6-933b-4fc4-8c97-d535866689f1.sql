-- Create table for user financial settings (pension fund, daily rate, etc.)
CREATE TABLE public.user_financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  daily_rate NUMERIC DEFAULT 500,
  pension_monthly_amount NUMERIC DEFAULT 0,
  pension_start_date DATE,
  sp500_return_rate NUMERIC DEFAULT 0.10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_financial_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own settings"
ON public.user_financial_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
ON public.user_financial_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings"
ON public.user_financial_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_financial_settings_updated_at
BEFORE UPDATE ON public.user_financial_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();