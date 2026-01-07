/**
 * HOOK CENTRALIZZATO PER SNAPSHOT MENSILE
 * 
 * 🚨 QUESTO È L'UNICA FONTE DI VERITÀ PER TUTTI I CALCOLI MENSILI 🚨
 * 
 * OGNI pagina che mostra dati finanziari DEVE usare questo hook.
 * Nessun calcolo locale è permesso.
 * 
 * Pagine che DEVONO usare questo hook:
 * - Dashboard (Index.tsx)
 * - Budget Mensile (Budget.tsx)
 * - Spese (Spese.tsx)
 * - Spese Fisse (SpeseFisse.tsx)
 * - Bollette (Bollette.tsx)
 * - Analisi AI (Analytics, AIInsights, etc.)
 * - Piano Lavoro (WorkPlanTimeline, etc.)
 * 
 * GARANTISCE:
 * - Stesso totale in TUTTE le pagine a parità di mese e parametri
 * - Stessa logica per frontend e AI
 * - Tracciabilità completa (debug panel)
 */

import { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  addMonths,
  isSameMonth,
  differenceInMonths,
} from 'date-fns';
import { Expense } from '@/types';
import { useUserProfile } from './useUserProfile';
import { calculateProgressiveVariableAverage } from '@/utils/progressiveExpenseAverage';
import { 
  classifyExpense, 
  classifyExpenses,
  isUtilityBill,
  isLoanPayment,
  isSubscription,
  isFamilyTransfer,
  getCreditCardBookedDate,
  groupLoanPayments,
  groupFamilyTransfers,
  type UnifiedExpenseType,
  type ClassifiedExpense,
  type LoanSummary,
  type TransferSummary,
} from '@/utils/expenseClassification';

// === TYPES ===

export type ViewMode = 'profile' | 'family' | 'secondary';

export interface SnapshotParams {
  monthKey: string;              // 'YYYY-MM'
  viewMode?: ViewMode;           // 'profile' | 'family' | 'secondary'
  profileId?: string;            // Filtra per profilo specifico
  includeTransfers?: boolean;    // Default: true per primary, true per secondary
  includeCreditCard?: boolean;   // Default: true
  includeBillsEstimate?: boolean; // Default: false (usa solo dati reali)
}

export interface MonthlySnapshot {
  // === METADATA ===
  monthKey: string;
  monthDate: Date;
  viewMode: ViewMode;
  profileId?: string;
  
  // === SPESE RAW ===
  expenses: Expense[];
  expenseCount: number;
  firstExpenseIds: string[];     // Per debug/confronto
  
  // === TOTALI ===
  totalExpenses: number;         // TUTTO incluso (escluso CC pending)
  totalWithCCPending: number;    // Incluso CC pending
  
  // === SPESE FISSE (rate + abbonamenti, NO trasferimenti!) ===
  fixedExpenses: {
    loans: number;
    subscriptions: number;
    total: number;
    loanSummaries: LoanSummary[];
  };
  
  // === TRASFERIMENTI ===
  transfers: {
    totalAsExpense: number;      // Per primary: spesa
    totalAsIncome: number;       // Per secondary: entrata
    count: number;
    items: Expense[];
    summaries: TransferSummary[];
  };
  
  // === SPESE VARIABILI ===
  variableExpenses: {
    total: number;
    count: number;
    items: Expense[];
  };
  
  // === BOLLETTE ===
  bills: {
    real: number;                // Bollette effettive del mese
    realCount: number;
    estimated: number;           // Stima mensile (media)
    byType: Record<string, number>;
    items: Expense[];
  };
  
  // === CARTA CREDITO ===
  creditCard: {
    pending: number;             // Spese fatte questo mese, addebito prossimo
    pendingCount: number;
    booked: number;              // Spese mese scorso, addebitate questo mese
    bookedCount: number;
    pendingItems: Expense[];
    bookedItems: Expense[];
  };
  
  // === CLASSIFICAZIONE COMPLETA ===
  classified: ClassifiedExpense[];
  byType: Record<UnifiedExpenseType, Expense[]>;
}

