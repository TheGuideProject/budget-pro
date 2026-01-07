-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('contanti', 'bancomat', 'carta_credito', 'bonifico');

-- Create expense type enum
CREATE TYPE public.expense_type AS ENUM ('privata', 'aziendale');

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  client TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to expenses table
ALTER TABLE public.expenses 
  ADD COLUMN purchase_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN booked_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN expense_type public.expense_type DEFAULT 'privata',
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN payment_method public.payment_method DEFAULT 'contanti',
  ADD COLUMN notes TEXT,
  ADD COLUMN attachment_url TEXT;

-- Update existing expenses: set purchase_date from date column
UPDATE public.expenses SET purchase_date = date, booked_date = date WHERE purchase_date IS NULL;

-- Create budget_audit_log table for tracking recalculations
CREATE TABLE public.budget_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on budget_audit_log
ALTER TABLE public.budget_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_audit_log
CREATE POLICY "Users can view their own audit logs" ON public.budget_audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own audit logs" ON public.budget_audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);