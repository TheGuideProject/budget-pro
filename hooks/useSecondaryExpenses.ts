import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Expense, ExpenseCategory, PaymentMethod, ExpenseType, BillType, PaidBy } from '@/types';
import { isSameMonth } from 'date-fns';

interface UseSecondaryExpensesOptions {
  linkedUserId: string | null;
  selectedMonth?: Date;
}

// Helper to convert DB row to Expense
const dbToExpense = (row: any): Expense => ({
  id: row.id,
  description: row.description,
  amount: Number(row.amount),
  category: row.category as ExpenseCategory,
  date: new Date(row.date),
  purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
  bookedDate: row.booked_date ? new Date(row.booked_date) : undefined,
  dueMonth: row.due_month,
  recurring: row.recurring,
  expenseType: row.expense_type as ExpenseType | undefined,
  projectId: row.project_id,
  paymentMethod: row.payment_method as PaymentMethod | undefined,
  notes: row.notes,
  attachmentUrl: row.attachment_url,
  paidBy: row.paid_by as PaidBy | undefined,
  billType: row.bill_type as BillType | undefined,
  billProvider: row.bill_provider,
  billPeriodStart: row.bill_period_start ? new Date(row.bill_period_start) : undefined,
  billPeriodEnd: row.bill_period_end ? new Date(row.bill_period_end) : undefined,
  consumptionValue: row.consumption_value ? Number(row.consumption_value) : undefined,
  consumptionUnit: row.consumption_unit,
  isPaid: row.is_paid ?? true,
  paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
  isFamilyExpense: row.is_family_expense ?? false,
  linkedTransferId: row.linked_transfer_id,
});

/**
 * Hook to fetch expenses from a linked secondary user
 * This is for DISPLAY ONLY - these expenses do NOT affect the primary user's budget calculations
 */
export function useSecondaryExpenses({ linkedUserId, selectedMonth }: UseSecondaryExpensesOptions) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = async () => {
    if (!linkedUserId) {
      setExpenses([]);
      return;
    }

    setLoading(true);
    try {
      // RLS policy "Primary can view linked secondary expenses" allows this query
      // Fetch ALL expenses from secondary user (not just is_family_expense = true)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', linkedUserId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching secondary expenses:', error);
        setExpenses([]);
      } else {
        setExpenses(data?.map(dbToExpense) || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [linkedUserId]);

  const refetch = () => {
    fetchExpenses();
  };

  // Filter by selected month if provided
  // Tutte le spese del secondario vengono conteggiate nel budget famiglia
  const monthExpenses = useMemo(() => {
    if (!selectedMonth) return expenses;
    return expenses.filter(exp => isSameMonth(new Date(exp.date), selectedMonth));
  }, [expenses, selectedMonth]);

  const totalSpent = useMemo(() => {
    return monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [monthExpenses]);

  return {
    expenses: monthExpenses,
    allExpenses: expenses,
    loading,
    totalSpent,
    refetch,
  };
}
