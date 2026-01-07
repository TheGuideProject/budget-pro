/**
 * HOOK CENTRALIZZATO PER TUTTE LE SPESE
 * 
 * Questo hook è l'UNICA fonte di verità per i calcoli delle spese in tutto il sito.
 * Sostituisce i calcoli sparsi in useExpensesSummary, useBudgetForecast, etc.
 * 
 * GARANTISCE:
 * - Stessi numeri in Dashboard, Budget, Analytics, SpeseFisse, Bollette
 * - Stessa logica dell'AI (ask-ai, analyze-finances)
 * - Trasferimenti al secondario = VARIABILI
 * - Carta credito = addebito mese dopo
 * - Media variabili configurabile (1-12 mesi)
 */

import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, differenceInMonths, addMonths, isSameMonth } from 'date-fns';
import { Expense } from '@/types';
import { useUserProfile } from './useUserProfile';
import { 
  classifyExpense, 
  classifyExpenses,
  isUtilityBill,
  isLoanPayment,
  isSubscription,
  isFamilyTransfer,
  getCreditCardBookedDate,
  isCreditCardBooked,
  groupLoanPayments,
  groupFamilyTransfers,
  type UnifiedExpenseType,
  type ClassifiedExpense,
  type LoanSummary,
  type TransferSummary,
} from '@/utils/expenseClassification';

export interface MonthlyTransfer {
  month: string;        // YYYY-MM
  monthDate: Date;
  recipient: string;
  amount: number;
  transfers: Expense[];
}

export interface CreditCardSummary {
  pending: number;           // Da addebitare (mese prossimo)
  pendingItems: Expense[];
  booked: number;            // Già addebitato questo mese (da mese scorso)
  bookedItems: Expense[];
  byMonth: Map<string, number>; // Totale per mese di addebito
}

export interface UnifiedExpensesResult {
  // === SPESE FISSE (rate + abbonamenti, NO trasferimenti!) ===
  totalMonthlyFixed: number;
  monthlyLoans: number;
  monthlySubs: number;
  
  // === BOLLETTE (separate!) ===
  monthlyBillsEstimate: number;
  billsByType: Record<string, number>;
  isEstimatedBills: boolean;
  
  // === SPESE VARIABILI (include trasferimenti!) ===
  variableAverage: number;
  variableByMonth: { month: string; total: number }[];
  monthsConsidered: number;
  isEstimatedVariable: boolean;
  
  // === TRASFERIMENTI SECONDARIO (recap separato) ===
  transfersByMonth: MonthlyTransfer[];
  totalMonthlyTransfers: number;
  
  // === CARTA CREDITO (gestione speciale) ===
  creditCard: CreditCardSummary;
  
  // === CLASSIFICAZIONE COMPLETA ===
  classified: ClassifiedExpense[];
  byType: Record<UnifiedExpenseType, Expense[]>;
  
  // === DETTAGLI PER BREAKDOWN ===
  loanSummaries: LoanSummary[];
  transferSummaries: TransferSummary[];
  
  // === TOTALI ===
  grandTotalMonthly: number;        // Fixed + Variable + Bills
  grandTotalWithCreditCard: number; // Include carta credito pending
  
  // === META ===
  profileAgeMonths: number;
  configuredLookback: number | null; // Impostazione utente (null = auto)
}

/**
 * Hook centralizzato per calcolare tutte le spese in modo coerente.
 * Usa la logica di classificazione da expenseClassification.ts
 */
