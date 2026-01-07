import { differenceInMonths, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { Expense } from '@/types';
import { classifyFixedExpense } from './fixedExpenseClassification';

export interface ProgressiveAverageResult {
  variableMonthlyAverage: number;
  monthsConsidered: number;
  profileAgeMonths: number;
  variableByMonth: { month: string; total: number }[];
  isEstimated: boolean; // true se meno di 3 mesi di dati
  totalVariableLastPeriod: number;
}

/**
 * Calcola la media progressiva delle spese variabili in base all'anzianità del profilo.
 * 
 * Logica:
 * - Mese 1: usa solo il mese corrente
 * - Mese 2: media degli ultimi 2 mesi
 * - ...
 * - Mese 12+: media degli ultimi 12 mesi (anno completo)
 * 
 * Considera come "variabili" solo le spese NON classificate come:
 * - loan (prestiti/mutui)
 * - transfer (trasferimenti familiari)
 * - subscription (abbonamenti)
 * - utility (bollette)
 */
export function calculateProgressiveVariableAverage(
  expenses: Expense[],
  profileCreatedAt: Date | string | null,
  configuredLookback?: number | null
): ProgressiveAverageResult {
  const now = new Date();
  
  // Calcola l'anzianità del profilo
  let profileAgeMonths = 12; // Default a 12 mesi se non abbiamo la data
  if (profileCreatedAt) {
    const createdDate = typeof profileCreatedAt === 'string' 
      ? new Date(profileCreatedAt) 
      : profileCreatedAt;
    profileAgeMonths = differenceInMonths(now, createdDate);
  }
  
  // Determina quanti mesi considerare:
  // 1. Usa impostazione utente se configurata
  // 2. Altrimenti usa anzianità profilo (minimo 1, massimo 12)
  const monthsToConsider = configuredLookback 
    ?? Math.min(Math.max(1, profileAgeMonths), 12);
  
  // Filtra solo spese VARIABILI (escludi fisse, prestiti, trasferimenti, bollette)
  const variableExpenses = expenses.filter(exp => {
    const type = classifyFixedExpense(exp);
    // Solo spese 'other' (non classificate come fisse)
    return type === 'other';
  });
  
  // Raggruppa per mese e calcola totali
  const monthlyTotals: Map<string, number> = new Map();
  
  for (let i = 0; i < monthsToConsider; i++) {
    const targetDate = subMonths(now, i);
    const monthKey = format(targetDate, 'yyyy-MM');
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    
    const monthTotal = variableExpenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      })
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    
    monthlyTotals.set(monthKey, monthTotal);
  }
  
  // Calcola media
  const totalVariable = Array.from(monthlyTotals.values()).reduce((a, b) => a + b, 0);
  const monthsWithData = Array.from(monthlyTotals.values()).filter(v => v > 0).length;
  
  // Usa il numero di mesi con dati effettivi per la media, con fallback a monthsToConsider
  const divisor = Math.max(monthsWithData, 1);
  const variableMonthlyAverage = totalVariable / divisor;
  
  return {
    variableMonthlyAverage,
    monthsConsidered: monthsToConsider,
    profileAgeMonths,
    variableByMonth: Array.from(monthlyTotals.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => b.month.localeCompare(a.month)),
    isEstimated: monthsWithData < 3,
    totalVariableLastPeriod: totalVariable,
  };
}

/**
 * Versione server-side della funzione per edge functions.
 * Lavora direttamente con i dati del database.
 */
export function calculateProgressiveVariableAverageFromDB(
  expenses: Array<{
    date: string;
    amount: number;
    description: string;
    category: string;
    bill_type?: string | null;
    recurring?: boolean;
  }>,
  profileCreatedAt: string | null
): ProgressiveAverageResult {
  const now = new Date();
  
  // Calcola l'anzianità del profilo
  let profileAgeMonths = 12;
  if (profileCreatedAt) {
    profileAgeMonths = differenceInMonths(now, new Date(profileCreatedAt));
  }
  
  const monthsToConsider = Math.min(Math.max(1, profileAgeMonths), 12);
  
  // Classifica spese lato server (logica semplificata)
  const isFixedExpense = (exp: typeof expenses[0]): boolean => {
    const desc = (exp.description || '').toLowerCase();
    
    // Prestiti/mutui
    if (desc.match(/rata|prestito|mutuo|finanziamento|younited|credito|leasing/)) {
      return true;
    }
    
    // Trasferimenti
    if (desc.match(/trasferimento|bonifico.*mam|mamy|mamma|moglie|famiglia/i)) {
      return true;
    }
    
    // Abbonamenti
    if (exp.category === 'abbonamenti') {
      return true;
    }
    
    // Bollette
    if (exp.bill_type) {
      return true;
    }
    
    // Spese fisse ricorrenti
    if (exp.recurring && exp.category === 'fissa') {
      return true;
    }
    
    return false;
  };
  
  const variableExpenses = expenses.filter(exp => !isFixedExpense(exp));
  
  const monthlyTotals: Map<string, number> = new Map();
  
  for (let i = 0; i < monthsToConsider; i++) {
    const targetDate = subMonths(now, i);
    const monthKey = format(targetDate, 'yyyy-MM');
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    
    const monthTotal = variableExpenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      })
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    
    monthlyTotals.set(monthKey, monthTotal);
  }
  
  const totalVariable = Array.from(monthlyTotals.values()).reduce((a, b) => a + b, 0);
  const monthsWithData = Array.from(monthlyTotals.values()).filter(v => v > 0).length;
  const divisor = Math.max(monthsWithData, 1);
  
  return {
    variableMonthlyAverage: totalVariable / divisor,
    monthsConsidered: monthsToConsider,
    profileAgeMonths,
    variableByMonth: Array.from(monthlyTotals.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => b.month.localeCompare(a.month)),
    isEstimated: monthsWithData < 3,
    totalVariableLastPeriod: totalVariable,
  };
}
