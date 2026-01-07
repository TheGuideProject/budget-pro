-- Drop the problematic policy that exposes all primary profiles
DROP POLICY IF EXISTS "Users can view primary profiles for linking" ON public.user_profiles;

-- Create a more restrictive policy that only allows authenticated users 
-- to search for profiles by invite_code (needed for linking)
CREATE POLICY "Authenticated users can find profiles by invite code" 
ON public.user_profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND role = 'primary'::user_role
  AND invite_code IS NOT NULL
);

-- Note: This still allows viewing primary profiles but ONLY if the user is authenticated.
-- The frontend should query by invite_code to find a specific profile to link to.