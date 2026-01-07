-- Allow users to view other primary profiles for family linking
CREATE POLICY "Users can view primary profiles for linking"
ON public.user_profiles
FOR SELECT
USING (role = 'primary');