export function useUnifiedExpenses(expenses: Expense[]): UnifiedExpensesResult {
  const { profile } = useUserProfile();
  
  return useMemo(() => {
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    
    // === CALCOLO MESI PER MEDIA VARIABILI ===
    // Usa impostazione utente se presente, altrimenti automatico
    const profileCreatedAt = profile?.createdAt || new Date();
    const profileAgeMonths = differenceInMonths(now, profileCreatedAt);
    
    // Leggi il lookback configurato dall'utente (dal profilo DB)
    // @ts-ignore - campo aggiunto con migrazione
    const configuredLookback: number | null = profile?.variableMonthsLookback || null;
    
    const monthsToConsider = configuredLookback 
      ?? Math.min(Math.max(1, profileAgeMonths), 12);
    
    // === CLASSIFICA TUTTE LE SPESE ===
    const classified = classifyExpenses(expenses);
    
    // Raggruppa per tipo
    const byType: Record<UnifiedExpenseType, Expense[]> = {
      variable: [],
      fixed_loan: [],
      fixed_sub: [],
      utility_bill: [],
      credit_card: [],
    };
    
    classified.forEach(exp => {
      byType[exp.unifiedType].push(exp);
    });
    
    // === SPESE FISSE (prestiti + abbonamenti, NO trasferimenti!) ===
    const loanSummaries = groupLoanPayments(expenses);
    const monthlyLoans = loanSummaries.reduce((sum, l) => sum + l.monthlyAmount, 0);
    
    // Abbonamenti: usa l'importo medio delle spese classificate come subscription
    const subExpenses = byType.fixed_sub;
    const monthlySubs = calculateMonthlyFromRecurring(subExpenses, monthsToConsider);
    
    const totalMonthlyFixed = monthlyLoans + monthlySubs;
    
    // === BOLLETTE ===
    const billExpenses = byType.utility_bill;
    const { estimate: monthlyBillsEstimate, byType: billsByType, isEstimated: isEstimatedBills } = 
      calculateBillsEstimate(billExpenses, monthsToConsider);
    
    // === SPESE VARIABILI (include trasferimenti!) ===
    const variableExpenses = byType.variable;
    const { average: variableAverage, byMonth: variableByMonth, isEstimated: isEstimatedVariable } = 
      calculateVariableAverage(variableExpenses, monthsToConsider);
    
    // === TRASFERIMENTI SECONDARIO (recap separato) ===
    const transferSummaries = groupFamilyTransfers(expenses);
    const transfersByMonth = calculateTransfersByMonth(variableExpenses.filter(isFamilyTransfer));
    const totalMonthlyTransfers = transferSummaries.reduce((sum, t) => sum + t.monthlyAmount, 0);
    
    // === CARTA CREDITO ===
    const creditCardExpenses = byType.credit_card;
    const creditCard = calculateCreditCardSummary(creditCardExpenses, now);
    
    // === TOTALI ===
    const grandTotalMonthly = totalMonthlyFixed + variableAverage + monthlyBillsEstimate;
    const grandTotalWithCreditCard = grandTotalMonthly + creditCard.pending;
    
    return {
      // Fissi
      totalMonthlyFixed,
      monthlyLoans,
      monthlySubs,
      
      // Bollette
      monthlyBillsEstimate,
      billsByType,
      isEstimatedBills,
      
      // Variabili
      variableAverage,
      variableByMonth,
      monthsConsidered: monthsToConsider,
      isEstimatedVariable,
      
      // Trasferimenti
      transfersByMonth,
      totalMonthlyTransfers,
      
      // Carta credito
      creditCard,
      
      // Classificazione
      classified,
      byType,
      
      // Dettagli
      loanSummaries,
      transferSummaries,
      
      // Totali
      grandTotalMonthly,
      grandTotalWithCreditCard,
      
      // Meta
      profileAgeMonths,
      configuredLookback,
    };
  }, [expenses, profile?.createdAt, profile]);
}

// === FUNZIONI DI SUPPORTO ===

function calculateMonthlyFromRecurring(expenses: Expense[], months: number): number {
  if (expenses.length === 0) return 0;
  
  const now = new Date();
  const cutoffDate = subMonths(now, months);
  
  // Somma spese negli ultimi X mesi
  const total = expenses
    .filter(exp => new Date(exp.date) >= cutoffDate)
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  return total / months;
}

function calculateBillsEstimate(
  bills: Expense[], 
  months: number
): { estimate: number; byType: Record<string, number>; isEstimated: boolean } {
  if (bills.length === 0) {
    return { estimate: 0, byType: {}, isEstimated: true };
  }
  
  const now = new Date();
  const cutoffDate = subMonths(now, Math.min(months, 6)); // Max 6 mesi per bollette
  
  // Raggruppa per tipo bolletta
  const byType: Record<string, number[]> = {};
  
  bills.forEach(bill => {
    const type = bill.billType || 'altro';
    if (!byType[type]) byType[type] = [];
    
    if (new Date(bill.date) >= cutoffDate) {
      byType[type].push(bill.amount);
    }
  });
  
  // Calcola media per tipo e poi stima mensile
  const monthlyByType: Record<string, number> = {};
  let totalEstimate = 0;
  
  Object.entries(byType).forEach(([type, amounts]) => {
    if (amounts.length === 0) return;
    
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    
    // Stima frequenza (bimestrale = /2 per avere mensile)
    const frequency = amounts.length / Math.min(months, 6);
    const monthlyAmount = frequency < 0.5 ? avg / 2 : avg; // Se poche occorrenze, probabilmente bimestrale
    
    monthlyByType[type] = monthlyAmount;
    totalEstimate += monthlyAmount;
  });
  
  return {
    estimate: totalEstimate,
    byType: monthlyByType,
    isEstimated: bills.length < 3,
  };
}

