-- Add column to exclude invoices from budget calculations
ALTER TABLE public.invoices 
  ADD COLUMN exclude_from_budget BOOLEAN NOT NULL DEFAULT false;