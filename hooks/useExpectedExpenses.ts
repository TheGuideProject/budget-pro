import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ExpectedExpense } from '@/types';

export function useExpectedExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: expectedExpenses = [], isLoading, error } = useQuery({
    queryKey: ['expected-expenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('expected_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expected_date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        description: row.description,
        amount: Number(row.amount),
        expectedDate: new Date(row.expected_date),
        category: row.category as 'una_tantum' | 'ricorrente',
        recurrenceMonths: row.recurrence_months,
        isCompleted: row.is_completed,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      })) as ExpectedExpense[];
    },
    enabled: !!user?.id,
  });

  const addExpectedExpense = useMutation({
    mutationFn: async (expense: Omit<ExpectedExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('expected_expenses')
        .insert({
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          expected_date: expense.expectedDate.toISOString().split('T')[0],
          category: expense.category,
          recurrence_months: expense.recurrenceMonths,
          is_completed: expense.isCompleted,
          notes: expense.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expenses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['work-plan-forecast'] });
      toast.success('Spesa prevista aggiunta');
    },
    onError: (error) => {
      console.error('Error adding expected expense:', error);
      toast.error('Errore nel salvataggio');
    },
  });

  const updateExpectedExpense = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExpectedExpense> & { id: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const updateData: Record<string, unknown> = {};
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.expectedDate !== undefined) updateData.expected_date = updates.expectedDate.toISOString().split('T')[0];
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.recurrenceMonths !== undefined) updateData.recurrence_months = updates.recurrenceMonths;
      if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('expected_expenses')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expenses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['work-plan-forecast'] });
      toast.success('Spesa prevista aggiornata');
    },
    onError: (error) => {
      console.error('Error updating expected expense:', error);
      toast.error('Errore nell\'aggiornamento');
    },
  });

  const deleteExpectedExpense = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('expected_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expenses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['work-plan-forecast'] });
      toast.success('Spesa prevista eliminata');
    },
    onError: (error) => {
      console.error('Error deleting expected expense:', error);
      toast.error('Errore nell\'eliminazione');
    },
  });

  const toggleCompleted = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('expected_expenses')
        .update({ 
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expected-expenses', user?.id] });
    },
  });

  // Get expenses by month for forecasting
  const getExpensesByMonth = (monthKey: string): ExpectedExpense[] => {
    return expectedExpenses.filter(exp => {
      const expMonthKey = `${exp.expectedDate.getFullYear()}-${String(exp.expectedDate.getMonth() + 1).padStart(2, '0')}`;
      if (exp.category === 'una_tantum') {
        return expMonthKey === monthKey && !exp.isCompleted;
      }
      // For recurring, check if monthKey is in range
      if (exp.category === 'ricorrente' && exp.recurrenceMonths) {
        const startDate = exp.expectedDate;
        const [year, month] = monthKey.split('-').map(Number);
        const checkDate = new Date(year, month - 1, 1);
        
        if (checkDate < startDate) return false;
        
        const monthsDiff = (checkDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (checkDate.getMonth() - startDate.getMonth());
        
        return monthsDiff % exp.recurrenceMonths === 0;
      }
      return false;
    });
  };

  // Get total expected for a month
  const getTotalForMonth = (monthKey: string): number => {
    return getExpensesByMonth(monthKey).reduce((sum, exp) => sum + exp.amount, 0);
  };

  return {
    expectedExpenses,
    isLoading,
    error,
    addExpectedExpense,
    updateExpectedExpense,
    deleteExpectedExpense,
    toggleCompleted,
    getExpensesByMonth,
    getTotalForMonth,
  };
}
