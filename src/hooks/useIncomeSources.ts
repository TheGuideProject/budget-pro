import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from './useHousehold';
import { 
  IncomeSource, 
  IncomeSourceType, 
  IncomeFrequency 
} from '@/types/household';

export function useIncomeSources(memberId?: string) {
  const { household, currentMember } = useHousehold();
  const queryClient = useQueryClient();
  
  const targetMemberId = memberId || currentMember?.id;

  // Fetch income sources
  const { data: incomeSources = [], isLoading } = useQuery({
    queryKey: ['income-sources', targetMemberId],
    queryFn: async () => {
      if (!targetMemberId) return [];

      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('member_id', targetMemberId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as IncomeSource[];
    },
    enabled: !!targetMemberId,
  });

  // Add income source
  const addIncomeSource = useMutation({
    mutationFn: async (source: {
      type: IncomeSourceType;
      name: string;
      amount: number;
      frequency: IncomeFrequency;
      startDate?: string;
      endDate?: string | null;
    }) => {
      if (!currentMember?.id) throw new Error('Not in a household');

      const { data, error } = await supabase
        .from('income_sources')
        .insert({
          member_id: currentMember.id,
          type: source.type,
          name: source.name,
          amount: source.amount,
          frequency: source.frequency,
          start_date: source.startDate || new Date().toISOString().split('T')[0],
          end_date: source.endDate || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as IncomeSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    },
  });

  // Update income source
  const updateIncomeSource = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Omit<IncomeSource, 'id' | 'member_id' | 'created_at' | 'updated_at'>>
    }) => {
      const { data, error } = await supabase
        .from('income_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as IncomeSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    },
  });

  // Delete (deactivate) income source
  const deleteIncomeSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('income_sources')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    },
  });

  // Calculate total monthly income
  const calculateMonthlyIncome = (): number => {
    return incomeSources.reduce((total, source) => {
      switch (source.frequency) {
        case 'monthly':
          return total + source.amount;
        case 'biweekly':
          return total + (source.amount * 26) / 12; // 26 biweekly periods per year
        case 'weekly':
          return total + (source.amount * 52) / 12; // 52 weeks per year
        case 'one_time':
          return total; // Don't include one-time in monthly calculation
        default:
          return total;
      }
    }, 0);
  };

  // Get income by type
  const getIncomeByType = (): Record<IncomeSourceType, number> => {
    const result: Record<IncomeSourceType, number> = {
      salary: 0,
      pension: 0,
      freelance: 0,
      support: 0,
      other: 0,
    };

    incomeSources.forEach(source => {
      let monthlyAmount = source.amount;
      if (source.frequency === 'biweekly') monthlyAmount = (source.amount * 26) / 12;
      if (source.frequency === 'weekly') monthlyAmount = (source.amount * 52) / 12;
      if (source.frequency === 'one_time') monthlyAmount = 0;
      
      result[source.type] += monthlyAmount;
    });

    return result;
  };

  return {
    incomeSources,
    isLoading,
    monthlyIncome: calculateMonthlyIncome(),
    incomeByType: getIncomeByType(),
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
  };
}
