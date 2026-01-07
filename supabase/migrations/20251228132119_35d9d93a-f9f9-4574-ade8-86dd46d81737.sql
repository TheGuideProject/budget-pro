-- Add paid_by column to track who paid the bill (for shared expenses like utilities)
ALTER TABLE public.expenses 
ADD COLUMN paid_by text;

-- Add bill_type column for utility bill categorization
ALTER TABLE public.expenses 
ADD COLUMN bill_type text;

-- Add bill_provider column (e.g., Enel, Eni, etc.)
ALTER TABLE public.expenses 
ADD COLUMN bill_provider text;

-- Add bill_period_start and bill_period_end for the billing period
ALTER TABLE public.expenses 
ADD COLUMN bill_period_start timestamp with time zone;

ALTER TABLE public.expenses 
ADD COLUMN bill_period_end timestamp with time zone;

-- Add consumption_value for utilities (kWh, m³, etc.)
ALTER TABLE public.expenses 
ADD COLUMN consumption_value numeric;

-- Add consumption_unit for the unit of measure
ALTER TABLE public.expenses 
ADD COLUMN consumption_unit text;