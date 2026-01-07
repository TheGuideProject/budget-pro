-- Aggiungere campo per configurare mesi di lookback per media spese variabili
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS variable_months_lookback INTEGER DEFAULT NULL;

-- Aggiungere constraint per validare range 1-12
ALTER TABLE public.user_profiles
ADD CONSTRAINT variable_months_lookback_range 
CHECK (variable_months_lookback IS NULL OR (variable_months_lookback >= 1 AND variable_months_lookback <= 12));

COMMENT ON COLUMN public.user_profiles.variable_months_lookback IS 
'Numero di mesi da considerare per la media delle spese variabili (1-12). NULL = automatico basato su età profilo.';