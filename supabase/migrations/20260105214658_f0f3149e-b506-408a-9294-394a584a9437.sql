-- ============================================
-- FASE 2: MIGRAZIONE DATI ESISTENTI
-- ============================================

-- 1. Creare households per ogni utente primario
INSERT INTO public.households (id, name, created_by, created_at)
SELECT 
  gen_random_uuid(),
  'Famiglia ' || p.display_name,
  p.user_id,
  COALESCE(p.created_at, now())
FROM public.user_profiles p 
WHERE p.role = 'primary';

-- 2. Creare membri per utenti primari (owner)
INSERT INTO public.household_members (household_id, user_id, display_name, role, permissions, joined_at)
SELECT 
  h.id,
  p.user_id,
  p.display_name,
  'owner'::household_member_role,
  '{
    "can_manage_income_sources": true,
    "can_view_household_totals": true,
    "can_manage_accounts": true,
    "can_invite_members": true,
    "can_manage_support": true,
    "can_view_all_transactions": true,
    "can_export_data": true
  }'::jsonb,
  COALESCE(p.created_at, now())
FROM public.user_profiles p
JOIN public.households h ON h.created_by = p.user_id
WHERE p.role = 'primary';

-- 3. Creare membri per utenti secondari (member)
INSERT INTO public.household_members (household_id, user_id, display_name, role, permissions, joined_at)
SELECT 
  h.id,
  s.user_id,
  s.display_name,
  'member'::household_member_role,
  '{
    "can_manage_income_sources": true,
    "can_view_household_totals": true,
    "can_manage_accounts": false,
    "can_invite_members": false,
    "can_manage_support": false,
    "can_view_all_transactions": false,
    "can_export_data": false
  }'::jsonb,
  COALESCE(s.created_at, now())
FROM public.user_profiles s
JOIN public.households h ON h.created_by = s.linked_to_user_id
WHERE s.role = 'secondary' AND s.linked_to_user_id IS NOT NULL;

-- 4. Creare support_relationships per ogni coppia primario->secondario
INSERT INTO public.support_relationships (household_id, supporter_member_id, recipient_member_id, privacy_mode, scope_of_visibility, start_date)
SELECT 
  h.id,
  owner_member.id,
  secondary_member.id,
  'detailed'::privacy_mode,
  'all_recipient_spend'::visibility_scope,
  COALESCE(secondary_member.joined_at::date, CURRENT_DATE)
FROM public.households h
JOIN public.household_members owner_member ON owner_member.household_id = h.id AND owner_member.role = 'owner'
JOIN public.household_members secondary_member ON secondary_member.household_id = h.id AND secondary_member.role = 'member';

-- 5. Migrare budget_transfers come transazioni (tipo transfer per chi invia)
INSERT INTO public.household_transactions (
  household_id, scope, scope_owner_id, type, amount, date, description, notes,
  legacy_transfer_id, created_by_member_id, created_at
)
SELECT 
  hm_from.household_id,
  'member'::transaction_scope,
  hm_from.id,
  'transfer'::transaction_type,
  bt.amount,
  COALESCE(bt.transfer_date, bt.created_at)::timestamptz,
  COALESCE(bt.description, 'Trasferimento'),
  'Trasferimento a ' || COALESCE(hm_to.display_name, 'membro'),
  bt.id,
  hm_from.id,
  bt.created_at
FROM public.budget_transfers bt
JOIN public.household_members hm_from ON hm_from.user_id = bt.from_user_id
LEFT JOIN public.household_members hm_to ON hm_to.user_id = bt.to_user_id AND hm_to.household_id = hm_from.household_id
WHERE bt.from_user_id != bt.to_user_id; -- Escludi auto-trasferimenti

-- 6. Creare controparte income per chi riceve il trasferimento
INSERT INTO public.household_transactions (
  household_id, scope, scope_owner_id, type, amount, date, description, notes,
  legacy_transfer_id, created_by_member_id, created_at
)
SELECT 
  hm_to.household_id,
  'member'::transaction_scope,
  hm_to.id,
  'income'::transaction_type,
  bt.amount,
  COALESCE(bt.transfer_date, bt.created_at)::timestamptz,
  COALESCE(bt.description, 'Ricevuto trasferimento'),
  'Ricevuto da ' || COALESCE(hm_from.display_name, 'membro'),
  bt.id,
  hm_to.id,
  bt.created_at
FROM public.budget_transfers bt
JOIN public.household_members hm_to ON hm_to.user_id = bt.to_user_id
JOIN public.household_members hm_from ON hm_from.user_id = bt.from_user_id AND hm_from.household_id = hm_to.household_id
WHERE bt.from_user_id != bt.to_user_id; -- Escludi auto-trasferimenti

-- 7. Migrare spese esistenti come transazioni
INSERT INTO public.household_transactions (
  household_id, scope, scope_owner_id, type, amount, date, 
  merchant, description, notes, category_parent, category_child,
  status, attachment_url, legacy_expense_id, created_by_member_id, created_at
)
SELECT 
  hm.household_id,
  'member'::transaction_scope,
  hm.id,
  'expense'::transaction_type,
  e.amount,
  e.date::timestamptz,
  e.description, -- merchant from description
  COALESCE(e.notes, e.description),
  e.notes,
  e.category_parent,
  e.category_child,
  'actual'::transaction_status,
  e.attachment_url,
  e.id,
  hm.id,
  e.created_at
FROM public.expenses e
JOIN public.household_members hm ON hm.user_id = e.user_id
WHERE e.user_id IS NOT NULL;

-- 8. Aggiungere colonna legacy_household_id a user_profiles per tracking
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id);

-- 9. Aggiornare user_profiles con riferimento al household
UPDATE public.user_profiles p
SET household_id = h.id
FROM public.households h
WHERE h.created_by = p.user_id AND p.role = 'primary';

UPDATE public.user_profiles p
SET household_id = h.id
FROM public.households h
WHERE h.created_by = p.linked_to_user_id AND p.role = 'secondary';