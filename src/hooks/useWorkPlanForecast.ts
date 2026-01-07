import { useMemo } from 'react';
import { format, addMonths, startOfMonth, isSameMonth, subMonths, subYears, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { Invoice, Expense, WorkPlanMonth, FinancialPlanSummary, PensionGoalCalculation } from '@/types';
import { useFinancialSettings, calculatePensionFund } from './useFinancialSettings';
import { useExpectedExpenses } from './useExpectedExpenses';
import { useBudgetTransfers } from './useBudgetTransfers';
import { 
  classifyExpense, 
  isLoanPayment, 
  isSubscription, 
  isUtilityBill 
} from '@/utils/expenseClassification';
interface UseWorkPlanForecastProps {
  invoices: Invoice[];
  expenses: Expense[];
  forecastMonths?: number;
  includeDrafts?: boolean;
  useForecastMode?: boolean; // NEW: true = use forecast carryover, false = use real banking balance
}

interface HistoricalMonthData {
  monthNumber: string;
  year: number;
  monthKey: string;
  totalIncome: number;
  workDays: number;
  invoiceCount: number;
}

export function useWorkPlanForecast({ 
  invoices, 
  expenses, 
  forecastMonths = 12,
  includeDrafts = false,
  useForecastMode = true, // Default to forecast mode for AI tab
}: UseWorkPlanForecastProps) {
  const { settings, defaultSettings } = useFinancialSettings();
  const { getTotalForMonth } = useExpectedExpenses();
  const { transfers } = useBudgetTransfers();

  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;
  const pensionMonthly = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  const paymentDelayDays = settings?.payment_delay_days ?? 60;
  const pensionTargetAmount = settings?.pension_target_amount ?? 0;
  const pensionTargetYears = settings?.pension_target_years ?? 20;
  const expectedReturnRate = settings?.sp500_return_rate ?? defaultSettings.sp500_return_rate;
  
  const useManualEstimates = settings?.use_manual_estimates ?? defaultSettings.use_manual_estimates;
  const estimatedFixed = settings?.estimated_fixed_costs ?? defaultSettings.estimated_fixed_costs;
  const estimatedVariable = settings?.estimated_variable_costs ?? defaultSettings.estimated_variable_costs;
  const estimatedBills = settings?.estimated_bills_costs ?? defaultSettings.estimated_bills_costs;
  
  // Custom initial balance settings
  const customInitialBalance = settings?.initial_balance ?? 0;
  const useCustomInitialBalance = settings?.use_custom_initial_balance ?? false;

  // Calculate REAL banking balance (for Budget tab "PUOI SPENDERE ORA")
  const realBankingBalance = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    
    const paidIncome = invoices
      .filter(inv => {
        if (inv.status === 'bozza') return false;
        const paidDate = inv.paidDate ? new Date(inv.paidDate) : null;
        return paidDate && isBefore(paidDate, startOfCurrentMonth);
      })
      .reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    
    const pastExpenses = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return isBefore(expDate, startOfCurrentMonth);
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    return paidIncome - pastExpenses;
  }, [invoices, expenses]);

  // Calculate FORECAST carryover (for AI tab)
  // For PAST months: use ACTUAL income (paidDate) and ACTUAL expenses
  // This gives a realistic starting point for future projections
  // FIX: For PAST months, use ONLY actual expenses from DB (no extra pension/expected)
  // Pension and expected expenses are already included if recorded as actual expenses
  const forecastCarryover = useMemo(() => {
    const now = new Date();
    
    let runningBalance = 0;
    
    // Calculate carryover from 3 months ago until last month using REAL data
    for (let i = -3; i < 0; i++) {
      const month = addMonths(startOfMonth(now), i);
      
      // PAST MONTHS: Income from invoices with paidDate in this month (REAL income received)
      const monthIncome = invoices
        .filter(inv => {
          if (inv.status === 'bozza') return false;
          const paidDate = inv.paidDate ? new Date(inv.paidDate) : null;
          return paidDate && isSameMonth(paidDate, month);
        })
        .reduce((sum, inv) => sum + Number(inv.paidAmount || inv.totalAmount), 0);
      
      // PAST MONTHS: ONLY actual expenses from database
      // NO pension, NO expected expenses - they're already in DB if they were real expenses
      const monthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return isSameMonth(expDate, month);
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      // FIX: For past months, don't add pension or expectedExpenses - only use actual recorded data
      const totalMonthExpenses = monthExpenses;
      
      // Calculate month balance
      const monthBalance = monthIncome - totalMonthExpenses;
      runningBalance = runningBalance + monthBalance;
    }
    
    return runningBalance;
  }, [invoices, expenses]);

  // Choose which starting balance to use based on mode
  // Priority: 1) Custom balance if enabled, 2) Forecast carryover if in forecast mode, 3) Real banking balance
  const startingBalance = useCustomInitialBalance 
    ? customInitialBalance 
    : (useForecastMode ? forecastCarryover : realBankingBalance);

  // Calculate historical work days from past 12 months of invoices
  const historicalData = useMemo((): Map<string, HistoricalMonthData> => {
    const now = new Date();
    const oneYearAgo = subYears(now, 1);
    const monthlyData = new Map<string, HistoricalMonthData>();

    invoices
      .filter(inv => {
        const invDate = new Date(inv.invoiceDate);
        return invDate >= oneYearAgo && invDate <= now && inv.status !== 'bozza';
      })
      .forEach(inv => {
        const invDate = new Date(inv.invoiceDate);
        const monthNumber = format(invDate, 'MM');
        const year = invDate.getFullYear();
        const monthKey = format(invDate, 'yyyy-MM');
        
        const current = monthlyData.get(monthNumber) || {
          monthNumber,
          year,
          monthKey,
          totalIncome: 0,
          workDays: 0,
          invoiceCount: 0,
        };
        
        current.totalIncome += Number(inv.totalAmount) || 0;
        current.workDays = dailyRate > 0 ? current.totalIncome / dailyRate : 0;
        current.invoiceCount += 1;
        if (year > current.year) {
          current.year = year;
          current.monthKey = monthKey;
        }
        
        monthlyData.set(monthNumber, current);
      });

    return monthlyData;
  }, [invoices, dailyRate]);

  // Summary of historical data
  const historicalSummary = useMemo(() => {
    let totalIncome = 0;
    let totalWorkDays = 0;
    let monthCount = 0;
    let topMonth = { monthNumber: '', workDays: 0, year: 0 };
    let referenceYear = 0;

    historicalData.forEach((data) => {
      totalIncome += data.totalIncome;
      totalWorkDays += data.workDays;
      monthCount++;
      referenceYear = Math.max(referenceYear, data.year);
      
      if (data.workDays > topMonth.workDays) {
        topMonth = { monthNumber: data.monthNumber, workDays: data.workDays, year: data.year };
      }
    });

    return {
      totalIncome,
      totalWorkDays: Math.round(totalWorkDays),
      averageWorkDaysPerMonth: monthCount > 0 ? Math.round(totalWorkDays / 12) : 0,
      monthCount,
      topMonth: topMonth.monthNumber,
      topMonthDays: Math.round(topMonth.workDays),
      referenceYear,
    };
  }, [historicalData]);

  // CORE: Work plan calculation
  const workPlan = useMemo((): (WorkPlanMonth & { 
    estimatedExpenses: number; 
    actualExpenses: number;
    carryover: number;
    cashInFromDue: number;
    plannedWork: number;
    draftIncome: number;
  })[] => {
    const now = new Date();
    const startMonth = startOfMonth(now);
    const months: (WorkPlanMonth & { 
      estimatedExpenses: number; 
      actualExpenses: number;
      carryover: number;
      cashInFromDue: number;
      plannedWork: number;
      draftIncome: number;
    })[] = [];
    
    // Start with the chosen starting balance
    let runningBalance = startingBalance;

    for (let i = 0; i < forecastMonths; i++) {
      const month = addMonths(startMonth, i);
      const monthKey = format(month, 'yyyy-MM');
      const monthNumber = format(month, 'MM');
      
      // Store carryover from previous month
      const carryover = runningBalance;
      
      // === INCOME CALCULATION ===
      // Cash-in this month = invoices with dueDate in this month that aren't paid yet
      // This is the CORE FIX: use dueDate, not paidDate
      const cashInFromDue = invoices
        .filter(inv => {
          if (inv.status === 'bozza' || inv.status === 'pagata') return false;
          const dueDate = new Date(inv.dueDate);
          return isSameMonth(dueDate, month);
        })
        .reduce((sum, inv) => sum + (Number(inv.remainingAmount) || Number(inv.totalAmount)), 0);
      
      // Also count invoices already paid this month (for current month only)
      const alreadyPaidThisMonth = i === 0 ? invoices
        .filter(inv => {
          if (inv.status === 'bozza') return false;
          const paidDate = inv.paidDate ? new Date(inv.paidDate) : null;
          return paidDate && isSameMonth(paidDate, month);
        })
        .reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0) : 0;
      
      // Planned work from DRAFTS - use dueDate (when we expect payment), not invoiceDate
      const draftIncome = includeDrafts ? invoices
        .filter(inv => {
          const dueDate = new Date(inv.dueDate);
          return inv.status === 'bozza' && isSameMonth(dueDate, month);
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0) : 0;

      // Include draft income when the toggle is enabled - this makes drafts impact the balance and carryover
      const expectedIncome = cashInFromDue + alreadyPaidThisMonth + draftIncome;

      // Legacy plannedWork (by invoiceDate) - keep for backwards compatibility
      const plannedWork = includeDrafts ? invoices
        .filter(inv => {
          const invDate = new Date(inv.invoiceDate);
          return inv.status === 'bozza' && isSameMonth(invDate, month);
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0) : 0;

      // Invoices created THIS month (for tracking work done)
      const invoicesWorked = invoices
        .filter(inv => {
          const invDate = new Date(inv.invoiceDate);
          return isSameMonth(invDate, month);
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      // === EXPENSES CALCULATION ===
      // For current month: use actual expenses + estimate for remaining days
      // For future months: always use historical averages
      const isFutureMonth = i > 0;
      const isCurrentMonth = i === 0;
      
      // Calculate actual expenses using UNIFIED CLASSIFICATION
      const actualFixedThisMonth = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          if (!isSameMonth(expDate, month)) return false;
          // Fixed = rate prestiti + abbonamenti (unificate)
          return isLoanPayment(exp) || isSubscription(exp);
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      const actualVariableThisMonth = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          if (!isSameMonth(expDate, month)) return false;
          // Variable = classificate come 'variable' (include trasferimenti)
          return classifyExpense(exp) === 'variable';
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      const actualBillsThisMonth = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          if (!isSameMonth(expDate, month)) return false;
          // Bollette = usa isUtilityBill (con lista fornitori italiani)
          return isUtilityBill(exp);
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      // Calculate historical averages using UNIFIED CLASSIFICATION
      const avgFixedExpenses = calculateUnifiedHistoricalAverage(
        expenses, 
        (exp) => isLoanPayment(exp) || isSubscription(exp)
      );
      const avgVariableExpenses = calculateUnifiedHistoricalAverage(
        expenses, 
        (exp) => classifyExpense(exp) === 'variable'
      );
      const avgBillExpenses = calculateUnifiedHistoricalAverage(
        expenses, 
        isUtilityBill
      );
      
      let fixedExpenses: number;
      let variableExpenses: number;
      let billExpenses: number;
      
      if (useManualEstimates) {
        // Manual mode: always use user-defined estimates
        fixedExpenses = estimatedFixed;
        variableExpenses = estimatedVariable;
        billExpenses = estimatedBills;
      } else if (isFutureMonth) {
        // Future months: use historical averages
        fixedExpenses = avgFixedExpenses;
        variableExpenses = avgVariableExpenses;
        billExpenses = avgBillExpenses;
      } else {
        // Current month: use actual if available, otherwise use average
        fixedExpenses = actualFixedThisMonth > 0 ? actualFixedThisMonth : avgFixedExpenses;
        variableExpenses = actualVariableThisMonth > 0 ? actualVariableThisMonth : avgVariableExpenses;
        billExpenses = actualBillsThisMonth > 0 ? actualBillsThisMonth : avgBillExpenses;
      }

      const pensionContribution = pensionMonthly;

      const familyTransfers = (transfers || [])
        .filter(t => t.month === monthKey)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expectedExpensesAmount = getTotalForMonth(monthKey);

      const totalExpenses = fixedExpenses + variableExpenses + billExpenses + 
                           pensionContribution + familyTransfers + expectedExpensesAmount;

      const estimatedTotal = estimatedFixed + estimatedVariable + estimatedBills + 
                            pensionContribution + familyTransfers + expectedExpensesAmount;
      const actualTotal = actualFixedThisMonth + actualVariableThisMonth + actualBillsThisMonth + 
                         pensionContribution + familyTransfers + expectedExpensesAmount;

      // === BALANCE CALCULATION WITH CARRYOVER ===
      const monthBalance = expectedIncome - totalExpenses;
      runningBalance = carryover + monthBalance;

      // Work days calculation
      const workDaysNeeded = dailyRate > 0 ? Math.ceil(totalExpenses / dailyRate) : 0;
      const workDaysFromIncome = dailyRate > 0 ? Math.floor(expectedIncome / dailyRate) : 0;
      
      // Extra days needed considering carryover deficit
      const deficitToRecover = carryover < 0 ? Math.abs(carryover) : 0;
      const extraDaysForDeficit = dailyRate > 0 ? Math.ceil(deficitToRecover / dailyRate) : 0;
      const workDaysExtra = (workDaysNeeded - workDaysFromIncome) + extraDaysForDeficit;

      // Status based on cumulative balance
      let status: 'ok' | 'surplus' | 'deficit' = 'ok';
      let deficitAmount = 0;
      let surplusAmount = 0;

      if (runningBalance < -100) {
        status = 'deficit';
        deficitAmount = Math.abs(runningBalance);
      } else if (runningBalance > 500) {
        status = 'surplus';
        surplusAmount = runningBalance;
      }

      // Historical comparison
      const historical = historicalData.get(monthNumber);
      const historicalWorkDays = historical?.workDays || 0;
      const historicalIncome = historical?.totalIncome || 0;
      const historicalYear = historical?.year || 0;
      const historicalMonthKey = historical?.monthKey || '';
      const projectedIncome = historicalIncome;
      const workDaysDifference = historicalWorkDays - workDaysNeeded;

      months.push({
        month,
        monthKey,
        expectedIncome,
        invoicesWorked,
        fixedExpenses,
        variableExpenses,
        billExpenses,
        pensionContribution,
        familyTransfers,
        expectedExpenses: expectedExpensesAmount,
        totalExpenses,
        balance: monthBalance,
        cumulativeBalance: runningBalance,
        workDaysNeeded,
        workDaysExtra: Math.max(0, workDaysExtra),
        status,
        deficitAmount,
        surplusAmount,
        cashFlowIn: expectedIncome,
        cashFlowOut: totalExpenses,
        netCashFlow: monthBalance,
        historicalWorkDays: Math.round(historicalWorkDays),
        historicalIncome,
        historicalYear,
        historicalMonthKey,
        projectedIncome,
        workDaysDifference: Math.round(workDaysDifference),
        estimatedExpenses: estimatedTotal,
        actualExpenses: actualTotal,
        carryover,
        cashInFromDue,
        plannedWork,
        draftIncome,
      });
    }

    return months;
  }, [invoices, expenses, transfers, forecastMonths, dailyRate, pensionMonthly, paymentDelayDays, getTotalForMonth, useManualEstimates, estimatedFixed, estimatedVariable, estimatedBills, historicalData, startingBalance, includeDrafts]);

  // Summary statistics - FIXED: use real final balance, not sum of cumulative deficits
  const summary = useMemo((): FinancialPlanSummary => {
    const deficitMonths = workPlan.filter(m => m.status === 'deficit');
    const surplusMonths = workPlan.filter(m => m.status === 'surplus');
    
    // CORRECT: final balance = last month's cumulativeBalance
    const finalBalance = workPlan.length > 0 ? workPlan[workPlan.length - 1].cumulativeBalance : 0;
    
    // Calculate monthly deficits/surpluses based on NET CASH FLOW (not cumulative)
    // This is correct: sum of negative month balances = how much you're short across all months
    const totalMonthlyDeficit = workPlan
      .filter(m => m.balance < 0)
      .reduce((sum, m) => sum + Math.abs(m.balance), 0);
    
    const totalMonthlySurplus = workPlan
      .filter(m => m.balance > 0)
      .reduce((sum, m) => sum + m.balance, 0);
    
    // Find maximum drawdown (lowest cumulative balance) for buffer recommendation
    const minCumulativeBalance = Math.min(...workPlan.map(m => m.cumulativeBalance));
    const maxDrawdown = minCumulativeBalance < 0 ? Math.abs(minCumulativeBalance) : 0;
    
    return {
      averageWorkDays: workPlan.reduce((sum, m) => sum + m.workDaysNeeded, 0) / workPlan.length,
      totalDeficitMonths: deficitMonths.length,
      totalSurplusMonths: surplusMonths.length,
      criticalMonths: deficitMonths.map(m => format(m.month, 'MMM yyyy', { locale: it })),
      // FIXED: annualSurplus and annualDeficit now use monthly balance, not cumulative
      annualSurplus: totalMonthlySurplus,
      annualDeficit: totalMonthlyDeficit,
      // NEW: finalBalance is the TRUE ending balance
      finalBalance,
      recommendedBuffer: Math.max(
        maxDrawdown,
        workPlan[0]?.totalExpenses * 2 || 0
      ),
    };
  }, [workPlan]);

  // Pension goal calculation
  const pensionGoal = useMemo((): PensionGoalCalculation | null => {
    if (pensionTargetAmount <= 0 || pensionTargetYears <= 0) return null;

    const monthlyRate = expectedReturnRate / 12;
    const totalMonths = pensionTargetYears * 12;
    
    const requiredMonthly = pensionTargetAmount * (monthlyRate / (Math.pow(1 + monthlyRate, totalMonths) - 1));
    
    const gapMonthly = requiredMonthly - pensionMonthly;
    const extraDays = dailyRate > 0 ? gapMonthly / dailyRate : 0;
    
    const { futureValue, totalContributed, totalReturns } = calculatePensionFund(
      pensionMonthly,
      pensionTargetYears,
      expectedReturnRate
    );

    return {
      targetAmount: pensionTargetAmount,
      targetYears: pensionTargetYears,
      expectedReturnRate,
      requiredMonthlyContribution: requiredMonthly,
      currentMonthlyContribution: pensionMonthly,
      gapMonthly: Math.max(0, gapMonthly),
      extraWorkDaysNeeded: Math.max(0, Math.ceil(extraDays)),
      projectedFinalAmount: futureValue,
      totalContributions: totalContributed,
      totalReturns,
    };
  }, [pensionTargetAmount, pensionTargetYears, expectedReturnRate, pensionMonthly, dailyRate]);

  return {
    workPlan,
    summary,
    pensionGoal,
    historicalSummary,
    historicalData,
    startingBalance,
    realBankingBalance,
    forecastCarryover,
    useForecastMode,
    settings: {
      dailyRate,
      pensionMonthly,
      paymentDelayDays,
      pensionTargetAmount,
      pensionTargetYears,
      expectedReturnRate,
      useManualEstimates,
      estimatedFixed,
      estimatedVariable,
      estimatedBills,
    },
  };
}

// Helper: Calculate historical average using UNIFIED CLASSIFICATION
function calculateUnifiedHistoricalAverage(
  expenses: Expense[], 
  filterFn: (exp: Expense) => boolean
): number {
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  
  // Look at the last 3 months of data
  const relevantExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate >= threeMonthsAgo && 
           expDate < startOfMonth(now) && 
           filterFn(exp);
  });

  if (relevantExpenses.length > 0) {
    // Group by month and calculate average
    const monthlyTotals = new Map<string, number>();
    relevantExpenses.forEach(exp => {
      const monthKey = format(new Date(exp.date), 'yyyy-MM');
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + exp.amount);
    });
    
    const monthCount = monthlyTotals.size || 1;
    const total = Array.from(monthlyTotals.values()).reduce((sum, val) => sum + val, 0);
    return total / monthCount;
  }

  // Fallback: use all historical data with unified filter
  const allFilteredExpenses = expenses.filter(filterFn);
  if (allFilteredExpenses.length === 0) return 0;
  
  const monthlyTotals = new Map<string, number>();
  allFilteredExpenses.forEach(exp => {
    const monthKey = format(new Date(exp.date), 'yyyy-MM');
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + exp.amount);
  });
  
  const monthCount = monthlyTotals.size || 1;
  const total = Array.from(monthlyTotals.values()).reduce((sum, val) => sum + val, 0);
  return total / monthCount;
}

