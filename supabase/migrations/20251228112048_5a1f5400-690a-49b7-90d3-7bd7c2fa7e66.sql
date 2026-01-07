-- Add user_id column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;

-- Create secure RLS policies for invoices
CREATE POLICY "Users can view their own invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
ON public.invoices FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create secure RLS policies for expenses
CREATE POLICY "Users can view their own expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
ON public.expenses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
ON public.expenses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);