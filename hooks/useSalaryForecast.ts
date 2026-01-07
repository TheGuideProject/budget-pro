import { useMemo } from 'react';
import { useFinancialSettings } from './useFinancialSettings';

export function useSalaryForecast() {
  const { settings, isLoading } = useFinancialSettings();

  const getMonthlyIncome = (month: Date): number => {
    if (!settings) return 0;
    
    let income = settings.monthly_salary || 0;
    const monthNum = month.getMonth() + 1;
    
    // 13esima
    if (settings.has_thirteenth && monthNum === settings.thirteenth_month) {
      income += settings.monthly_salary || 0;
    }
    
    // 14esima
    if (settings.has_fourteenth && monthNum === settings.fourteenth_month) {
      income += settings.monthly_salary || 0;
    }
    
    // Premio produzione
    if (settings.production_bonus_month === monthNum && settings.production_bonus_amount) {
      income += settings.production_bonus_amount;
    }
    
    // Premio vendite
    if (settings.sales_bonus_months?.includes(monthNum) && settings.sales_bonus_amount) {
      income += settings.sales_bonus_amount;
    }
    
    return income;
  };

  const getAnnualIncome = useMemo(() => {
    if (!settings) return 0;
    
    let annual = (settings.monthly_salary || 0) * 12;
    
    // 13esima
    if (settings.has_thirteenth) {
      annual += settings.monthly_salary || 0;
    }
    
    // 14esima
    if (settings.has_fourteenth) {
      annual += settings.monthly_salary || 0;
    }
    
    // Premio produzione
    if (settings.production_bonus_amount) {
      annual += settings.production_bonus_amount;
    }
    
    // Premio vendite (per ogni mese configurato)
    if (settings.sales_bonus_months?.length && settings.sales_bonus_amount) {
      annual += settings.sales_bonus_amount * settings.sales_bonus_months.length;
    }
    
    return annual;
  }, [settings]);

  const getUpcomingBonuses = (fromDate: Date = new Date()): { name: string; amount: number; month: Date }[] => {
    if (!settings) return [];
    
    const bonuses: { name: string; amount: number; month: Date }[] = [];
    const currentMonth = fromDate.getMonth() + 1;
    const currentYear = fromDate.getFullYear();
    
    // Check next 12 months for bonuses
    for (let i = 0; i < 12; i++) {
      const checkMonth = ((currentMonth - 1 + i) % 12) + 1;
      const checkYear = currentYear + Math.floor((currentMonth - 1 + i) / 12);
      const monthDate = new Date(checkYear, checkMonth - 1, 1);
      
      // 13esima
      if (settings.has_thirteenth && checkMonth === settings.thirteenth_month) {
        bonuses.push({
          name: '13ª Mensilità',
          amount: settings.monthly_salary || 0,
          month: monthDate,
        });
      }
      
      // 14esima
      if (settings.has_fourteenth && checkMonth === settings.fourteenth_month) {
        bonuses.push({
          name: '14ª Mensilità',
          amount: settings.monthly_salary || 0,
          month: monthDate,
        });
      }
      
      // Premio produzione
      if (settings.production_bonus_month === checkMonth && settings.production_bonus_amount) {
        bonuses.push({
          name: 'Premio Produzione',
          amount: settings.production_bonus_amount,
          month: monthDate,
        });
      }
      
      // Premio vendite
      if (settings.sales_bonus_months?.includes(checkMonth) && settings.sales_bonus_amount) {
        bonuses.push({
          name: 'Premio Vendite',
          amount: settings.sales_bonus_amount,
          month: monthDate,
        });
      }
    }
    
    return bonuses.sort((a, b) => a.month.getTime() - b.month.getTime());
  };

  const getNextSalaryDate = (): Date => {
    const today = new Date();
    const currentDay = today.getDate();
    
    // Assume salary on 27th of each month
    const salaryDay = 27;
    
    if (currentDay < salaryDay) {
      return new Date(today.getFullYear(), today.getMonth(), salaryDay);
    } else {
      return new Date(today.getFullYear(), today.getMonth() + 1, salaryDay);
    }
  };

  return {
    settings,
    isLoading,
    getMonthlyIncome,
    getAnnualIncome,
    getUpcomingBonuses,
    getNextSalaryDate,
  };
}