// Helper: Estimate bills for future months - ammortized by frequency
function estimateBillsForMonth(expenses: Expense[], targetMonth: Date): number {
  const billExpenses = expenses.filter(exp => exp.billType);
  
  if (billExpenses.length === 0) return 0;
  
  const billsByType = new Map<string, { amounts: number[], dates: Date[] }>();
  
  billExpenses.forEach(exp => {
    const key = exp.billType || 'other';
    if (!billsByType.has(key)) billsByType.set(key, { amounts: [], dates: [] });
    const entry = billsByType.get(key)!;
    entry.amounts.push(exp.amount);
    entry.dates.push(new Date(exp.date));
  });

  let totalEstimate = 0;
  billsByType.forEach(({ amounts, dates }) => {
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    
    // Calculate average frequency (months between bills)
    if (dates.length > 1) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      let totalMonthsBetween = 0;
      for (let i = 1; i < dates.length; i++) {
        const monthsDiff = (dates[i].getFullYear() - dates[i-1].getFullYear()) * 12 
                          + dates[i].getMonth() - dates[i-1].getMonth();
        totalMonthsBetween += Math.max(monthsDiff, 1);
      }
      const avgFrequency = totalMonthsBetween / (dates.length - 1);
      // Amortize to monthly: if bill comes every 2 months, divide by 2
      totalEstimate += avgAmount / Math.max(avgFrequency, 1);
    } else {
      // Only one bill of this type: assume monthly
      totalEstimate += avgAmount;
    }
  });

  return totalEstimate;
}
