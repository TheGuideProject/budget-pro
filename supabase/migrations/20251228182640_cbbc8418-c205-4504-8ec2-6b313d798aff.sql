-- Enum per ruoli utente (primary = gestore principale, secondary = profilo collegato)
CREATE TYPE public.user_role AS ENUM ('primary', 'secondary');

-- Tabella profili utente
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'primary',
  linked_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies per user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Primary can view linked secondary profile" ON public.user_profiles
  FOR SELECT USING (linked_to_user_id = auth.uid());

-- Tabella trasferimenti budget tra profili
CREATE TABLE public.budget_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  description TEXT DEFAULT 'Trasferimento budget familiare',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies per budget_transfers
CREATE POLICY "Users can view their transfers" ON public.budget_transfers
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Primary users can create transfers" ON public.budget_transfers
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their transfers" ON public.budget_transfers
  FOR UPDATE USING (auth.uid() = from_user_id);

CREATE POLICY "Users can delete their transfers" ON public.budget_transfers
  FOR DELETE USING (auth.uid() = from_user_id);

-- Aggiungi colonne alla tabella expenses per spese familiari
ALTER TABLE public.expenses ADD COLUMN is_family_expense BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN linked_transfer_id UUID REFERENCES public.budget_transfers(id) ON DELETE SET NULL;

-- Crea security definer function per verificare profili collegati
CREATE OR REPLACE FUNCTION public.is_linked_profile(_user_id uuid, _primary_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = _user_id
      AND linked_to_user_id = _primary_user_id
  )
$$;

-- Policy per permettere al primary di vedere le spese del secondary collegato
CREATE POLICY "Primary can view linked secondary expenses" ON public.expenses
  FOR SELECT USING (
    public.is_linked_profile(user_id, auth.uid())
  );

-- Trigger per aggiornare updated_at su user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();