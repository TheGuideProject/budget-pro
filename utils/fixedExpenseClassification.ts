import { Expense } from '@/types';

export type FixedExpenseType = 
  | 'loan'        // Rate prestiti/mutui
  | 'subscription' // Abbonamenti
  | 'transfer'    // Trasferimenti familiari
  | 'utility'     // Bollette
  | 'fixed'       // Altre spese fisse
  | 'other';

export function classifyFixedExpense(expense: Expense): FixedExpenseType {
  const desc = (expense.description || '').toLowerCase();
  
  // Rate prestiti/mutui/finanziamenti
  if (desc.match(/rata|prestito|mutuo|finanziamento|younited|credito|leasing/)) {
    return 'loan';
  }
  
  // Trasferimenti familiari
  if (desc.match(/trasferimento|bonifico.*mam|mamy|mamma|moglie|famiglia/i) || 
      (expense.category === 'fissa' && desc.match(/trasferimento|bonifico/))) {
    return 'transfer';
  }
  
  // Abbonamenti
  if (expense.category === 'abbonamenti' || expense.subscriptionType) {
    return 'subscription';
  }
  
  // Bollette
  if (expense.billType) {
    return 'utility';
  }
  
  // Spese fisse ricorrenti
  if (expense.recurring && expense.category === 'fissa') {
    return 'fixed';
  }
  
  return 'other';
}

export function isLoanPayment(expense: Expense): boolean {
  const desc = (expense.description || '').toLowerCase();
  
  // Pattern "Rata X/Y - NOME" (rate inserite con formato standard)
  if (desc.match(/rata\s+\d+\/\d+\s*[-–]/i)) {
    return true;
  }
  
  // Prestiti/mutui generici ma con importo significativo (>€50)
  if (expense.amount >= 50 && desc.match(/prestito|mutuo|finanziamento|leasing/)) {
    // Escludi addebiti bancari generici che contengono queste parole per caso
    if (desc.match(/amazon|assicurazione|owen|mantenimento/)) {
      return false;
    }
    return true;
  }
  
  return false;
}

export function isFamilyTransfer(expense: Expense): boolean {
  const desc = (expense.description || '').toLowerCase();
  return !!desc.match(/trasferimento.*mam|bonifico.*mam|mamy|mamma/i) ||
         (expense.category === 'fissa' && !!desc.match(/trasferimento|bonifico/));
}

export interface LoanSummary {
  name: string;
  monthlyAmount: number;
  totalPaid: number;        // Rate con data <= oggi
  totalRemaining: number;   // Rate con data > oggi
  totalAmount: number;      // Totale di tutte le rate
  paidCount: number;        // Numero rate già pagate
  remainingCount: number;   // Numero rate da pagare
  totalCount: number;       // Rate totali (dal pattern Rata X/Y)
  completionPercent: number; // % completamento
  firstPayment: Date;
  lastPayment: Date;
  payments: Expense[];
  paidPayments: Expense[];
  futurePayments: Expense[];
}

