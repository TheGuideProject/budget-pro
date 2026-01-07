/**
 * CLASSIFICAZIONE CENTRALIZZATA DELLE SPESE
 * 
 * Questo file è la UNICA fonte di verità per la classificazione delle spese.
 * Usato da:
 * - Frontend (hooks, componenti)
 * - Edge Functions (AI)
 * - Analytics
 * 
 * TIPI DI SPESA:
 * - variable: Spese giornaliere + TRASFERIMENTI AL SECONDARIO
 * - fixed_loan: Rate prestiti/mutui/finanziamenti
 * - fixed_sub: Abbonamenti (Netflix, palestra, etc)
 * - utility_bill: Bollette (riconosciute da fornitori italiani)
 * - credit_card: Spese con carta di credito (gestione speciale)
 */

import { Expense, BillType } from '@/types';
import { detectProvider, isItalianUtilityProvider, STREAMING_PROVIDERS } from './italianProviders';

export type UnifiedExpenseType = 
  | 'variable'      // Spese giornaliere + trasferimenti secondario
  | 'fixed_loan'    // Rate prestiti/mutui
  | 'fixed_sub'     // Abbonamenti
  | 'utility_bill'  // Bollette utenze
  | 'credit_card';  // Carta credito (addebito mese dopo)

export interface ClassifiedExpense extends Expense {
  unifiedType: UnifiedExpenseType;
  detectedProvider?: string;
  billingCycle?: 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
}

/**
 * Classifica una singola spesa secondo la logica centralizzata.
 * REGOLE:
 * 1. Carta credito → credit_card (gestione speciale)
 * 2. Bollette (fornitori italiani) → utility_bill
 * 3. Rate prestiti → fixed_loan
 * 4. Abbonamenti → fixed_sub
 * 5. Trasferimenti al secondario → variable (NON più fixed!)
 * 6. Tutto il resto → variable
 */
export function classifyExpense(expense: Expense): UnifiedExpenseType {
  // 1. CARTA DI CREDITO - gestione speciale (addebito mese dopo)
  if (expense.paymentMethod === 'carta_credito') {
    return 'credit_card';
  }
  
  // 2. BOLLETTE - check fornitori italiani + billType
  if (isUtilityBill(expense)) {
    return 'utility_bill';
  }
  
  // 3. RATE PRESTITI - pattern "Rata X/Y" o keywords
  if (isLoanPayment(expense)) {
    return 'fixed_loan';
  }
  
  // 4. ABBONAMENTI - streaming, palestra, etc
  if (isSubscription(expense)) {
    return 'fixed_sub';
  }
  
  // 5. TRASFERIMENTI AL SECONDARIO → VARIABILE (cambio importante!)
  // Prima erano contati come fissi, ora sono variabili
  if (isFamilyTransfer(expense)) {
    return 'variable';
  }
  
  // 6. TUTTO IL RESTO → VARIABILE
  return 'variable';
}

/**
 * Verifica se una spesa è una bolletta utenza.
 * Usa la lista dei fornitori italiani per riconoscimento automatico.
 */
export function isUtilityBill(expense: Expense): boolean {
  // Ha già un billType esplicito
  if (expense.billType && expense.billType !== 'altro') {
    return true;
  }
  
  // Check fornitore esplicito
  if (expense.billProvider) {
    return isItalianUtilityProvider(expense.billProvider);
  }
  
  // Check nella descrizione
  const text = `${expense.description || ''} ${expense.billProvider || ''}`;
  const detected = detectProvider(text);
  
  // È un fornitore riconosciuto (escluso streaming che va in abbonamenti)
  if (detected.provider && detected.type !== 'streaming') {
    return true;
  }
  
  return false;
}

/**
 * Verifica se una spesa è una rata di prestito/mutuo/finanziamento.
 */
export function isLoanPayment(expense: Expense): boolean {
  const desc = (expense.description || '').toLowerCase();
  
  // Pattern "Rata X/Y - NOME" (formato standard rate)
  if (desc.match(/rata\s+\d+\/\d+/i)) {
    return true;
  }
  
  // Keywords prestiti con importo significativo (>€30)
  if (expense.amount >= 30 && desc.match(/prestito|mutuo|finanziamento|leasing/i)) {
    // Escludi falsi positivi
    if (desc.match(/amazon|assicurazione|owen|mantenimento/i)) {
      return false;
    }
    return true;
  }
  
  // Younited Credit (fornitore comune di prestiti)
  if (desc.match(/younited/i)) {
    return true;
  }
  
  // Category parent override manuale
  if (expense.categoryParent === 'finanza_obblighi') {
    return true;
  }
  
  return false;
}