export interface MonthlyAverages {
  fixedMonthly: number;          // Media spese fisse
  variableMonthly: number;       // Media spese variabili
  billsMonthly: number;          // Media bollette
  transfersMonthly: number;      // Media trasferimenti
  totalMonthly: number;          // Media totale
  monthsConsidered: number;      // Mesi usati per media
  isEstimated: boolean;          // < 3 mesi di dati
  variableByMonth: { month: string; total: number }[];
}

export interface MonthlySnapshotResult {
  // Snapshot del mese corrente
  current: MonthlySnapshot;
  
  // Medie (per forecast e analisi)
  averages: MonthlyAverages;
  
  // Funzione per ottenere snapshot di altri mesi
  getSnapshot: (monthKey: string) => MonthlySnapshot;
  
  // Funzione per debug
  getDebugInfo: () => SnapshotDebugInfo;
}

export interface SnapshotDebugInfo {
  monthKey: string;
  viewMode: string;
  profileId?: string;
  expenseCount: number;
  totalExpenses: number;
  fixedTotal: number;
  variableTotal: number;
  billsTotal: number;
  transfersTotal: number;
  creditCardPending: number;
  firstExpenseIds: string[];
  calculationTimestamp: string;
}

// === MAIN HOOK ===

export function useMonthlySnapshot(
  expenses: Expense[],
  params: SnapshotParams
): MonthlySnapshotResult {
  const { profile } = useUserProfile();
  
  const {
    monthKey,
    viewMode = 'profile',
    profileId,
    includeTransfers = true,
    includeCreditCard = true,
    includeBillsEstimate = false,
  } = params;
  
  return useMemo(() => {
    const now = new Date();
    
    // Funzione centrale per creare snapshot di un mese
    const createSnapshot = (targetMonthKey: string): MonthlySnapshot => {
      const monthDate = new Date(targetMonthKey + '-01');
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const nextMonth = addMonths(monthStart, 1);
      
      // === FILTRA SPESE DEL MESE ===
      const monthExpenses = expenses.filter(exp => {
        // Usa bookedDate se presente (per CC), altrimenti date
        const expDate = exp.bookedDate 
          ? new Date(exp.bookedDate) 
          : new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      });
      
      // === CLASSIFICA TUTTE LE SPESE ===
      const classified = classifyExpenses(monthExpenses);
      
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
      
      // === SPESE FISSE ===
      const loanSummaries = groupLoanPayments(monthExpenses);
      const loansTotal = byType.fixed_loan.reduce((sum, exp) => sum + exp.amount, 0);
      const subsTotal = byType.fixed_sub.reduce((sum, exp) => sum + exp.amount, 0);
      
      // === TRASFERIMENTI ===
      const transferSummaries = groupFamilyTransfers(monthExpenses);
      const transferItems = monthExpenses.filter(isFamilyTransfer);
      const transfersTotal = transferItems.reduce((sum, exp) => sum + exp.amount, 0);
      
      // === VARIABILI (escludi trasferimenti dal conteggio variabili se non inclusi) ===
      const variableItems = byType.variable.filter(exp => {
        if (!includeTransfers && isFamilyTransfer(exp)) {
          return false;
        }
        return true;
      });
      const variableTotal = variableItems.reduce((sum, exp) => sum + exp.amount, 0);
      
      // === BOLLETTE ===
      const billItems = byType.utility_bill;
      const billsReal = billItems.reduce((sum, exp) => sum + exp.amount, 0);
      const billsByType: Record<string, number> = {};
      billItems.forEach(exp => {
        const type = exp.billType || 'altro';
        billsByType[type] = (billsByType[type] || 0) + exp.amount;
      });
      
      // === CARTA CREDITO ===
      // Pending: spese CC fatte QUESTO mese (addebito mese prossimo)
      const ccThisMonth = expenses.filter(exp => {
        if (exp.paymentMethod !== 'carta_credito') return false;
        const purchaseDate = new Date(exp.purchaseDate || exp.date);
        return isSameMonth(purchaseDate, monthDate);
      });
      const ccPending = ccThisMonth.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Booked: spese CC del mese SCORSO (addebitate questo mese)
      const prevMonth = subMonths(monthDate, 1);
      const ccPrevMonth = expenses.filter(exp => {
        if (exp.paymentMethod !== 'carta_credito') return false;
        const purchaseDate = new Date(exp.purchaseDate || exp.date);
        return isSameMonth(purchaseDate, prevMonth);
      });
      const ccBooked = ccPrevMonth.reduce((sum, exp) => sum + exp.amount, 0);
      
      // === TOTALI ===
      // totalExpenses = tutto tranne CC pending (che va nel mese prossimo)
      const totalExpenses = loansTotal + subsTotal + variableTotal + billsReal + 
        (includeCreditCard ? ccBooked : 0) +
        (includeTransfers ? transfersTotal : 0);
      
      const totalWithCCPending = totalExpenses + ccPending;
      
      return {
        // Metadata
        monthKey: targetMonthKey,
        monthDate,
        viewMode,
        profileId,
        
        // Raw
        expenses: monthExpenses,
        expenseCount: monthExpenses.length,
        firstExpenseIds: monthExpenses.slice(0, 5).map(e => e.id.slice(0, 8)),
        
        // Totali
        totalExpenses,
        totalWithCCPending,
        
        // Fissi
        fixedExpenses: {
          loans: loansTotal,
          subscriptions: subsTotal,
          total: loansTotal + subsTotal,
          loanSummaries,
        },
        
        // Trasferimenti
        transfers: {
          totalAsExpense: transfersTotal,
          totalAsIncome: transfersTotal, // Per secondary
          count: transferItems.length,
          items: transferItems,
          summaries: transferSummaries,
        },
        
        // Variabili
        variableExpenses: {
          total: variableTotal,
          count: variableItems.length,
          items: variableItems,
        },
        
        // Bollette
        bills: {
          real: billsReal,
          realCount: billItems.length,
          estimated: 0, // Calcolato nelle medie
          byType: billsByType,
          items: billItems,
        },
        
        // Carta Credito
        creditCard: {
          pending: ccPending,
          pendingCount: ccThisMonth.length,
          booked: ccBooked,
          bookedCount: ccPrevMonth.length,
          pendingItems: ccThisMonth,
          bookedItems: ccPrevMonth,
        },
        
        // Classificazione
        classified,
        byType,
      };
    };
    
    // === CALCOLA MEDIE ===
    const calculateAverages = (): MonthlyAverages => {
      const profileCreatedAt = profile?.createdAt || now;
      const profileAgeMonths = differenceInMonths(now, new Date(profileCreatedAt));
      const configuredLookback = profile?.variableMonthsLookback;
      const monthsToConsider = configuredLookback ?? Math.min(Math.max(1, profileAgeMonths), 12);
      
      // Usa calculateProgressiveVariableAverage per coerenza con useExpensesSummary
      const progressiveResult = calculateProgressiveVariableAverage(
        expenses,
        profileCreatedAt,
        configuredLookback
      );
      
      let totalFixed = 0;
      let totalBills = 0;
      let totalTransfers = 0;
      let monthsWithData = 0;
      
      for (let i = 0; i < monthsToConsider; i++) {
        const targetDate = subMonths(now, i);
        const targetKey = format(targetDate, 'yyyy-MM');
        const snapshot = createSnapshot(targetKey);
        
        if (snapshot.expenseCount > 0) {
          monthsWithData++;
        }
        
        totalFixed += snapshot.fixedExpenses.total;
        totalBills += snapshot.bills.real;
        totalTransfers += snapshot.transfers.totalAsExpense;
      }
      
      const divisor = Math.max(monthsWithData, 1);
      
      return {
        fixedMonthly: totalFixed / divisor,
        // Usa il valore da progressiveExpenseAverage per coerenza
        variableMonthly: progressiveResult.variableMonthlyAverage,
        billsMonthly: totalBills / divisor,
        transfersMonthly: totalTransfers / divisor,
        totalMonthly: (totalFixed / divisor) + progressiveResult.variableMonthlyAverage + (totalBills / divisor) + (totalTransfers / divisor),
        monthsConsidered: progressiveResult.monthsConsidered,
        isEstimated: progressiveResult.isEstimated,
        variableByMonth: progressiveResult.variableByMonth,
      };
    };
    
    // Crea snapshot corrente
    const current = createSnapshot(monthKey);
    
    // Calcola medie
    const averages = calculateAverages();
    
    // Aggiorna stima bollette nello snapshot corrente
    current.bills.estimated = averages.billsMonthly;
    
    // Funzione per debug
    const getDebugInfo = (): SnapshotDebugInfo => ({
      monthKey: current.monthKey,
      viewMode: current.viewMode,
      profileId: current.profileId,
      expenseCount: current.expenseCount,
      totalExpenses: current.totalExpenses,
      fixedTotal: current.fixedExpenses.total,
      variableTotal: current.variableExpenses.total,
      billsTotal: current.bills.real,
      transfersTotal: current.transfers.totalAsExpense,
      creditCardPending: current.creditCard.pending,
      firstExpenseIds: current.firstExpenseIds,
      calculationTimestamp: new Date().toISOString(),
    });
    
    return {
      current,
      averages,
      getSnapshot: createSnapshot,
      getDebugInfo,
    };
  }, [expenses, monthKey, viewMode, profileId, includeTransfers, includeCreditCard, profile?.createdAt, profile?.variableMonthsLookback]);
}

