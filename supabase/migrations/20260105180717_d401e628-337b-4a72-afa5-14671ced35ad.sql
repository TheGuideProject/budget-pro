-- Permetti agli admin di vedere tutti i profili utente
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));