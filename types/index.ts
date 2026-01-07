export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  clientVat?: string;
  projectName: string;
  invoiceDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  paidDate?: Date; // Date when advance/payment was received
  remainingAmount: number;
  status: 'bozza' | 'inviata' | 'parziale' | 'pagata';
  paymentTerms: string;
  createdAt: Date;
  paymentVerified?: boolean;
  paymentScreenshotUrl?: string;
  verificationMethod?: 'ocr' | 'manual' | null;
  excludeFromBudget?: boolean;
  pdfUrl?: string;
}

export interface InvoiceItem {
  id: string;
  quantity: number;
  description: string;
  unitPrice: number;
  amount: number;
}

// Payment methods
export type PaymentMethod = 'contanti' | 'bancomat' | 'carta_credito' | 'bonifico';

// Expense types
export type ExpenseType = 'privata' | 'aziendale';

// Expense categories - extended
export type ExpenseCategory = 
  | 'fissa' 
  | 'variabile' 
  | 'carta_credito'
  | 'casa'
  | 'salute'
  | 'trasporti'
  | 'cibo'
  | 'svago'
  | 'abbonamenti'
  | 'animali'
  | 'viaggi'
  | 'varie';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'fissa', label: 'Spesa Fissa' },
  { value: 'variabile', label: 'Spesa Variabile' },
  { value: 'carta_credito', label: 'Carta di Credito' },
  { value: 'casa', label: 'Casa' },
  { value: 'salute', label: 'Salute' },
  { value: 'trasporti', label: 'Trasporti' },
  { value: 'cibo', label: 'Cibo' },
  { value: 'svago', label: 'Svago' },
  { value: 'abbonamenti', label: 'Abbonamenti' },
  { value: 'animali', label: 'Animali' },
  { value: 'viaggi', label: 'Viaggi' },
  { value: 'varie', label: 'Varie' },
];

// Bill types for utilities
export type BillType = 'luce' | 'gas' | 'acqua' | 'telefono' | 'internet' | 'rifiuti' | 'condominio' | 'altro';

export const BILL_TYPES: { value: BillType; label: string }[] = [
  { value: 'luce', label: 'Luce' },
  { value: 'gas', label: 'Gas' },
  { value: 'acqua', label: 'Acqua' },
  { value: 'telefono', label: 'Telefono' },
  { value: 'internet', label: 'Internet' },
  { value: 'rifiuti', label: 'Rifiuti' },
  { value: 'condominio', label: 'Condominio' },
  { value: 'altro', label: 'Altro' },
];

// Subscription types for recurring services
export type SubscriptionType = 
  | 'netflix' 
  | 'spotify' 
  | 'amazon_prime'
  | 'disney_plus'
  | 'dazn'
  | 'sky'
  | 'now_tv'
  | 'apple_tv'
  | 'youtube_premium'
  | 'telefono_mobile'
  | 'internet_casa'
  | 'palestra'
  | 'assicurazione'
  | 'altro';

export const SUBSCRIPTION_TYPES: { value: SubscriptionType; label: string; icon: string }[] = [
  { value: 'netflix', label: 'Netflix', icon: 'tv' },
  { value: 'spotify', label: 'Spotify', icon: 'music' },
  { value: 'amazon_prime', label: 'Amazon Prime', icon: 'package' },
  { value: 'disney_plus', label: 'Disney+', icon: 'star' },
  { value: 'dazn', label: 'DAZN', icon: 'trophy' },
  { value: 'sky', label: 'Sky', icon: 'satellite' },
  { value: 'now_tv', label: 'NOW TV', icon: 'play' },
  { value: 'apple_tv', label: 'Apple TV+', icon: 'apple' },
  { value: 'youtube_premium', label: 'YouTube Premium', icon: 'youtube' },
  { value: 'telefono_mobile', label: 'Telefono Mobile', icon: 'smartphone' },
  { value: 'internet_casa', label: 'Internet Casa', icon: 'wifi' },
  { value: 'palestra', label: 'Palestra', icon: 'dumbbell' },
  { value: 'assicurazione', label: 'Assicurazione', icon: 'shield' },
  { value: 'altro', label: 'Altro', icon: 'circle' },
];

// People who can pay bills
export type PaidBy = 'Luca' | 'Dina' | 'Jacopo';