// === HELPER PER DEBUG PANEL ===

export function getSnapshotDebugValues(snapshot: MonthlySnapshot): Array<{
  label: string;
  value: number | string;
  isRaw?: boolean;
  indent?: number;
}> {
  return [
    { label: 'Mese', value: snapshot.monthKey, isRaw: true },
    { label: 'N. Transazioni', value: snapshot.expenseCount, isRaw: true },
    { label: 'TOTALE MESE', value: snapshot.totalExpenses },
    { label: '--- Spese Fisse ---', value: '', isRaw: true },
    { label: 'Rate Prestiti', value: snapshot.fixedExpenses.loans, indent: 1 },
    { label: 'Abbonamenti', value: snapshot.fixedExpenses.subscriptions, indent: 1 },
    { label: 'Totale Fissi', value: snapshot.fixedExpenses.total, indent: 1 },
    { label: '--- Variabili ---', value: '', isRaw: true },
    { label: 'Totale Variabili', value: snapshot.variableExpenses.total, indent: 1 },
    { label: 'N. Variabili', value: snapshot.variableExpenses.count, isRaw: true, indent: 1 },
    { label: '--- Trasferimenti ---', value: '', isRaw: true },
    { label: 'Totale Trasferimenti', value: snapshot.transfers.totalAsExpense, indent: 1 },
    { label: 'N. Trasferimenti', value: snapshot.transfers.count, isRaw: true, indent: 1 },
    { label: '--- Bollette ---', value: '', isRaw: true },
    { label: 'Bollette Reali', value: snapshot.bills.real, indent: 1 },
    { label: 'Stima Media', value: snapshot.bills.estimated, indent: 1 },
    { label: '--- Carta Credito ---', value: '', isRaw: true },
    { label: 'CC Pending (prossimo mese)', value: snapshot.creditCard.pending, indent: 1 },
    { label: 'CC Booked (questo mese)', value: snapshot.creditCard.booked, indent: 1 },
    { label: '--- Debug ---', value: '', isRaw: true },
    { label: 'First IDs', value: snapshot.firstExpenseIds.join(', '), isRaw: true },
  ];
}

export function getAveragesDebugValues(averages: MonthlyAverages): Array<{
  label: string;
  value: number | string;
  isRaw?: boolean;
  indent?: number;
}> {
  return [
    { label: 'Mesi Considerati', value: averages.monthsConsidered, isRaw: true },
    { label: 'Dati Stimati', value: averages.isEstimated ? 'Sì' : 'No', isRaw: true },
    { label: 'Media Fissi', value: averages.fixedMonthly },
    { label: 'Media Variabili', value: averages.variableMonthly },
    { label: 'Media Bollette', value: averages.billsMonthly },
    { label: 'Media Trasferimenti', value: averages.transfersMonthly },
    { label: 'MEDIA TOTALE', value: averages.totalMonthly },
  ];
}
