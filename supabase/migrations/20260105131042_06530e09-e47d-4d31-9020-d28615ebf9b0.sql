-- Fix user_profiles policies to require authentication
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Primary can view linked secondary profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Primary can view linked secondary profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (linked_to_user_id = auth.uid());

-- Fix user_financial_settings policies to require authentication
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_financial_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_financial_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_financial_settings;

CREATE POLICY "Users can view their own settings" 
ON public.user_financial_settings 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_financial_settings 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_financial_settings 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);