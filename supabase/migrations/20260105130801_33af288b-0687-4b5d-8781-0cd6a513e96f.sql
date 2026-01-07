-- Drop the current policy that exposes all invite codes
DROP POLICY IF EXISTS "Authenticated users can find profiles by invite code" ON public.user_profiles;

-- Create a security definer function to lookup profile by exact invite code
-- This prevents users from listing all profiles - they must know the exact code
CREATE OR REPLACE FUNCTION public.get_profile_by_invite_code(_invite_code text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  role user_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.role
  FROM public.user_profiles p
  WHERE p.invite_code = _invite_code
    AND p.role = 'primary'::user_role
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.get_profile_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_by_invite_code(text) TO authenticated;