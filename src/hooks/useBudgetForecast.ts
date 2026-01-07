import { useMemo } from 'react';
import { startOfMonth, addMonths, subMonths, format, setDate, differenceInDays, isSameMonth, isBefore } from 'date-fns';
import { Invoice, Expense, BudgetMonthSummary, BillType } from '@/types';
import { BudgetTransfer } from '@/types/family';
import { classifyExpense, isUtilityBill, isLoanPayment, isSubscription, isFamilyTransfer, type UnifiedExpenseType } from '@/utils/expenseClassification';

interface UseBudgetForecastOptions {
  invoices: Invoice[];
  expenses: Expense[];
  horizonMonths?: number;
  forecastMonths?: number;
  pastMonths?: number; // NEW: how many past months to include
  alreadySpent?: number;
  familyTransfers?: BudgetTransfer[];
  isSecondary?: boolean;
}

// Dynamic savings rate calculation based on balance before savings
function calculateDynamicSavingsRate(balanceBeforeSavings: number): number {
  if (balanceBeforeSavings < 2000) return 0;
  if (balanceBeforeSavings < 3000) return 0.10;
  if (balanceBeforeSavings < 4000) return 0.15;
  return 0.20;
}

interface OverspendAllocation {
  month: string;
  amount: number;
}

interface ProviderForecast {
  billType: BillType;
  provider: string;
  avgAmount: number;
  billingFrequencyMonths: number;
  lastBillDate: Date;
  nextBillDates: Date[];
}

// Calculate billing frequency in months
function calculateBillingFrequency(bill: Expense): number {
  if (bill.billPeriodStart && bill.billPeriodEnd) {
    const start = new Date(bill.billPeriodStart);
    const end = new Date(bill.billPeriodEnd);
    const days = differenceInDays(end, start);
    
    if (days <= 35) return 1;
    if (days <= 65) return 2;
    if (days <= 95) return 3;
    if (days <= 190) return 6;
    return 12;
  }
  return 2;
}

