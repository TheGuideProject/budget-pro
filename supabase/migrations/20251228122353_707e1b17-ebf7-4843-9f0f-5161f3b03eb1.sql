-- Add paid_date column to invoices table for tracking when advances/payments were received
ALTER TABLE public.invoices 
ADD COLUMN paid_date timestamp with time zone NULL;