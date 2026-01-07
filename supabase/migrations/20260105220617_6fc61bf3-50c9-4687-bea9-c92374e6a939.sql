-- Create a security definer function to check membership without triggering RLS
CREATE OR REPLACE FUNCTION public.user_household_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = _user_id AND left_at IS NULL;
$$;

-- Drop existing problematic policies on support_relationships
DROP POLICY IF EXISTS "Supporters and recipients can update relationships" ON public.support_relationships;
DROP POLICY IF EXISTS "Supporters and recipients can insert relationships" ON public.support_relationships;
DROP POLICY IF EXISTS "Supporters and recipients can delete relationships" ON public.support_relationships;
DROP POLICY IF EXISTS "Members can view support relationships" ON public.support_relationships;
DROP POLICY IF EXISTS "Recipients can update privacy settings" ON public.support_relationships;

-- Recreate SELECT policy for support_relationships
CREATE POLICY "Members can view support relationships"
ON public.support_relationships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.id IN (support_relationships.supporter_member_id, support_relationships.recipient_member_id)
    AND hm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = support_relationships.household_id
    AND h.created_by = auth.uid()
  )
);

-- Recreate INSERT policy for support_relationships
CREATE POLICY "Supporters can insert relationships"
ON public.support_relationships FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.id = supporter_member_id
    AND hm.user_id = auth.uid()
  )
);

-- Recreate UPDATE policy - only recipient can update privacy
CREATE POLICY "Recipients can update privacy settings"
ON public.support_relationships FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.id = support_relationships.recipient_member_id
    AND hm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = support_relationships.household_id
    AND h.created_by = auth.uid()
  )
);

-- Recreate DELETE policy
CREATE POLICY "Supporters and recipients can delete relationships"
ON public.support_relationships FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.id IN (support_relationships.supporter_member_id, support_relationships.recipient_member_id)
    AND hm.user_id = auth.uid()
  )
);

-- Fix household_members SELECT policy to use security definer function
DROP POLICY IF EXISTS "Users can view household members" ON public.household_members;

CREATE POLICY "Users can view household members"
ON public.household_members FOR SELECT
USING (
  user_id = auth.uid()
  OR
  household_id IN (SELECT public.user_household_ids(auth.uid()))
);