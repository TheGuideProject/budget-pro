// Household System Types

export type HouseholdMemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type AccountOwnerType = 'member' | 'household';
export type AccountType = 'bank' | 'cash' | 'card' | 'wallet' | 'virtual';
export type AccountVisibility = 'personal' | 'shared';
export type TransactionScope = 'member' | 'household';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionStatus = 'actual' | 'planned';
export type AllocationShareType = 'amount' | 'percent';
export type PrivacyMode = 'detailed' | 'summary';
export type VisibilityScope = 'all_recipient_spend' | 'only_supported_funds';
export type IncomeSourceType = 'salary' | 'pension' | 'freelance' | 'support' | 'other';
export type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly' | 'one_time';

export interface MemberPermissions {
  can_manage_income_sources: boolean;
  can_view_household_totals: boolean;
  can_manage_accounts: boolean;
  can_invite_members: boolean;
  can_manage_support: boolean;
  can_view_all_transactions: boolean;
  can_export_data: boolean;
}

export const DEFAULT_PERMISSIONS: Record<HouseholdMemberRole, MemberPermissions> = {
  owner: {
    can_manage_income_sources: true,
    can_view_household_totals: true,
    can_manage_accounts: true,
    can_invite_members: true,
    can_manage_support: true,
    can_view_all_transactions: true,
    can_export_data: true,
  },
  admin: {
    can_manage_income_sources: true,
    can_view_household_totals: true,
    can_manage_accounts: true,
    can_invite_members: false,
    can_manage_support: true,
    can_view_all_transactions: true,
    can_export_data: true,
  },
  member: {
    can_manage_income_sources: true,
    can_view_household_totals: true,
    can_manage_accounts: false,
    can_invite_members: false,
    can_manage_support: false,
    can_view_all_transactions: false,
    can_export_data: false,
  },
  viewer: {
    can_manage_income_sources: false,
    can_view_household_totals: true,
    can_manage_accounts: false,
    can_invite_members: false,
    can_manage_support: false,
    can_view_all_transactions: false,
    can_export_data: false,
  },
};

export interface Household {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  role: HouseholdMemberRole;
  permissions: MemberPermissions;
  joined_at: string;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  household_id: string;
  owner_type: AccountOwnerType;
  owner_id: string;
  type: AccountType;
  name: string;
  visibility: AccountVisibility;
  balance: number | null;
  created_at: string;
  updated_at: string;
}

export interface HouseholdTransaction {
  id: string;
  household_id: string;
  account_id: string | null;
  scope: TransactionScope;
  scope_owner_id: string;
  type: TransactionType;
  amount: number;
  date: string;
  merchant: string | null;
  description: string;
  notes: string | null;
  category_parent: string | null;
  category_child: string | null;
  status: TransactionStatus;
  attachment_url: string | null;
  created_by_member_id: string | null;
  legacy_expense_id: string | null;
  legacy_transfer_id: string | null;
  related_transfer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Allocation {
  id: string;
  transaction_id: string;
  member_id: string;
  share_type: AllocationShareType;
  share_value: number;
  memo: string | null;
  created_at: string;
}

export interface SupportRelationship {
  id: string;
  household_id: string;
  supporter_member_id: string;
  recipient_member_id: string;
  privacy_mode: PrivacyMode;
  scope_of_visibility: VisibilityScope;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeSource {
  id: string;
  member_id: string;
  type: IncomeSourceType;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface HouseholdMemberWithRelations extends HouseholdMember {
  household?: Household;
  income_sources?: IncomeSource[];
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];
}

export interface SupportRelationshipWithMembers extends SupportRelationship {
  supporter?: HouseholdMember;
  recipient?: HouseholdMember;
}

// Summary types for privacy-restricted views
export interface TransactionSummary {
  total_amount: number;
  transaction_count: number;
  period_start: string;
  period_end: string;
  by_category?: { category: string; amount: number; percentage: number }[];
}

// Helper to check if transactions should be detailed or summary
export function canViewDetailedTransactions(
  viewerMemberId: string,
  transactionOwnerMemberId: string,
  supportRelationships: SupportRelationship[],
  viewerPermissions: MemberPermissions
): boolean {
  // Own transactions
  if (viewerMemberId === transactionOwnerMemberId) return true;
  
  // Has permission to view all
  if (viewerPermissions.can_view_all_transactions) return true;
  
  // Has support relationship with detailed privacy
  const relationship = supportRelationships.find(
    sr => sr.supporter_member_id === viewerMemberId && 
         sr.recipient_member_id === transactionOwnerMemberId &&
         sr.privacy_mode === 'detailed'
  );
  
  return !!relationship;
}
