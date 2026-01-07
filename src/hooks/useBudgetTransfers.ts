import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BudgetTransfer } from '@/types/family';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export function useBudgetTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<BudgetTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    if (!user) {
      setTransfers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budget_transfers')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
      } else {
        setTransfers(data?.map(mapDbToTransfer) || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [user]);

  const createTransfer = async (
    toUserId: string,
    amount: number,
    month: string,
    description?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('budget_transfers')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        amount,
        month,
        description: description || 'Trasferimento budget familiare',
      })
      .select()
      .single();

    if (!error && data) {
      setTransfers(prev => [mapDbToTransfer(data), ...prev]);
    }

    return { error, data: data ? mapDbToTransfer(data) : null };
  };

  // Allow secondary user to create historical transfers (from their linked primary)
  const createTransferAsSecondary = async (
    fromPrimaryUserId: string,
    amount: number,
    month: string,
    description?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('budget_transfers')
      .insert({
        from_user_id: fromPrimaryUserId,
        to_user_id: user.id,
        amount,
        month,
        description: description || 'Trasferimento passato',
      })
      .select()
      .single();

    if (!error && data) {
      setTransfers(prev => [mapDbToTransfer(data), ...prev]);
    }

    return { error, data: data ? mapDbToTransfer(data) : null };
  };

  // Bulk create transfers (for import) - uses upsert to skip duplicates
  const createTransfersBulk = async (
    transfersData: Array<{ 
      fromUserId: string; 
      toUserId?: string;
      amount: number; 
      month: string; 
      description?: string; 
      transferDate?: string;
      bankRowKey?: string;
    }>
  ) => {
    if (!user) return { error: new Error('Not authenticated'), importedCount: 0, skippedCount: 0 };
    if (transfersData.length === 0) return { error: undefined, importedCount: 0, skippedCount: 0 };

    const dbRows = transfersData.map(t => ({
      from_user_id: t.fromUserId,
      to_user_id: t.toUserId || user.id,
      amount: t.amount,
      month: t.month,
      description: t.description || 'Trasferimento importato',
      transfer_date: t.transferDate || null,
      bank_row_key: t.bankRowKey || null,
    }));

    // Use upsert with ignoreDuplicates to skip already-imported rows
    const { data, error } = await supabase
      .from('budget_transfers')
      .upsert(dbRows, { 
        onConflict: 'to_user_id,bank_row_key',
        ignoreDuplicates: true 
      })
      .select();

    const importedCount = data?.length || 0;
    const skippedCount = transfersData.length - importedCount;

    if (!error && data) {
      setTransfers(prev => [...data.map(mapDbToTransfer), ...prev]);
    }

    await fetchTransfers(); // Refresh to get accurate state

    return { error: error ? new Error(error.message) : undefined, importedCount, skippedCount };
  };

  const deleteTransfer = async (transferId: string) => {
    const { error } = await supabase
      .from('budget_transfers')
      .delete()
      .eq('id', transferId);

    if (!error) {
      setTransfers(prev => prev.filter(t => t.id !== transferId));
    }

    return { error };
  };

  const getTransfersByMonth = (month: string) => {
    return transfers.filter(t => t.month === month);
  };

  const getTotalTransferredForMonth = (month: string, direction: 'sent' | 'received') => {
    if (!user) return 0;
    
    return transfers
      .filter(t => {
        if (t.month !== month) return false;
        if (direction === 'sent') return t.fromUserId === user.id;
        return t.toUserId === user.id;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Calculate accumulated budget up to and including targetMonth
  // This includes carryover from previous months
  const getAccumulatedBudget = (
    targetMonth: string,
    direction: 'sent' | 'received',
    expensesByMonth: Map<string, number>
  ) => {
    if (!user) return { totalBudget: 0, totalSpent: 0, remaining: 0, carryover: 0, hasNegativeHistory: false };

    // Get all unique months from BOTH transfers and expenses, sorted chronologically
    const transferMonths = transfers.map(t => t.month);
    const expenseMonths = [...expensesByMonth.keys()];
    const allMonths = [...new Set([...transferMonths, ...expenseMonths])].sort();
    
    let runningBalance = 0;
    let carryoverFromPrevious = 0;
    let hasNegativeHistory = false;

    for (const month of allMonths) {
      if (month > targetMonth) break;

      const monthTransfers = transfers.filter(t => {
        if (t.month !== month) return false;
        return direction === 'sent' ? t.fromUserId === user.id : t.toUserId === user.id;
      });

      // All transfers contribute to the month's budget (including resets)
      const monthBudget = monthTransfers.reduce((sum, t) => sum + t.amount, 0);
      const monthSpent = expensesByMonth.get(month) || 0;

      // Calculate this month's balance
      const monthBalance = monthBudget - monthSpent;
      runningBalance += monthBalance;

      // Track if we've gone negative at any point
      if (runningBalance < 0) {
        hasNegativeHistory = true;
      }

      // Carryover is the balance BEFORE the target month
      if (month < targetMonth) {
        carryoverFromPrevious = runningBalance;
      }
    }

    return {
      totalBudget: 0, // Not used
      totalSpent: 0, // Not used
      remaining: runningBalance,
      carryover: carryoverFromPrevious,
      hasNegativeHistory,
    };
  };

  // Reset carryover by creating a compensatory transfer (for primary user)
  const resetCarryover = async (
    targetMonth: string,
    toUserId: string,
    negativeAmount: number
  ) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (negativeAmount >= 0) return { error: new Error('No negative carryover to reset') };

    // Create a compensatory transfer to zero out the deficit
    const { data, error } = await supabase
      .from('budget_transfers')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        amount: Math.abs(negativeAmount),
        month: targetMonth,
        description: 'Azzeramento storico pregresso',
      })
      .select()
      .single();

    if (!error && data) {
      setTransfers(prev => [mapDbToTransfer(data), ...prev]);
    }

    return { error, data: data ? mapDbToTransfer(data) : null };
  };

  // Reset carryover for secondary user - creates a "virtual" transfer to reset accumulated budget
  const resetCarryoverAsSecondary = async (
    fromPrimaryUserId: string,
    targetMonth: string,
    carryoverAmount: number
  ) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (carryoverAmount === 0) return { error: new Error('Nessun pregresso da azzerare') };

    // Create a compensatory transfer: 
    // - If carryover is positive (credit), we create a negative adjustment
    // - If carryover is negative (debt), we create a positive adjustment
    // The transfer amount should bring the carryover to zero
    const { data, error } = await supabase
      .from('budget_transfers')
      .insert({
        from_user_id: fromPrimaryUserId,
        to_user_id: user.id,
        amount: -carryoverAmount, // Inverse of carryover to zero it out
        month: targetMonth,
        description: `Azzeramento pregresso da ${targetMonth}`,
      })
      .select()
      .single();

    if (!error && data) {
      setTransfers(prev => [mapDbToTransfer(data), ...prev]);
    }

    return { error, data: data ? mapDbToTransfer(data) : null };
  };

  return {
    transfers,
    loading,
    createTransfer,
    createTransferAsSecondary,
    createTransfersBulk,
    deleteTransfer,
    getTransfersByMonth,
    getTotalTransferredForMonth,
    getAccumulatedBudget,
    resetCarryover,
    resetCarryoverAsSecondary,
    refetch: fetchTransfers,
  };
}

function mapDbToTransfer(data: any): BudgetTransfer {
  return {
    id: data.id,
    fromUserId: data.from_user_id,
    toUserId: data.to_user_id,
    amount: Number(data.amount),
    month: data.month,
    description: data.description,
    transferDate: data.transfer_date || null,
    bankRowKey: data.bank_row_key || null,
    createdAt: new Date(data.created_at),
  };
}
