import { useMemo } from 'react';
import { Expense } from '@/types';
import { useUserProfile } from './useUserProfile';
import { 
  groupLoanPayments, 
  groupFamilyTransfers, 
  getMonthlyFixedTotal,
  LoanSummary,
  TransferSummary 
} from '@/utils/fixedExpenseClassification';
import { calculateProgressiveVariableAverage, ProgressiveAverageResult } from '@/utils/progressiveExpenseAverage';

export interface ExpensesSummary {
  // Spese fisse mensili (calcolate con logica intelligente)
  monthlyLoans: number;
  monthlyTransfers: number;
  monthlySubscriptions: number;
  monthlyUtilities: number;
  totalMonthlyFixed: number;
  
  // Spese variabili (media progressiva)
  variableMonthlyAverage: number;
  monthsConsidered: number;
  profileAgeMonths: number;
  isEstimated: boolean;
  variableByMonth: { month: string; total: number }[];
  
  // Totali complessivi
  totalMonthlyExpenses: number;      // Fissi + Variabili (senza bollette)
  totalWithUtilities: number;        // Tutto incluso
  
  // Dettagli per breakdown
  loanSummaries: LoanSummary[];
  transferSummaries: TransferSummary[];
}

/**
 * Hook centralizzato per calcolare tutte le spese in modo coerente.
 * 
 * Combina:
 * - Spese fisse (prestiti, trasferimenti, abbonamenti) con logica intelligente di classificazione
 * - Spese variabili con media progressiva basata sull'anzianità del profilo
 * 
 * Questo hook garantisce che i totali siano coerenti in tutte le sezioni dell'app.
 */
export function useExpensesSummary(expenses: Expense[]): ExpensesSummary {
  const { profile } = useUserProfile();
  
  return useMemo(() => {
    // Spese FISSE (logica intelligente da fixedExpenseClassification.ts)
    const loanSummaries = groupLoanPayments(expenses);
    const transferSummaries = groupFamilyTransfers(expenses);
    const monthlyFixedTotals = getMonthlyFixedTotal(expenses);
    
    // Calcola totali mensili per spese fisse
    const monthlyLoans = loanSummaries.reduce((sum, l) => sum + l.monthlyAmount, 0);
    const monthlyTransfers = transferSummaries.reduce((sum, t) => sum + t.monthlyAmount, 0);
    const monthlySubscriptions = monthlyFixedTotals.subscriptions;
    const monthlyUtilities = monthlyFixedTotals.utilities;
    
    // Totale spese fisse (escluse bollette - queste sono considerate a parte)
    const totalMonthlyFixed = monthlyLoans + monthlyTransfers + monthlySubscriptions;
    
    // Spese VARIABILI (media progressiva)
    // Usa l'impostazione utente per i mesi da considerare, se configurata
    const profileCreatedAt = profile?.createdAt || null;
    const configuredLookback = profile?.variableMonthsLookback || null;
    const variableData: ProgressiveAverageResult = calculateProgressiveVariableAverage(
      expenses, 
      profileCreatedAt,
      configuredLookback
    );
    
    // TOTALI COMPLESSIVI
    const totalMonthlyExpenses = totalMonthlyFixed + variableData.variableMonthlyAverage;
    const totalWithUtilities = totalMonthlyExpenses + monthlyUtilities;
    
    return {
      // Fissi
      monthlyLoans,
      monthlyTransfers,
      monthlySubscriptions,
      monthlyUtilities,
      totalMonthlyFixed,
      
      // Variabili
      variableMonthlyAverage: variableData.variableMonthlyAverage,
      monthsConsidered: variableData.monthsConsidered,
      profileAgeMonths: variableData.profileAgeMonths,
      isEstimated: variableData.isEstimated,
      variableByMonth: variableData.variableByMonth,
      
      // Totali
      totalMonthlyExpenses,
      totalWithUtilities,
      
      // Dettagli
      loanSummaries,
      transferSummaries,
    };
  }, [expenses, profile?.createdAt, profile?.variableMonthsLookback]);
}
