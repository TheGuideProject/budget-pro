import { useMemo } from 'react';
import { Expense, BillType } from '@/types';
import { useBudgetStore } from '@/store/budgetStore';
import { differenceInDays, startOfYear, format, subYears, isSameMonth } from 'date-fns';

export interface ConsumptionData {
  billType: BillType;
  provider: string;
  date: Date;
  amount: number;
  consumptionValue: number;
  consumptionUnit: string;
  periodStart?: Date;
  periodEnd?: Date;
  periodDays: number;
  pricePerUnit: number;
  normalizedMonthlyConsumption: number; // Consumption normalized to 30 days
}

export interface ProviderConsumptionSummary {
  billType: BillType;
  provider: string;
  consumptionUnit: string;
  // Current year
  currentYearTotal: number;
  currentYearConsumption: number;
  currentYearBillCount: number;
  // Previous year (same period)
  previousYearTotal: number;
  previousYearConsumption: number;
  previousYearBillCount: number;
  // Comparison
  consumptionVariation: number; // percentage
  costVariation: number; // percentage
  // Averages
  avgPricePerUnit: number;
  avgMonthlyConsumption: number;
  avgBillAmount: number;
  // Forecast
  estimatedNextBill: number;
  estimatedMonthlyConsumption: number;
}

export interface MonthlyConsumption {
  month: string;
  monthDate: Date;
  billType: BillType;
  provider: string;
  consumption: number;
  amount: number;
  pricePerUnit: number;
  isCurrentYear: boolean;
  year: number;
}

export interface ConsumptionAnalysis {
  summaryByProvider: ProviderConsumptionSummary[];
  monthlyData: MonthlyConsumption[];
  totalCurrentYear: number;
  totalPreviousYear: number;
  overallVariation: number;
  consumptionBills: ConsumptionData[];
}

export function useConsumptionAnalysis(): ConsumptionAnalysis {
  const { expenses } = useBudgetStore();

  return useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();

    // Filter bills with consumption data
    const consumptionBills: ConsumptionData[] = expenses
      .filter(exp => 
        (exp.billType === 'gas' || exp.billType === 'acqua' || exp.billType === 'luce') &&
        exp.consumptionValue && 
        exp.consumptionValue > 0 &&
        exp.isPaid === true
      )
      .map(exp => {
        const periodStart = exp.billPeriodStart ? new Date(exp.billPeriodStart) : undefined;
        const periodEnd = exp.billPeriodEnd ? new Date(exp.billPeriodEnd) : undefined;
        const periodDays = periodStart && periodEnd 
          ? differenceInDays(periodEnd, periodStart) 
          : 30;
        
        const pricePerUnit = exp.consumptionValue && exp.consumptionValue > 0 
          ? exp.amount / exp.consumptionValue 
          : 0;
        
        // Normalize consumption to 30-day equivalent
        const normalizedMonthlyConsumption = periodDays > 0 
          ? (exp.consumptionValue! / periodDays) * 30 
          : exp.consumptionValue!;

        return {
          billType: exp.billType as BillType,
          provider: exp.billProvider || 'Sconosciuto',
          date: new Date(exp.date),
          amount: exp.amount,
          consumptionValue: exp.consumptionValue!,
          consumptionUnit: exp.consumptionUnit || '',
          periodStart,
          periodEnd,
          periodDays,
          pricePerUnit,
          normalizedMonthlyConsumption,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by provider and type
    const providerGroups = new Map<string, ConsumptionData[]>();
    consumptionBills.forEach(bill => {
      const key = `${bill.billType}-${bill.provider}`;
      if (!providerGroups.has(key)) {
        providerGroups.set(key, []);
      }
      providerGroups.get(key)!.push(bill);
    });

    // Calculate summaries per provider
    const summaryByProvider: ProviderConsumptionSummary[] = [];
    
    providerGroups.forEach((bills, key) => {
      if (bills.length === 0) return;

      const billType = bills[0].billType;
      const provider = bills[0].provider;
      const consumptionUnit = bills[0].consumptionUnit;

      // Current year bills (up to current month)
      const currentYearBills = bills.filter(b => {
        const year = b.date.getFullYear();
        const month = b.date.getMonth();
        return year === currentYear && month <= currentMonth;
      });

      // Previous year bills (same period)
      const previousYearBills = bills.filter(b => {
        const year = b.date.getFullYear();
        const month = b.date.getMonth();
        return year === previousYear && month <= currentMonth;
      });

      const currentYearTotal = currentYearBills.reduce((sum, b) => sum + b.amount, 0);
      const currentYearConsumption = currentYearBills.reduce((sum, b) => sum + b.consumptionValue, 0);
      
      const previousYearTotal = previousYearBills.reduce((sum, b) => sum + b.amount, 0);
      const previousYearConsumption = previousYearBills.reduce((sum, b) => sum + b.consumptionValue, 0);

      const consumptionVariation = previousYearConsumption > 0 
        ? ((currentYearConsumption - previousYearConsumption) / previousYearConsumption) * 100 
        : 0;

      const costVariation = previousYearTotal > 0 
        ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100 
        : 0;

      // Calculate averages from all bills
      const allBillsForAvg = bills.filter(b => b.date.getFullYear() >= previousYear);
      const avgPricePerUnit = allBillsForAvg.length > 0
        ? allBillsForAvg.reduce((sum, b) => sum + b.pricePerUnit, 0) / allBillsForAvg.length
        : 0;
      
      const avgMonthlyConsumption = allBillsForAvg.length > 0
        ? allBillsForAvg.reduce((sum, b) => sum + b.normalizedMonthlyConsumption, 0) / allBillsForAvg.length
        : 0;

      const avgBillAmount = allBillsForAvg.length > 0
        ? allBillsForAvg.reduce((sum, b) => sum + b.amount, 0) / allBillsForAvg.length
        : 0;

      // Estimate next bill based on averages
      const estimatedNextBill = avgMonthlyConsumption * avgPricePerUnit;

      summaryByProvider.push({
        billType,
        provider,
        consumptionUnit,
        currentYearTotal,
        currentYearConsumption,
        currentYearBillCount: currentYearBills.length,
        previousYearTotal,
        previousYearConsumption,
        previousYearBillCount: previousYearBills.length,
        consumptionVariation,
        costVariation,
        avgPricePerUnit,
        avgMonthlyConsumption,
        avgBillAmount,
        estimatedNextBill,
        estimatedMonthlyConsumption: avgMonthlyConsumption,
      });
    });

    // Generate monthly data for charts
    const monthlyData: MonthlyConsumption[] = consumptionBills.map(bill => ({
      month: format(bill.date, 'MMM yyyy'),
      monthDate: bill.date,
      billType: bill.billType,
      provider: bill.provider,
      consumption: bill.normalizedMonthlyConsumption,
      amount: bill.amount,
      pricePerUnit: bill.pricePerUnit,
      isCurrentYear: bill.date.getFullYear() === currentYear,
      year: bill.date.getFullYear(),
    }));

    // Overall totals
    const totalCurrentYear = summaryByProvider.reduce((sum, s) => sum + s.currentYearTotal, 0);
    const totalPreviousYear = summaryByProvider.reduce((sum, s) => sum + s.previousYearTotal, 0);
    const overallVariation = totalPreviousYear > 0 
      ? ((totalCurrentYear - totalPreviousYear) / totalPreviousYear) * 100 
      : 0;

    return {
      summaryByProvider,
      monthlyData,
      totalCurrentYear,
      totalPreviousYear,
      overallVariation,
      consumptionBills,
    };
  }, [expenses]);
}
