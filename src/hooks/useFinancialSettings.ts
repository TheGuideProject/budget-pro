import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FinancialSettings {
  id: string;
  user_id: string;
  daily_rate: number;
  pension_monthly_amount: number;
  pension_start_date: string | null;
  sp500_return_rate: number;
  pension_target_amount: number;
  pension_target_years: number;
  payment_delay_days: number;
  estimated_fixed_costs: number;
  estimated_variable_costs: number;
  estimated_bills_costs: number;
  use_manual_estimates: boolean;
  initial_balance: number;
  initial_balance_date: string | null;
  use_custom_initial_balance: boolean;
  // Employee salary fields
  monthly_salary: number;
  has_thirteenth: boolean;
  has_fourteenth: boolean;
  thirteenth_month: number;
  fourteenth_month: number;
  production_bonus_amount: number;
  production_bonus_month: number | null;
  sales_bonus_amount: number;
  sales_bonus_months: number[];
  created_at: string;
  updated_at: string;
}

export function useFinancialSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['financial-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_financial_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as FinancialSettings | null;
    },
    enabled: !!user?.id,
  });

  const upsertSettings = useMutation({
    mutationFn: async (newSettings: Partial<FinancialSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_financial_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-settings', user?.id] });
      toast.success('Impostazioni salvate');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast.error('Errore nel salvataggio');
    },
  });

  return {
    settings,
    isLoading,
    error,
    upsertSettings,
    defaultSettings: {
      daily_rate: 500,
      pension_monthly_amount: 0,
      sp500_return_rate: 0.10,
      pension_target_amount: 0,
      pension_target_years: 20,
      payment_delay_days: 60,
      estimated_fixed_costs: 0,
      estimated_variable_costs: 0,
      estimated_bills_costs: 0,
      use_manual_estimates: true,
      initial_balance: 0,
      initial_balance_date: null,
      use_custom_initial_balance: false,
      // Employee defaults
      monthly_salary: 0,
      has_thirteenth: false,
      has_fourteenth: false,
      thirteenth_month: 12,
      fourteenth_month: 7,
      production_bonus_amount: 0,
      production_bonus_month: null,
      sales_bonus_amount: 0,
      sales_bonus_months: [],
    },
  };
}

// Pension fund calculation with compound interest
export function calculatePensionFund(
  monthlyContribution: number,
  years: number,
  annualReturnRate: number = 0.10
): { futureValue: number; totalContributed: number; totalReturns: number } {
  const monthlyRate = annualReturnRate / 12;
  const months = years * 12;
  
  // Future Value of Annuity Due formula (contributions at start of period)
  const futureValue = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  const totalContributed = monthlyContribution * months;
  const totalReturns = futureValue - totalContributed;
  
  return { futureValue, totalContributed, totalReturns };
}

// Calculate work days needed to cover expenses
export function calculateWorkDaysNeeded(
  totalMonthlyExpenses: number,
  dailyRate: number
): number {
  if (dailyRate <= 0) return 0;
  return Math.ceil(totalMonthlyExpenses / dailyRate);
}
