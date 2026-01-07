-- ============================================
-- FASE 1: NUOVE TABELLE PER SISTEMA HOUSEHOLD
-- ============================================

-- 1. ENUM TYPES
CREATE TYPE household_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE account_owner_type AS ENUM ('member', 'household');
CREATE TYPE account_type AS ENUM ('bank', 'cash', 'card', 'wallet', 'virtual');
CREATE TYPE account_visibility AS ENUM ('personal', 'shared');
CREATE TYPE transaction_scope AS ENUM ('member', 'household');
CREATE TYPE transaction_type AS ENUM ('expense', 'income', 'transfer');
CREATE TYPE transaction_status AS ENUM ('actual', 'planned');
CREATE TYPE allocation_share_type AS ENUM ('amount', 'percent');
CREATE TYPE privacy_mode AS ENUM ('detailed', 'summary');
CREATE TYPE visibility_scope AS ENUM ('all_recipient_spend', 'only_supported_funds');
CREATE TYPE income_source_type AS ENUM ('salary', 'pension', 'freelance', 'support', 'other');
CREATE TYPE income_frequency AS ENUM ('monthly', 'biweekly', 'weekly', 'one_time');

-- 2. HOUSEHOLDS TABLE
CREATE TABLE public.households (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  timezone TEXT NOT NULL DEFAULT 'Europe/Rome',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. HOUSEHOLD_MEMBERS TABLE
CREATE TABLE public.household_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role household_member_role NOT NULL DEFAULT 'member',
  permissions JSONB NOT NULL DEFAULT '{
    "can_manage_income_sources": true,
    "can_view_household_totals": true,
    "can_manage_accounts": false,
    "can_invite_members": false,
    "can_manage_support": false,
    "can_view_all_transactions": false,
    "can_export_data": false
  }'::jsonb,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- 4. ACCOUNTS TABLE
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  owner_type account_owner_type NOT NULL DEFAULT 'member',
  owner_id UUID NOT NULL,
  type account_type NOT NULL DEFAULT 'bank',
  name TEXT NOT NULL,
  visibility account_visibility NOT NULL DEFAULT 'personal',
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. HOUSEHOLD_TRANSACTIONS TABLE (unificata)
CREATE TABLE public.household_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  scope transaction_scope NOT NULL DEFAULT 'member',
  scope_owner_id UUID NOT NULL,
  type transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  merchant TEXT,
  description TEXT NOT NULL,
  notes TEXT,
  category_parent TEXT,
  category_child TEXT,
  status transaction_status NOT NULL DEFAULT 'actual',
  attachment_url TEXT,
  created_by_member_id UUID REFERENCES public.household_members(id) ON DELETE SET NULL,
  legacy_expense_id UUID,
  legacy_transfer_id UUID,
  related_transfer_id UUID REFERENCES public.household_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ALLOCATIONS TABLE (split/beneficiari)
CREATE TABLE public.allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.household_transactions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE,
  share_type allocation_share_type NOT NULL DEFAULT 'amount',
  share_value NUMERIC NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. SUPPORT_RELATIONSHIPS TABLE (privacy supporto economico)
CREATE TABLE public.support_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  supporter_member_id UUID NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE,
  recipient_member_id UUID NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE,
  privacy_mode privacy_mode NOT NULL DEFAULT 'detailed',
  scope_of_visibility visibility_scope NOT NULL DEFAULT 'all_recipient_spend',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, supporter_member_id, recipient_member_id)
);

-- 8. INCOME_SOURCES TABLE (entrate per qualsiasi membro)
CREATE TABLE public.income_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE,
  type income_source_type NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency income_frequency NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_household_members_household ON public.household_members(household_id);
CREATE INDEX idx_household_members_user ON public.household_members(user_id);
CREATE INDEX idx_accounts_household ON public.accounts(household_id);
CREATE INDEX idx_accounts_owner ON public.accounts(owner_type, owner_id);
CREATE INDEX idx_household_transactions_household ON public.household_transactions(household_id);
CREATE INDEX idx_household_transactions_scope_owner ON public.household_transactions(scope_owner_id);
CREATE INDEX idx_household_transactions_date ON public.household_transactions(date);
CREATE INDEX idx_household_transactions_type ON public.household_transactions(type);
CREATE INDEX idx_household_transactions_legacy_expense ON public.household_transactions(legacy_expense_id);
CREATE INDEX idx_household_transactions_legacy_transfer ON public.household_transactions(legacy_transfer_id);
CREATE INDEX idx_allocations_transaction ON public.allocations(transaction_id);
CREATE INDEX idx_allocations_member ON public.allocations(member_id);
CREATE INDEX idx_support_relationships_household ON public.support_relationships(household_id);
CREATE INDEX idx_support_relationships_supporter ON public.support_relationships(supporter_member_id);
CREATE INDEX idx_support_relationships_recipient ON public.support_relationships(recipient_member_id);
CREATE INDEX idx_income_sources_member ON public.income_sources(member_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- HOUSEHOLDS: Users can see households they are members of
CREATE POLICY "Users can view their households"
ON public.households FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = households.id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Users can create households"
ON public.households FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update households"
ON public.households FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = households.id AND hm.user_id = auth.uid() AND hm.role = 'owner' AND hm.left_at IS NULL
  )
);

-- HOUSEHOLD_MEMBERS: Users can see members of their households
CREATE POLICY "Users can view household members"
ON public.household_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members my_membership
    WHERE my_membership.household_id = household_members.household_id 
    AND my_membership.user_id = auth.uid() 
    AND my_membership.left_at IS NULL
  )
);

CREATE POLICY "Users can insert themselves as members"
ON public.household_members FOR INSERT
WITH CHECK (user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.role IN ('owner', 'admin')
    AND hm.left_at IS NULL
  )
);

