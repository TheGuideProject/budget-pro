-- Add fields for tracking bill payment status
ALTER TABLE public.expenses 
ADD COLUMN is_paid boolean DEFAULT true;

ALTER TABLE public.expenses 
ADD COLUMN paid_at timestamp with time zone;

-- Add index for quick filtering of unpaid bills
CREATE INDEX idx_expenses_is_paid ON public.expenses(is_paid) WHERE bill_type IS NOT NULL;