-- Drop existing policy and create new one that allows both sender and recipient to delete
DROP POLICY IF EXISTS "Users can delete their transfers" ON budget_transfers;

CREATE POLICY "Users can delete their transfers" 
ON budget_transfers 
FOR DELETE 
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);