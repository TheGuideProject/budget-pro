import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from './useHousehold';
import { 
  HouseholdTransaction, 
  TransactionType,
  TransactionStatus,
  TransactionSummary,
} from '@/types/household';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface TransactionFilters {
  type?: TransactionType;
  memberId?: string;
  startDate?: Date;
  endDate?: Date;
  categoryParent?: string;
  status?: TransactionStatus;
}

export function useHouseholdTransactions(filters: TransactionFilters = {}) {
  const { household, currentMember } = useHousehold();
  const queryClient = useQueryClient();

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['household-transactions', household?.id, filters],
    queryFn: async () => {
      if (!household?.id) return [];

      let query = supabase
        .from('household_transactions')
        .select('*')
        .eq('household_id', household.id)
        .order('date', { ascending: false });

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.memberId) {
        query = query.eq('scope_owner_id', filters.memberId);
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate.toISOString());
      }

      if (filters.categoryParent) {
        query = query.eq('category_parent', filters.categoryParent);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as HouseholdTransaction[];
    },
    enabled: !!household?.id,
  });

  // Add transaction
  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<HouseholdTransaction, 'id' | 'created_at' | 'updated_at' | 'household_id' | 'created_by_member_id'>) => {
      if (!household?.id || !currentMember?.id) throw new Error('Not in a household');

      const { data, error } = await supabase
        .from('household_transactions')
        .insert({
          ...transaction,
          household_id: household.id,
          created_by_member_id: currentMember.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as HouseholdTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-transactions'] });
    },
  });

  // Update transaction
  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HouseholdTransaction> }) => {
      const { data, error } = await supabase
        .from('household_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HouseholdTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-transactions'] });
    },
  });

  // Delete transaction
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('household_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-transactions'] });
    },
  });

  // Create transfer (creates both outgoing transfer and incoming income)
  const createTransfer = useMutation({
    mutationFn: async ({
      amount,
      toMemberId,
      description,
      date = new Date(),
    }: {
      amount: number;
      toMemberId: string;
      description: string;
      date?: Date;
    }) => {
      if (!household?.id || !currentMember?.id) throw new Error('Not in a household');

      // Create outgoing transfer
      const { data: transfer, error: transferError } = await supabase
        .from('household_transactions')
        .insert({
          household_id: household.id,
          scope: 'member',
          scope_owner_id: currentMember.id,
          type: 'transfer',
          amount,
          date: date.toISOString(),
          description,
          created_by_member_id: currentMember.id,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create incoming income for recipient
      const { data: income, error: incomeError } = await supabase
        .from('household_transactions')
        .insert({
          household_id: household.id,
          scope: 'member',
          scope_owner_id: toMemberId,
          type: 'income',
          amount,
          date: date.toISOString(),
          description: `Ricevuto: ${description}`,
          related_transfer_id: transfer.id,
          created_by_member_id: currentMember.id,
        })
        .select()
        .single();

      if (incomeError) throw incomeError;

      // Update transfer with related income id
      await supabase
        .from('household_transactions')
        .update({ related_transfer_id: income.id })
        .eq('id', transfer.id);

      return { transfer, income };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-transactions'] });
    },
  });

  // Calculate summary for a member (for privacy-restricted views)
  const getMemberSummary = (memberId: string, month?: Date): TransactionSummary => {
    const monthStart = month ? startOfMonth(month) : startOfMonth(new Date());
    const monthEnd = month ? endOfMonth(month) : endOfMonth(new Date());

    const memberTransactions = transactions.filter(
      t => t.scope_owner_id === memberId &&
           t.type === 'expense' &&
           new Date(t.date) >= monthStart &&
           new Date(t.date) <= monthEnd
    );

    const total = memberTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const byCategory = memberTransactions.reduce((acc, t) => {
      const cat = t.category_parent || 'Altro';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const categoryBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));

    return {
      total_amount: total,
      transaction_count: memberTransactions.length,
      period_start: format(monthStart, 'yyyy-MM-dd'),
      period_end: format(monthEnd, 'yyyy-MM-dd'),
      by_category: categoryBreakdown,
    };
  };

  // Calculate totals
  const totals = {
    income: transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0),
    expenses: transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0),
    transfers: transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  return {
    transactions,
    isLoading,
    totals,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    createTransfer,
    getMemberSummary,
  };
}
