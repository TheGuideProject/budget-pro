import { useMemo } from 'react';
import { format, addMonths, startOfMonth, differenceInDays } from 'date-fns';
import { Expense, BillType } from '@/types';

interface ProviderForecast {
  billType: BillType;
  provider: string;
  avgAmount: number; // Average bill amount (NOT monthly equivalent)
  billingFrequencyMonths: number; // How often bills come (1=monthly, 2=bimonthly, etc.)
  lastBillDate: Date; // Due date of the most recent bill
  nextBillDates: Date[]; // Projected future bill dates
  count: number;
}

interface MonthlyBillForecast {
  month: Date;
  monthKey: string;
  totalEstimated: number;
  bills: { 
    billType: BillType; 
    provider: string; 
    amount: number; 
    isForecast: boolean;
    isActual: boolean;
  }[];
}

// Calculate billing frequency in months based on period
function calculateBillingFrequency(bill: Expense): number {
  if (bill.billPeriodStart && bill.billPeriodEnd) {
    const start = new Date(bill.billPeriodStart);
    const end = new Date(bill.billPeriodEnd);
    const days = differenceInDays(end, start);
    
    if (days <= 35) return 1; // Monthly
    if (days <= 65) return 2; // Bimonthly
    if (days <= 95) return 3; // Quarterly
    if (days <= 190) return 6; // Semi-annual
    return 12; // Annual
  }
  return 2; // Default to bimonthly for Italian utilities
}

export function useBillForecast(expenses: Expense[], forecastMonths: number = 12) {
  return useMemo(() => {
    // Filter paid bill expenses (historical data for averaging)
    const paidBillExpenses = expenses.filter(exp => exp.billType && exp.isPaid === true);
    
    // Get unpaid/pending bills
    const pendingBills = expenses.filter(exp => exp.billType && exp.isPaid === false);

    // Group by provider (not just bill type!)
    const groupedByProvider = new Map<string, Expense[]>();
    paidBillExpenses.forEach(exp => {
      const provider = exp.billProvider || 'Sconosciuto';
      const key = `${exp.billType}-${provider}`;
      const existing = groupedByProvider.get(key) || [];
      groupedByProvider.set(key, [...existing, exp]);
    });

    // Calculate forecasts per provider
    const providerForecasts: ProviderForecast[] = [];
    
    groupedByProvider.forEach((bills, key) => {
      const [billType, provider] = key.split('-');
      
      // Sort bills by date (newest first)
      const sortedBills = [...bills].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Calculate average amount (total / count)
      const totalAmount = sortedBills.reduce((sum, b) => sum + b.amount, 0);
      const avgAmount = totalAmount / sortedBills.length;
      
      // Get billing frequency from most recent bill
      const mostRecentBill = sortedBills[0];
      const billingFrequencyMonths = calculateBillingFrequency(mostRecentBill);
      
      // Last bill due date
      const lastBillDate = new Date(mostRecentBill.date);
      
      // Project next bill dates based on frequency
      const nextBillDates: Date[] = [];
      let nextDate = addMonths(startOfMonth(lastBillDate), billingFrequencyMonths);
      
      // Generate future bill dates for the forecast period
      const now = new Date();
      const forecastEnd = addMonths(startOfMonth(now), forecastMonths);
      
      while (nextDate <= forecastEnd) {
        nextBillDates.push(nextDate);
        nextDate = addMonths(nextDate, billingFrequencyMonths);
      }
      
      providerForecasts.push({
        billType: billType as BillType,
        provider,
        avgAmount,
        billingFrequencyMonths,
        lastBillDate,
        nextBillDates,
        count: sortedBills.length,
      });
    });

    // Generate monthly forecasts
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const monthlyForecasts: MonthlyBillForecast[] = [];

    for (let i = 0; i < forecastMonths; i++) {
      const month = addMonths(currentMonthStart, i);
      const monthKey = format(month, 'yyyy-MM');

      const bills: MonthlyBillForecast['bills'] = [];

      // Add actual paid bills for this month
      const actualPaid = paidBillExpenses.filter(b =>
        format(startOfMonth(new Date(b.date)), 'yyyy-MM') === monthKey
      );
      actualPaid.forEach(b => {
        bills.push({
          billType: b.billType as BillType,
          provider: b.billProvider || 'Sconosciuto',
          amount: b.amount,
          isForecast: false,
          isActual: true,
        });
      });

      // Add pending bills for this month
      const monthPending = pendingBills.filter(b =>
        format(startOfMonth(new Date(b.date)), 'yyyy-MM') === monthKey
      );
      monthPending.forEach(b => {
        bills.push({
          billType: b.billType as BillType,
          provider: b.billProvider || 'Sconosciuto',
          amount: b.amount,
          isForecast: false,
          isActual: false,
        });
      });

      // Add forecasted bills based on provider cycles
      providerForecasts.forEach(forecast => {
        // Check if this provider has a forecasted bill this month
        const hasForecastThisMonth = forecast.nextBillDates.some(date => 
          format(startOfMonth(date), 'yyyy-MM') === monthKey
        );
        
        // Only add forecast if we don't already have an actual bill for this provider this month
        const hasActualThisMonth = bills.some(b => 
          b.provider === forecast.provider && 
          b.billType === forecast.billType && 
          !b.isForecast
        );
        
        if (hasForecastThisMonth && !hasActualThisMonth) {
          bills.push({
            billType: forecast.billType,
            provider: forecast.provider,
            amount: forecast.avgAmount,
            isForecast: true,
            isActual: false,
          });
        }
      });

      const totalEstimated = bills.reduce((sum, b) => sum + b.amount, 0);

      monthlyForecasts.push({
        month,
        monthKey,
        totalEstimated,
        bills,
      });
    }

    // Calculate total monthly estimate (for months with forecasted bills)
    // This is NOT a simple average - it accounts for billing frequency
    const monthsWithForecasts = monthlyForecasts.filter(m => m.bills.some(b => b.isForecast));
    const totalMonthlyEstimate = monthsWithForecasts.length > 0
      ? monthlyForecasts.reduce((sum, m) => sum + m.totalEstimated, 0) / forecastMonths
      : 0;

    return {
      providerForecasts,
      totalMonthlyEstimate,
      monthlyForecasts,
      pendingBills,
    };
  }, [expenses, forecastMonths]);
}
