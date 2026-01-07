-- Create expected_expenses table for planned future expenses
CREATE TABLE public.expected_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expected_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'una_tantum',
  recurrence_months INTEGER,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expected_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own expected expenses"
ON public.expected_expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expected expenses"
ON public.expected_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expected expenses"
ON public.expected_expenses FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expected expenses"
ON public.expected_expenses FOR DELETE
USING (auth.uid() = user_id);

-- Add pension goal columns to user_financial_settings
ALTER TABLE public.user_financial_settings 
ADD COLUMN IF NOT EXISTS pension_target_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pension_target_years INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS payment_delay_days INTEGER DEFAULT 60;

-- Create updated_at trigger for expected_expenses
CREATE TRIGGER update_expected_expenses_updated_at
BEFORE UPDATE ON public.expected_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();