export function groupLoanPayments(expenses: Expense[]): LoanSummary[] {
  const loans = expenses.filter(isLoanPayment);
  const now = new Date();
  now.setHours(23, 59, 59, 999); // Fine della giornata corrente
  
  // Group by loan name extracted from description
  const groups = new Map<string, Expense[]>();
  
  loans.forEach(loan => {
    const desc = loan.description;
    let key: string;
    
    // Pattern "Rata X/Y - NOME" → estrai NOME
    const rataMatch = desc.match(/rata\s+\d+\/\d+\s*[-–]\s*(.+)/i);
    if (rataMatch) {
      key = rataMatch[1].trim().toUpperCase();
    } else {
      // Fallback: normalizza rimuovendo numeri e pattern "rata"
      key = desc
        .toLowerCase()
        .replace(/rata\s*\d*\s*[-/]?\s*/gi, '')
        .replace(/\d{1,2}[/-]\d{1,2}[/-]?\d{0,4}/g, '')
        .trim()
        .toUpperCase();
    }
    
    // Normalizza nomi comuni
    if (key.includes('YOUNITED') && key.includes('PRESTITO')) {
      key = 'YOUNITED PRESTITO';
    } else if (key.includes('YOUNITED')) {
      key = 'YOUNITED PRESTITO';
    } else if (key.includes('IRETI')) {
      key = 'IRETI';
    } else if (key.includes('MUTUO')) {
      key = key.replace(/MUTUO/i, 'MUTUO').trim();
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(loan);
  });
  
  return Array.from(groups.entries()).map(([name, payments]) => {
    const sorted = payments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Estrai numero rata corrente E totale dal pattern "Rata X/Y"
    let currentInstallment = 0;
    let totalCount = payments.length;
    for (const p of payments) {
      const match = p.description.match(/rata\s+(\d+)\/(\d+)/i);
      if (match) {
        currentInstallment = Math.max(currentInstallment, parseInt(match[1]));
        totalCount = parseInt(match[2]);
      }
    }
    
    // Separa rate pagate da future (solo quelle nel DB)
    const paidPaymentsInDB = sorted.filter(p => new Date(p.date) <= now);
    const futurePayments = sorted.filter(p => new Date(p.date) > now);
    
    // Calcola importo mensile come MODA (valore più frequente)
    const amountCounts = new Map<number, number>();
    payments.forEach(p => {
      const rounded = Math.round(p.amount * 100) / 100;
      amountCounts.set(rounded, (amountCounts.get(rounded) || 0) + 1);
    });
    
    let monthlyAmount = 0;
    let maxCount = 0;
    amountCounts.forEach((count, amount) => {
      if (count > maxCount) {
        maxCount = count;
        monthlyAmount = amount;
      }
    });
    
    // Fallback: se non c'è una moda chiara, usa l'ultimo importo
    if (maxCount === 1 && payments.length > 0) {
      monthlyAmount = sorted[sorted.length - 1].amount;
    }
    
    // CALCOLO RATE PREGRESSE - distingui tra storico completo e parziale
    // Se abbiamo molte rate nel DB (>=3), usiamo le date reali per determinare le pagate
    // Se abbiamo poche rate (1-2), usiamo currentInstallment per inferire le pregresse
    const hasFullPaymentHistory = payments.length >= 3;
    
    let impliedPaidCount: number;
    if (hasFullPaymentHistory) {
      // Storico completo nel DB - usa le date reali
      impliedPaidCount = paidPaymentsInDB.length;
    } else {
      // Poche rate nel DB - inferisci dalle rate pregresse indicate
      // Se currentInstallment = 24 significa che l'utente è alla rata 24
      impliedPaidCount = currentInstallment > 0 
        ? currentInstallment 
        : paidPaymentsInDB.length;
    }
    
    const impliedRemainingCount = totalCount - impliedPaidCount;
    
    // Calcola importi basati sulle rate implicite
    const totalPaid = impliedPaidCount * monthlyAmount;
    const totalRemaining = impliedRemainingCount * monthlyAmount;
    const totalAmount = totalCount * monthlyAmount;
    const completionPercent = totalCount > 0 ? Math.round((impliedPaidCount / totalCount) * 100) : 0;
    
    return {
      name,
      monthlyAmount,
      totalPaid,
      totalRemaining,
      totalAmount,
      paidCount: impliedPaidCount,
      remainingCount: impliedRemainingCount,
      totalCount,
      completionPercent,
      firstPayment: new Date(sorted[0].date),
      lastPayment: new Date(sorted[sorted.length - 1].date),
      payments: sorted,
      paidPayments: paidPaymentsInDB,
      futurePayments,
    };
  }).sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

export interface TransferSummary {
  recipient: string;
  monthlyAmount: number;
  totalTransferred: number;
  transfersCount: number;
  transfers: Expense[];
}

export function groupFamilyTransfers(expenses: Expense[]): TransferSummary[] {
  const transfers = expenses.filter(isFamilyTransfer);
  
  // Group by recipient
  const groups = new Map<string, Expense[]>();
  
  transfers.forEach(transfer => {
    const desc = transfer.description.toLowerCase();
    let recipient = 'Famiglia';
    
    if (desc.includes('mam') || desc.includes('mamy') || desc.includes('mamma')) {
      recipient = 'Mamy';
    } else if (desc.includes('moglie')) {
      recipient = 'Moglie';
    }
    
    if (!groups.has(recipient)) {
      groups.set(recipient, []);
    }
    groups.get(recipient)!.push(transfer);
  });
  
  return Array.from(groups.entries()).map(([recipient, transfers]) => {
    // Get last 3 months average for monthly amount
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentTransfers = transfers.filter(t => new Date(t.date) >= threeMonthsAgo);
    const monthlyAmount = recentTransfers.length > 0 
      ? recentTransfers.reduce((sum, t) => sum + t.amount, 0) / Math.min(3, recentTransfers.length)
      : transfers.length > 0 ? transfers[transfers.length - 1].amount : 0;
    
    return {
      recipient,
      monthlyAmount: Math.round(monthlyAmount),
      totalTransferred: transfers.reduce((sum, t) => sum + t.amount, 0),
      transfersCount: transfers.length,
      transfers: transfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }).sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

export function getMonthlyFixedTotal(expenses: Expense[]): {
  loans: number;
  transfers: number;
  subscriptions: number;
  utilities: number;
  total: number;
} {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get current month expenses
  const currentMonthExpenses = expenses.filter(exp => {
    const date = new Date(exp.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  let loans = 0, transfers = 0, subscriptions = 0, utilities = 0;
  
  currentMonthExpenses.forEach(exp => {
    const type = classifyFixedExpense(exp);
    switch (type) {
      case 'loan': loans += exp.amount; break;
      case 'transfer': transfers += exp.amount; break;
      case 'subscription': subscriptions += exp.amount; break;
      case 'utility': utilities += exp.amount; break;
    }
  });
  
  return {
    loans,
    transfers,
    subscriptions,
    utilities,
    total: loans + transfers + subscriptions + utilities,
  };
}