CREATE POLICY "Users can update their own membership"
ON public.household_members FOR UPDATE
USING (user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.role IN ('owner', 'admin')
    AND hm.left_at IS NULL
  )
);

-- ACCOUNTS: Members can manage accounts in their household
CREATE POLICY "Members can view household accounts"
ON public.accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = accounts.household_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Members can insert accounts"
ON public.accounts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = accounts.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.left_at IS NULL
    AND (hm.permissions->>'can_manage_accounts')::boolean = true
  )
);

CREATE POLICY "Members can update accounts"
ON public.accounts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = accounts.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.left_at IS NULL
    AND (hm.permissions->>'can_manage_accounts')::boolean = true
  )
);

CREATE POLICY "Members can delete accounts"
ON public.accounts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = accounts.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.left_at IS NULL
    AND (hm.permissions->>'can_manage_accounts')::boolean = true
  )
);

-- HOUSEHOLD_TRANSACTIONS: Complex privacy-aware policies
CREATE POLICY "Members can view transactions"
ON public.household_transactions FOR SELECT
USING (
  -- User is a member of the household
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_transactions.household_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
  AND (
    -- It's their own transaction
    household_transactions.scope_owner_id IN (
      SELECT hm2.id FROM public.household_members hm2 WHERE hm2.user_id = auth.uid()
    )
    OR
    -- They have permission to view all transactions
    EXISTS (
      SELECT 1 FROM public.household_members hm3
      WHERE hm3.household_id = household_transactions.household_id 
      AND hm3.user_id = auth.uid() 
      AND (hm3.permissions->>'can_view_all_transactions')::boolean = true
    )
    OR
    -- There's a support relationship with detailed privacy
    EXISTS (
      SELECT 1 FROM public.support_relationships sr
      JOIN public.household_members supporter ON supporter.id = sr.supporter_member_id
      JOIN public.household_members recipient ON recipient.id = sr.recipient_member_id
      WHERE sr.household_id = household_transactions.household_id
      AND supporter.user_id = auth.uid()
      AND recipient.id = household_transactions.scope_owner_id
      AND sr.privacy_mode = 'detailed'
      AND sr.start_date <= CURRENT_DATE
      AND (sr.end_date IS NULL OR sr.end_date >= CURRENT_DATE)
    )
    OR
    -- It's a household-scope transaction
    household_transactions.scope = 'household'
  )
);

CREATE POLICY "Members can insert transactions"
ON public.household_transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_transactions.household_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Members can update own transactions"
ON public.household_transactions FOR UPDATE
USING (
  household_transactions.scope_owner_id IN (
    SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.household_members hm2
    WHERE hm2.household_id = household_transactions.household_id 
    AND hm2.user_id = auth.uid() 
    AND hm2.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Members can delete own transactions"
ON public.household_transactions FOR DELETE
USING (
  household_transactions.scope_owner_id IN (
    SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.household_members hm2
    WHERE hm2.household_id = household_transactions.household_id 
    AND hm2.user_id = auth.uid() 
    AND hm2.role IN ('owner', 'admin')
  )
);

-- ALLOCATIONS
CREATE POLICY "Members can view allocations"
ON public.allocations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_transactions ht
    JOIN public.household_members hm ON hm.household_id = ht.household_id
    WHERE ht.id = allocations.transaction_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Members can insert allocations"
ON public.allocations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_transactions ht
    JOIN public.household_members hm ON hm.household_id = ht.household_id
    WHERE ht.id = allocations.transaction_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Members can update allocations"
ON public.allocations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_transactions ht
    JOIN public.household_members hm ON hm.household_id = ht.household_id
    WHERE ht.id = allocations.transaction_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Members can delete allocations"
ON public.allocations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_transactions ht
    JOIN public.household_members hm ON hm.household_id = ht.household_id
    WHERE ht.id = allocations.transaction_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

-- SUPPORT_RELATIONSHIPS
CREATE POLICY "Members can view support relationships"
ON public.support_relationships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = support_relationships.household_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Supporters and recipients can insert relationships"
ON public.support_relationships FOR INSERT
WITH CHECK (
  support_relationships.supporter_member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
  OR support_relationships.recipient_member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = support_relationships.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.role = 'owner'
  )
);

CREATE POLICY "Supporters and recipients can update relationships"
ON public.support_relationships FOR UPDATE
USING (
  support_relationships.supporter_member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
  OR support_relationships.recipient_member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = support_relationships.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.role = 'owner'
  )
);

CREATE POLICY "Supporters and recipients can delete relationships"
ON public.support_relationships FOR DELETE
USING (
  support_relationships.supporter_member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
  OR support_relationships.recipient_member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = support_relationships.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.role = 'owner'
  )
);

-- INCOME_SOURCES
CREATE POLICY "Members can view income sources in their household"
ON public.income_sources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    JOIN public.household_members owner_member ON owner_member.id = income_sources.member_id
    WHERE hm.household_id = owner_member.household_id AND hm.user_id = auth.uid() AND hm.left_at IS NULL
  )
);

CREATE POLICY "Members can manage own income sources"
ON public.income_sources FOR INSERT
WITH CHECK (
  income_sources.member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
);

CREATE POLICY "Members can update own income sources"
ON public.income_sources FOR UPDATE
USING (
  income_sources.member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
);

CREATE POLICY "Members can delete own income sources"
ON public.income_sources FOR DELETE
USING (
  income_sources.member_id IN (SELECT hm.id FROM public.household_members hm WHERE hm.user_id = auth.uid())
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_household_members_updated_at
  BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_household_transactions_updated_at
  BEFORE UPDATE ON public.household_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_relationships_updated_at
  BEFORE UPDATE ON public.support_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_sources_updated_at
  BEFORE UPDATE ON public.income_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();