function calculateVariableAverage(
  expenses: Expense[], 
  months: number
): { average: number; byMonth: { month: string; total: number }[]; isEstimated: boolean } {
  const now = new Date();
  const monthlyTotals: Map<string, number> = new Map();
  
  for (let i = 0; i < months; i++) {
    const targetDate = subMonths(now, i);
    const monthKey = format(targetDate, 'yyyy-MM');
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    
    const monthTotal = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    monthlyTotals.set(monthKey, monthTotal);
  }
  
  const totalVariable = Array.from(monthlyTotals.values()).reduce((a, b) => a + b, 0);
  const monthsWithData = Array.from(monthlyTotals.values()).filter(v => v > 0).length;
  const divisor = Math.max(monthsWithData, 1);
  
  return {
    average: totalVariable / divisor,
    byMonth: Array.from(monthlyTotals.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => b.month.localeCompare(a.month)),
    isEstimated: monthsWithData < 3,
  };
}

function calculateTransfersByMonth(transfers: Expense[]): MonthlyTransfer[] {
  const byMonth = new Map<string, { recipient: string; amount: number; items: Expense[] }>();
  
  transfers.forEach(transfer => {
    const monthKey = format(new Date(transfer.date), 'yyyy-MM');
    const desc = (transfer.description || '').toLowerCase();
    
    // Estrai recipient
    let recipient = 'Famiglia';
    if (desc.includes('mam') || desc.includes('mamy') || desc.includes('mamma')) {
      recipient = 'Mamy';
    } else if (desc.includes('moglie')) {
      recipient = 'Moglie';
    }
    
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { recipient, amount: 0, items: [] });
    }
    
    const entry = byMonth.get(monthKey)!;
    entry.amount += transfer.amount;
    entry.items.push(transfer);
  });
  
  return Array.from(byMonth.entries())
    .map(([month, data]) => ({
      month,
      monthDate: new Date(month + '-01'),
      recipient: data.recipient,
      amount: data.amount,
      transfers: data.items,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

function calculateCreditCardSummary(expenses: Expense[], now: Date): CreditCardSummary {
  const currentMonth = startOfMonth(now);
  const nextMonth = addMonths(currentMonth, 1);
  
  const pending: Expense[] = [];
  const booked: Expense[] = [];
  const byMonth = new Map<string, number>();
  
  expenses.forEach(exp => {
    const bookedDate = exp.bookedDate 
      ? new Date(exp.bookedDate) 
      : getCreditCardBookedDate(exp.date);
    const bookedMonthKey = format(bookedDate, 'yyyy-MM');
    
    // Accumula per mese di addebito
    byMonth.set(bookedMonthKey, (byMonth.get(bookedMonthKey) || 0) + exp.amount);
    
    // Pending = addebito mese prossimo (spesa fatta questo mese)
    if (isSameMonth(bookedDate, nextMonth)) {
      pending.push(exp);
    }
    
    // Booked = addebitato questo mese (spesa fatta mese scorso)
    if (isSameMonth(bookedDate, currentMonth)) {
      booked.push(exp);
    }
  });
  
  return {
    pending: pending.reduce((sum, exp) => sum + exp.amount, 0),
    pendingItems: pending,
    booked: booked.reduce((sum, exp) => sum + exp.amount, 0),
    bookedItems: booked,
    byMonth,
  };
}

// Export types and helper functions
export type { UnifiedExpenseType, ClassifiedExpense, LoanSummary, TransferSummary };
export { 
  classifyExpense, 
  isUtilityBill, 
  isLoanPayment, 
  isSubscription, 
  isFamilyTransfer,
  getCreditCardBookedDate,
  isCreditCardBooked,
};