export const PAID_BY_OPTIONS: { value: PaidBy; label: string }[] = [
  { value: 'Luca', label: 'Luca' },
  { value: 'Dina', label: 'Dina' },
  { value: 'Jacopo', label: 'Jacopo' },
];

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  // Hierarchical category system
  categoryParent?: string;
  categoryChild?: string | null;
  date: Date;
  purchaseDate?: Date;
  bookedDate?: Date;
  dueMonth?: string;
  recurring: boolean;
  expenseType?: ExpenseType;
  projectId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  attachmentUrl?: string;
  // Bill-specific fields
  paidBy?: PaidBy;
  billType?: BillType;
  billProvider?: string;
  billPeriodStart?: Date;
  billPeriodEnd?: Date;
  consumptionValue?: number;
  consumptionUnit?: string;
  // Payment tracking
  isPaid?: boolean;
  paidAt?: Date;
  // Family budget fields
  isFamilyExpense?: boolean;
  linkedTransferId?: string;
  // Subscription tracking
  subscriptionType?: SubscriptionType;
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  title?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyBudget {
  month: string;
  expectedIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  creditCardDeductions: number;
  availableBudget: number;
}

// Budget forecast types
export interface BudgetMonthSummary {
  month: Date;
  monthKey: string;
  expectedIncome: number;
  receivedIncome: number;
  totalIncome: number;
  availableIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  creditCardExpenses: number;
  totalExpenses: number;
  carryover: number;
  overspendAllocated: number;
  savingsMonthly: number;
  savingsAccumulated: number;
  appliedSavingsRate: number;
  alreadySpent: number;
  spendable: number;
  actualSpent: number;
  balance: number;
  billExpenses?: number;
  isEstimatedBills?: boolean;
  realSpendable: number;
  forecastSpendable: number;
  pendingIncome: number;
  isCurrentMonth: boolean;
  isPastMonth?: boolean;
}

export interface BudgetAuditLog {
  id: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

export interface CompanyInfo {
  name: string;
  address: string;
  country: string;
  iban: string;
  bic: string;
  bankAddress: string;
}

export const defaultCompanyInfo: CompanyInfo = {
  name: "",
  address: "",
  country: "",
  iban: "",
  bic: "",
  bankAddress: ""
};

// Installment Plan types
export interface InstallmentPlanItem {
  number: number;
  amount: number;
  dueDate: string;
  isPaid?: boolean;
  paidAt?: Date;
  paidBy?: PaidBy;
}

export interface InstallmentPlan {
  id: string;
  provider: string;
  planNumber?: string;
  customerName?: string;
  description: string;
  totalAmount: number;
  installmentsCount: number;
  installments: InstallmentPlanItem[];
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

// ============= Financial Planner Types =============

export type ExpectedExpenseCategory = 'una_tantum' | 'ricorrente';

export interface ExpectedExpense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  expectedDate: Date;
  category: ExpectedExpenseCategory;
  recurrenceMonths?: number;
  isCompleted: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkPlanMonth {
  month: Date;
  monthKey: string;
  // Income based on dueDate (when cash arrives)
  expectedIncome: number; // Cash-in expected this month (from dueDate)
  invoicesWorked: number; // Value of work done this month (from invoiceDate)
  // Expenses breakdown
  fixedExpenses: number;
  variableExpenses: number;
  billExpenses: number;
  pensionContribution: number;
  familyTransfers: number;
  expectedExpenses: number;
  totalExpenses: number;
  // Balance
  balance: number; // This month only
  cumulativeBalance: number; // Running total with carryover
  // Work plan
  workDaysNeeded: number;
  workDaysExtra: number; // Extra days to recover deficit
  // Status
  status: 'ok' | 'surplus' | 'deficit';
  deficitAmount: number;
  surplusAmount: number;
  // Cash flow
  cashFlowIn: number;
  cashFlowOut: number;
  netCashFlow: number;
  // Historical comparison
  historicalWorkDays: number;
  historicalIncome: number;
  historicalYear: number;
  historicalMonthKey: string;
  projectedIncome: number;
  workDaysDifference: number;
  // Carryover tracking
  carryover?: number; // Balance from previous month
  cashInFromDue?: number; // Income specifically from invoices due this month
  plannedWork?: number; // Value of draft invoices (future income)
}

export interface FinancialPlanSummary {
  averageWorkDays: number;
  totalDeficitMonths: number;
  totalSurplusMonths: number;
  criticalMonths: string[];
  annualSurplus: number;
  annualDeficit: number;
  recommendedBuffer: number;
  finalBalance?: number; // TRUE ending cumulative balance after 12 months
}

export interface PensionGoalCalculation {
  targetAmount: number;
  targetYears: number;
  expectedReturnRate: number;
  requiredMonthlyContribution: number;
  currentMonthlyContribution: number;
  gapMonthly: number;
  extraWorkDaysNeeded: number;
  projectedFinalAmount: number;
  totalContributions: number;
  totalReturns: number;
}

// AI Calendar Event for work planning
export interface AICalendarEvent {
  id: string;
  title: string;
  date: string;
  eventType: 'work_day' | 'invoice_send' | 'payment_reminder' | 'payment_due';
  description?: string;
  priority: 'high' | 'medium' | 'low';
  relatedInvoiceId?: string;
  monthKey: string;
}