/**
 * Verifica se una spesa è un abbonamento.
 */
export function isSubscription(expense: Expense): boolean {
  const desc = (expense.description || '').toLowerCase();
  
  // Ha già un subscriptionType
  if (expense.subscriptionType) {
    return true;
  }
  
  // Categoria abbonamenti
  if (expense.category === 'abbonamenti') {
    return true;
  }
  
  // Category parent override manuale
  if (expense.categoryParent === 'abbonamenti') {
    return true;
  }
  
  // Check streaming providers
  for (const provider of STREAMING_PROVIDERS) {
    if (desc.includes(provider.toLowerCase())) {
      return true;
    }
  }
  
  // Keywords abbonamenti
  if (desc.match(/abbonamento|subscription|mensile|palestra|gym|fitness/i)) {
    return true;
  }
  
  return false;
}

/**
 * Verifica se una spesa è un trasferimento al profilo secondario/familiare.
 * IMPORTANTE: Questi ora contano come VARIABILI, non fissi!
 */
export function isFamilyTransfer(expense: Expense): boolean {
  const desc = (expense.description || '').toLowerCase();
  
  // Pattern trasferimento a familiare
  if (desc.match(/trasferimento.*mam|bonifico.*mam|mamy|mamma/i)) {
    return true;
  }
  
  // Trasferimento generico in categoria fissa
  if (expense.category === 'fissa' && desc.match(/trasferimento|bonifico/)) {
    // Ma escludi bollette pagate con bonifico
    if (expense.billType || expense.billProvider) {
      return false;
    }
    return true;
  }
  
  // Ha un linkedTransferId (collegato a budget_transfers)
  if (expense.linkedTransferId) {
    return true;
  }
  
  // Flag isFamilyExpense
  if (expense.isFamilyExpense) {
    return true;
  }
  
  return false;
}

/**
 * Classifica un array di spese e le arricchisce con il tipo unificato.
 */
export function classifyExpenses(expenses: Expense[]): ClassifiedExpense[] {
  return expenses.map(expense => {
    const unifiedType = classifyExpense(expense);
    const text = `${expense.description || ''} ${expense.billProvider || ''}`;
    const detected = detectProvider(text);
    
    return {
      ...expense,
      unifiedType,
      detectedProvider: detected.provider || undefined,
      billingCycle: detectBillingCycle(expense),
    };
  });
}

/**
 * Rileva il ciclo di fatturazione di una bolletta.
 */
function detectBillingCycle(expense: Expense): ClassifiedExpense['billingCycle'] {
  if (!expense.billPeriodStart || !expense.billPeriodEnd) {
    return 'monthly'; // Default
  }
  
  const start = new Date(expense.billPeriodStart);
  const end = new Date(expense.billPeriodEnd);
  const diffDays = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 35) return 'monthly';
  if (diffDays <= 70) return 'bimonthly';
  if (diffDays <= 100) return 'quarterly';
  return 'yearly';
}

/**
 * Calcola la data di addebito per spese con carta di credito.
 * Default: 10 del mese successivo alla spesa.
 */
export function getCreditCardBookedDate(expenseDate: Date | string): Date {
  const date = typeof expenseDate === 'string' ? new Date(expenseDate) : expenseDate;
  const bookedDate = new Date(date.getFullYear(), date.getMonth() + 1, 10);
  return bookedDate;
}

/**
 * Verifica se una spesa carta credito è già stata addebitata.
 */
export function isCreditCardBooked(expense: Expense): boolean {
  if (expense.paymentMethod !== 'carta_credito') return true;
  
  const bookedDate = expense.bookedDate 
    ? new Date(expense.bookedDate) 
    : getCreditCardBookedDate(expense.date);
  
  return new Date() >= bookedDate;
}

// Re-export delle funzioni legacy per compatibilità
export { 
  groupLoanPayments, 
  groupFamilyTransfers, 
  getMonthlyFixedTotal,
  type LoanSummary,
  type TransferSummary 
} from './fixedExpenseClassification';
