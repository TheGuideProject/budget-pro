-- 1. Add RLS policy for secondary to create transfers from their linked primary
CREATE POLICY "Secondary can create transfers from linked primary"
ON budget_transfers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = to_user_id
  AND is_linked_profile(auth.uid(), from_user_id)
);

-- 2. Enable realtime on expenses table
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;