export function useBudgetForecast({
  invoices,
  expenses,
  horizonMonths = 3,
  forecastMonths = 12,
  pastMonths = 0, // Only show current + future months in Budget
  alreadySpent = 0,
  familyTransfers = [],
  isSecondary = false,
}: UseBudgetForecastOptions) {
  return useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    
    // Generate months array - including PAST months
    const months: Date[] = [];
    
    // Add past months first
    for (let i = pastMonths; i > 0; i--) {
      months.push(subMonths(currentMonthStart, i));
    }
    
    // Add current and future months
    for (let i = 0; i < forecastMonths; i++) {
      months.push(addMonths(currentMonthStart, i));
    }

    // === BILL FORECASTING BY PROVIDER ===
    const paidBillExpenses = expenses.filter(exp => exp.billType && exp.isPaid === true);
    const pendingBills = expenses.filter(exp => exp.billType && exp.isPaid === false);
    
    // Group by provider
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
      
      const sortedBills = [...bills].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Average = total / count
      const totalAmount = sortedBills.reduce((sum, b) => sum + b.amount, 0);
      const avgAmount = totalAmount / sortedBills.length;
      
      const mostRecentBill = sortedBills[0];
      const billingFrequencyMonths = calculateBillingFrequency(mostRecentBill);
      const lastBillDate = new Date(mostRecentBill.date);
      
      // Project future bills
      const nextBillDates: Date[] = [];
      let nextDate = addMonths(startOfMonth(lastBillDate), billingFrequencyMonths);
      const forecastEnd = addMonths(currentMonthStart, forecastMonths);
      
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
      });
    });

    // === CREDIT CARD BOOKING ===
    const getCreditCardBookedDate = (expense: Expense): Date => {
      const purchaseDate = expense.purchaseDate ? new Date(expense.purchaseDate) : new Date(expense.date);
      const nextMonth = addMonths(startOfMonth(purchaseDate), 1);
      return setDate(nextMonth, 10);
    };

    // === CALCULATE MONTHLY DATA ===
    const rawMonthlyData: Map<string, {
      expectedIncome: number;
      receivedIncome: number;
      fixedExpenses: number;
      variableExpenses: number;
      creditCardExpenses: number;
      billExpenses: number;
      billDetails: { provider: string; billType: BillType; amount: number; isForecast: boolean }[];
      isPast: boolean;
    }> = new Map();

    // Initialize all months
    months.forEach(month => {
      const key = format(month, 'yyyy-MM');
      const isPast = isBefore(month, currentMonthStart);
      rawMonthlyData.set(key, {
        expectedIncome: 0,
        receivedIncome: 0,
        fixedExpenses: 0,
        variableExpenses: 0,
        creditCardExpenses: 0,
        billExpenses: 0,
        billDetails: [],
        isPast,
      });
    });

    // Process invoices (only for primary profiles)
    if (!isSecondary) {
      invoices
        .filter(inv => !inv.excludeFromBudget)
        .forEach(inv => {
          const dueDate = new Date(inv.dueDate);
          const dueMonthKey = format(startOfMonth(dueDate), 'yyyy-MM');
          
          if (inv.status === 'pagata') {
            const paidDate = inv.paidDate ? new Date(inv.paidDate) : dueDate;
            const paidMonthKey = format(startOfMonth(paidDate), 'yyyy-MM');
            const data = rawMonthlyData.get(paidMonthKey);
            if (data) {
              data.receivedIncome += inv.totalAmount;
            }
          } else {
            if (inv.paidAmount > 0) {
              const paidDate = inv.paidDate 
                ? new Date(inv.paidDate) 
                : new Date(inv.invoiceDate || inv.createdAt);
              const paidMonthKey = format(startOfMonth(paidDate), 'yyyy-MM');
              const paidMonthData = rawMonthlyData.get(paidMonthKey);
              if (paidMonthData) {
                paidMonthData.receivedIncome += inv.paidAmount;
              }
            }
            
            const data = rawMonthlyData.get(dueMonthKey);
            if (data) {
              data.expectedIncome += inv.remainingAmount;
            }
          }
        });
    }

    // Process family transfers as income for secondary profiles
    if (isSecondary && familyTransfers.length > 0) {
      familyTransfers.forEach(transfer => {
        const data = rawMonthlyData.get(transfer.month);
        if (data) {
          data.receivedIncome += transfer.amount;
        }
      });
    }

    // Process expenses (non-bill) with UNIFIED CLASSIFICATION
    expenses.forEach(exp => {
      const isCreditCard = exp.paymentMethod === 'carta_credito' || exp.category === 'carta_credito';
      const isBill = !!exp.billType || isUtilityBill(exp);
      
      // Skip bills - handled separately
      if (isBill && !isCreditCard) return;
      
      // Filter by paidBy
      if (!isSecondary) {
        if (exp.paidBy === 'Dina' || exp.paidBy === 'Jacopo') return;
      } else {
        if (exp.paidBy !== 'Dina') return;
      }
      
      // Use unified classification from expenseClassification.ts
      const unifiedType = classifyExpense(exp);
      
      // Map unified type to forecast categories
      const isFixedLoan = unifiedType === 'fixed_loan';
      const isFixedSub = unifiedType === 'fixed_sub';
      const isVariable = unifiedType === 'variable'; // Includes family transfers!
      const isCC = unifiedType === 'credit_card';
      
      const isRecurringFixed = exp.recurring === true && (isFixedLoan || isFixedSub);
      
      if (isCC) {
        const bookedDate = getCreditCardBookedDate(exp);
        const monthKey = format(startOfMonth(bookedDate), 'yyyy-MM');
        const data = rawMonthlyData.get(monthKey);
        if (data) {
          data.creditCardExpenses += exp.amount;
        }
      } else if (isRecurringFixed) {
        // For recurring fixed expenses, only add to future months if they're truly recurring
        // For past months, use actual data
        months.forEach(month => {
          const monthKey = format(month, 'yyyy-MM');
          const data = rawMonthlyData.get(monthKey);
          if (data && !data.isPast) {
            data.fixedExpenses += exp.amount;
          }
        });
      } else {
        const expenseDate = exp.bookedDate ? new Date(exp.bookedDate) : new Date(exp.date);
        const monthKey = format(startOfMonth(expenseDate), 'yyyy-MM');
        const data = rawMonthlyData.get(monthKey);
        if (data) {
          // Use unified classification
          if (isFixedLoan || isFixedSub) {
            data.fixedExpenses += exp.amount;
          } else {
            // Variable expenses (including family transfers!)
            data.variableExpenses += exp.amount;
          }
        }
      }
    });

    // Add ACTUAL bill expenses to their respective months
    [...paidBillExpenses, ...pendingBills].forEach(bill => {
      const billDate = new Date(bill.date);
      const monthKey = format(startOfMonth(billDate), 'yyyy-MM');
      const data = rawMonthlyData.get(monthKey);
      if (data) {
        data.billExpenses += bill.amount;
        data.billDetails.push({
          provider: bill.billProvider || 'Sconosciuto',
          billType: bill.billType as BillType,
          amount: bill.amount,
          isForecast: false,
        });
      }
    });

    // Add FORECASTED bill expenses based on provider cycles (only for future months)
    providerForecasts.forEach(forecast => {
      forecast.nextBillDates.forEach(forecastDate => {
        const monthKey = format(startOfMonth(forecastDate), 'yyyy-MM');
        const data = rawMonthlyData.get(monthKey);
        if (data && !data.isPast) {
          // Only add if we don't already have an actual bill for this provider this month
          const hasActual = data.billDetails.some(b => 
            b.provider === forecast.provider && 
            b.billType === forecast.billType && 
            !b.isForecast
          );
          
          if (!hasActual) {
            data.billExpenses += forecast.avgAmount;
            data.billDetails.push({
              provider: forecast.provider,
              billType: forecast.billType,
              amount: forecast.avgAmount,
              isForecast: true,
            });
          }
        }
      });
    });

    // === CALCULATE SUMMARIES ===
    const summaries: BudgetMonthSummary[] = [];
    let previousRealCarryover = 0;
    let previousForecastCarryover = 0;

    const balances: { monthKey: string; balance: number; income: number; forecastIncome: number }[] = [];
    
    months.forEach(month => {
      const monthKey = format(month, 'yyyy-MM');
      const data = rawMonthlyData.get(monthKey)!;
      
      const availableIncome = data.receivedIncome;
      const forecastIncome = data.receivedIncome + data.expectedIncome;
      const totalExpenses = data.fixedExpenses + data.variableExpenses + data.creditCardExpenses + data.billExpenses;
      const balance = availableIncome - totalExpenses;
      
      balances.push({ monthKey, balance, income: availableIncome, forecastIncome });
    });

    const calculateOverspendAllocations = (
      overspend: number,
      startIndex: number,
      horizon: number
    ): OverspendAllocation[] => {
      const allocations: OverspendAllocation[] = [];
      if (overspend <= 0) return allocations;
      
      const futureMonths = balances.slice(startIndex + 1, startIndex + 1 + horizon);
      if (futureMonths.length === 0) {
        return [{ month: balances[startIndex].monthKey, amount: overspend }];
      }
      
      const totalFutureIncome = futureMonths.reduce((sum, m) => sum + m.income, 0);
      
      if (totalFutureIncome === 0) {
        const perMonth = overspend / futureMonths.length;
        futureMonths.forEach(m => {
          allocations.push({ month: m.monthKey, amount: perMonth });
        });
      } else {
        let remaining = overspend;
        futureMonths.forEach((m, idx) => {
          const proportion = m.income / totalFutureIncome;
          let allocation = Math.round(overspend * proportion * 100) / 100;
          if (idx === futureMonths.length - 1) {
            allocation = remaining;
          }
          allocations.push({ month: m.monthKey, amount: allocation });
          remaining -= allocation;
        });
      }
      
      return allocations;
    };

    const overspendByMonth: Map<string, number> = new Map();
    
    months.forEach((month, idx) => {
      const monthKey = format(month, 'yyyy-MM');
      const data = rawMonthlyData.get(monthKey)!;
      
      const availableIncome = data.receivedIncome;
      const totalExpenses = data.fixedExpenses + data.variableExpenses + data.creditCardExpenses + data.billExpenses;
      const rawBalance = availableIncome - totalExpenses;
      
      if (rawBalance < 0 && idx < months.length - 1 && !data.isPast) {
        const allocations = calculateOverspendAllocations(Math.abs(rawBalance), idx, horizonMonths);
        allocations.forEach(alloc => {
          const current = overspendByMonth.get(alloc.month) || 0;
          overspendByMonth.set(alloc.month, current + alloc.amount);
        });
      }
    });

    let accumulatedSavings = 0;
    const today = new Date();
    const currentMonthIndex = months.findIndex(m => isSameMonth(m, today));
    
    months.forEach((month, idx) => {
      const monthKey = format(month, 'yyyy-MM');
      const data = rawMonthlyData.get(monthKey)!;
      const isCurrentMonth = isSameMonth(month, today);
      const isFutureMonth = isBefore(currentMonthStart, month) && !isSameMonth(month, today);
      const isPastMonth = data.isPast;
      
      const availableIncome = data.receivedIncome;
      const forecastIncome = data.receivedIncome + data.expectedIncome;
      const totalIncome = data.expectedIncome + data.receivedIncome;
      const totalExpenses = data.fixedExpenses + data.variableExpenses + data.creditCardExpenses + data.billExpenses;
      const overspendAllocated = overspendByMonth.get(monthKey) || 0;
      
      // === REAL BALANCE (based on received income only) ===
      const realBalanceBeforeSavings = availableIncome + previousRealCarryover - totalExpenses - overspendAllocated;
      const realAppliedSavingsRate = isSecondary ? 0 : calculateDynamicSavingsRate(realBalanceBeforeSavings);
      const realSavingsMonthly = isSecondary ? 0 : Math.round(realBalanceBeforeSavings * realAppliedSavingsRate * 100) / 100;
      const realBalanceAfterSavings = realBalanceBeforeSavings - (realSavingsMonthly > 0 ? realSavingsMonthly : 0);
      
      // === FORECAST BALANCE (based on received + expected income) ===
      const forecastBalanceBeforeSavings = forecastIncome + previousForecastCarryover - totalExpenses - overspendAllocated;
      const forecastAppliedSavingsRate = isSecondary ? 0 : calculateDynamicSavingsRate(forecastBalanceBeforeSavings);
      const forecastSavingsMonthly = isSecondary ? 0 : Math.round(forecastBalanceBeforeSavings * forecastAppliedSavingsRate * 100) / 100;
      const forecastBalanceAfterSavings = forecastBalanceBeforeSavings - (forecastSavingsMonthly > 0 ? forecastSavingsMonthly : 0);
      
      const appliedSavingsRate = isFutureMonth ? forecastAppliedSavingsRate : realAppliedSavingsRate;
      const savingsMonthly = isFutureMonth ? forecastSavingsMonthly : realSavingsMonthly;
      accumulatedSavings += savingsMonthly > 0 ? savingsMonthly : 0;
      
      // Only apply alreadySpent to current month
      const currentAlreadySpent = isCurrentMonth ? alreadySpent : 0;
      
      const realSpendable = realBalanceAfterSavings - currentAlreadySpent;
      const forecastSpendable = forecastBalanceAfterSavings - currentAlreadySpent;
      const pendingIncome = data.expectedIncome;
      
      // For past months: show actual data (realSpendable)
      // For current month: show realSpendable
      // For future months: show forecastSpendable
      const spendable = isFutureMonth ? forecastSpendable : realSpendable;
      const balance = spendable;
      
      const realCarryoverToNext = realBalanceAfterSavings > 0 ? realBalanceAfterSavings : 0;
      const forecastCarryoverToNext = forecastBalanceAfterSavings > 0 ? forecastBalanceAfterSavings : 0;
      
      const hasForecasts = data.billDetails.some(b => b.isForecast);
      
      summaries.push({
        month,
        monthKey,
        expectedIncome: data.expectedIncome,
        receivedIncome: data.receivedIncome,
        totalIncome,
        availableIncome: availableIncome + previousRealCarryover,
        fixedExpenses: data.fixedExpenses,
        variableExpenses: data.variableExpenses,
        creditCardExpenses: data.creditCardExpenses,
        totalExpenses,
        carryover: isFutureMonth ? previousForecastCarryover : previousRealCarryover,
        overspendAllocated,
        savingsMonthly: savingsMonthly > 0 ? savingsMonthly : 0,
        savingsAccumulated: accumulatedSavings,
        appliedSavingsRate,
        alreadySpent: currentAlreadySpent,
        spendable,
        actualSpent: totalExpenses,
        balance,
        billExpenses: data.billExpenses,
        isEstimatedBills: hasForecasts,
        realSpendable,
        forecastSpendable,
        pendingIncome,
        isCurrentMonth,
        isPastMonth,
      });
      
      previousRealCarryover = realCarryoverToNext;
      previousForecastCarryover = forecastCarryoverToNext;
    });

    // Find current month index for slicing
    const currentIdx = summaries.findIndex(s => s.isCurrentMonth);

    return {
      summaries,
      currentMonth: summaries.find(s => s.isCurrentMonth) || summaries[currentIdx] || summaries[pastMonths],
      futureMonths: summaries.filter((_, idx) => idx > currentIdx),
      pastMonths: summaries.filter((_, idx) => idx < currentIdx),
      providerForecasts,
      billForecasts: providerForecasts.map(f => ({
        billType: f.billType,
        provider: f.provider,
        avgMonthly: f.avgAmount / f.billingFrequencyMonths,
      })),
      totalBillEstimate: providerForecasts.reduce((sum, f) => sum + f.avgAmount / f.billingFrequencyMonths, 0),
    };
  }, [invoices, expenses, horizonMonths, forecastMonths, pastMonths, alreadySpent, familyTransfers, isSecondary]);
}
