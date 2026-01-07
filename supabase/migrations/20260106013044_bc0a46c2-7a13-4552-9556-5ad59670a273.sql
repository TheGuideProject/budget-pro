-- Enable realtime for budget_transfers table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_transfers;