import { create } from 'zustand';
import { Invoice, Expense, Project, ProjectNote, ExpenseCategory, PaymentMethod, ExpenseType, BillType, PaidBy } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface BudgetStore {
  invoices: Invoice[];
  expenses: Expense[];
  projects: Project[];
  projectNotes: ProjectNote[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
  addInvoice: (invoice: Invoice, userId: string) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addExpense: (expense: Expense, userId: string) => Promise<void>;
  addExpensesBulk: (expenses: Expense[], userId: string) => Promise<{ error?: Error }>;
  deleteExpensesBulk: (expenseIds: string[]) => Promise<{ error?: Error; deletedCount: number }>;
  updateExpensesBulk: (expenseIds: string[], updates: { categoryParent: string; categoryChild: string | null }) => Promise<{ error?: Error; updatedCount: number }>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addProject: (project: Project, userId: string) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addProjectNote: (note: ProjectNote, userId: string) => Promise<void>;
  updateProjectNote: (id: string, note: Partial<ProjectNote>) => Promise<void>;
  deleteProjectNote: (id: string) => Promise<void>;
  getProjectNotes: (projectId: string) => ProjectNote[];
}

// Helper to convert DB row to Invoice
const dbToInvoice = (row: any): Invoice => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  clientName: row.client_name,
  clientAddress: row.client_address || '',
  clientVat: row.client_vat,
  projectName: row.project_name,
  invoiceDate: new Date(row.invoice_date),
  dueDate: new Date(row.due_date),
  items: row.items || [],
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  paidDate: row.paid_date ? new Date(row.paid_date) : undefined,
  remainingAmount: Number(row.remaining_amount),
  status: row.status as Invoice['status'],
  paymentTerms: row.payment_terms || '',
  createdAt: new Date(row.created_at),
  paymentVerified: row.payment_verified ?? false,
  paymentScreenshotUrl: row.payment_screenshot_url,
  verificationMethod: row.verification_method as Invoice['verificationMethod'],
  excludeFromBudget: row.exclude_from_budget ?? false,
  pdfUrl: row.pdf_url,
});

// Helper to convert Invoice to DB row (with user_id)
const invoiceToDb = (invoice: Invoice, userId?: string) => {
  const base: any = {
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    client_name: invoice.clientName,
    client_address: invoice.clientAddress,
    client_vat: invoice.clientVat,
    project_name: invoice.projectName,
    invoice_date: new Date(invoice.invoiceDate).toISOString(),
    due_date: new Date(invoice.dueDate).toISOString(),
    items: invoice.items as any,
    total_amount: invoice.totalAmount,
    paid_amount: invoice.paidAmount,
    paid_date: invoice.paidDate ? new Date(invoice.paidDate).toISOString() : null,
    remaining_amount: invoice.remainingAmount,
    status: invoice.status,
    payment_terms: invoice.paymentTerms,
    payment_verified: invoice.paymentVerified ?? false,
    payment_screenshot_url: invoice.paymentScreenshotUrl,
    verification_method: invoice.verificationMethod,
    exclude_from_budget: invoice.excludeFromBudget ?? false,
    pdf_url: invoice.pdfUrl,
  };
  
  if (userId) {
    base.user_id = userId;
  }
  
  return base;
};

// Helper to convert DB row to Expense
const dbToExpense = (row: any): Expense => ({
  id: row.id,
  description: row.description,
  amount: Number(row.amount),
  category: row.category as ExpenseCategory,
  categoryParent: row.category_parent || undefined,
  categoryChild: row.category_child || null,
  date: new Date(row.date),
  purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
  bookedDate: row.booked_date ? new Date(row.booked_date) : undefined,
  dueMonth: row.due_month,
  recurring: row.recurring,
  expenseType: row.expense_type as ExpenseType | undefined,
  projectId: row.project_id,
  paymentMethod: row.payment_method as PaymentMethod | undefined,
  notes: row.notes,
  attachmentUrl: row.attachment_url,
  // Bill-specific fields
  paidBy: row.paid_by as PaidBy | undefined,
  billType: row.bill_type as BillType | undefined,
  billProvider: row.bill_provider,
  billPeriodStart: row.bill_period_start ? new Date(row.bill_period_start) : undefined,
  billPeriodEnd: row.bill_period_end ? new Date(row.bill_period_end) : undefined,
  consumptionValue: row.consumption_value ? Number(row.consumption_value) : undefined,
  consumptionUnit: row.consumption_unit,
  // Payment tracking
  isPaid: row.is_paid ?? true,
  paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
  // Family budget fields
  isFamilyExpense: row.is_family_expense ?? false,
  linkedTransferId: row.linked_transfer_id,
});

// Helper to convert Expense to DB row (with user_id)
const expenseToDb = (expense: Expense, userId?: string) => {
  const base: any = {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    category_parent: expense.categoryParent || null,
    category_child: expense.categoryChild || null,
    date: new Date(expense.date).toISOString(),
    due_month: expense.dueMonth,
    recurring: expense.recurring,
    purchase_date: expense.purchaseDate ? new Date(expense.purchaseDate).toISOString() : null,
    booked_date: expense.bookedDate ? new Date(expense.bookedDate).toISOString() : null,
    expense_type: expense.expenseType || 'privata',
    project_id: expense.projectId || null,
    payment_method: expense.paymentMethod || 'contanti',
    notes: expense.notes || null,
    attachment_url: expense.attachmentUrl || null,
    // Bill-specific fields
    paid_by: expense.paidBy || null,
    bill_type: expense.billType || null,
    bill_provider: expense.billProvider || null,
    bill_period_start: expense.billPeriodStart ? new Date(expense.billPeriodStart).toISOString() : null,
    bill_period_end: expense.billPeriodEnd ? new Date(expense.billPeriodEnd).toISOString() : null,
    consumption_value: expense.consumptionValue || null,
    consumption_unit: expense.consumptionUnit || null,
    // Payment tracking
    is_paid: expense.isPaid ?? true,
    paid_at: expense.paidAt ? new Date(expense.paidAt).toISOString() : null,
    // Family budget fields
    is_family_expense: expense.isFamilyExpense ?? false,
    linked_transfer_id: expense.linkedTransferId || null,
  };
  
  if (userId) {
    base.user_id = userId;
  }
  
  return base;
};

// Helper to convert DB row to Project
const dbToProject = (row: any): Project => ({
  id: row.id,
  name: row.name,
  client: row.client,
  description: row.description,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// Helper to convert Project to DB row
const projectToDb = (project: Project, userId?: string) => {
  const base: any = {
    id: project.id,
    name: project.name,
    client: project.client || null,
    description: project.description || null,
  };
  
  if (userId) {
    base.user_id = userId;
  }
  
  return base;
};

// Helper to convert DB row to ProjectNote
const dbToProjectNote = (row: any): ProjectNote => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  content: row.content,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// Helper to convert ProjectNote to DB row
const projectNoteToDb = (note: ProjectNote, userId?: string) => {
  const base: any = {
    id: note.id,
    project_id: note.projectId,
    title: note.title || null,
    content: note.content,
  };
  
  if (userId) {
    base.user_id = userId;
  }
  
  return base;
};

export const useBudgetStore = create<BudgetStore>()((set, get) => ({
  invoices: [],
  expenses: [],
  projects: [],
  projectNotes: [],
  isLoading: true,

  fetchData: async () => {
    set({ isLoading: true });
    
    // Get current user to filter expenses by user_id
    const { data: { user } } = await supabase.auth.getUser();
    
    const [invoicesResult, expensesResult, projectsResult, notesResult] = await Promise.all([
      supabase.from('invoices').select('*').order('due_date', { ascending: true }),
      // IMPORTANT: Only fetch current user's expenses to avoid double-counting family expenses
      // Increased limit from default 1000 to 15000 to load all expenses
      user 
        ? supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(15000)
        : supabase.from('expenses').select('*').order('date', { ascending: false }).limit(15000),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('project_notes').select('*').order('created_at', { ascending: false }),
    ]);

    set({
      invoices: (invoicesResult.data || []).map(dbToInvoice),
      expenses: (expensesResult.data || []).map(dbToExpense),
      projects: (projectsResult.data || []).map(dbToProject),
      projectNotes: (notesResult.data || []).map(dbToProjectNote),
      isLoading: false,
    });
  },

  addInvoice: async (invoice, userId) => {
    const { error } = await supabase.from('invoices').insert(invoiceToDb(invoice, userId));
    if (!error) {
      set((state) => ({ invoices: [...state.invoices, invoice] }));
    }
  },

  updateInvoice: async (id, updates) => {
    const current = get().invoices.find((inv) => inv.id === id);
    if (!current) return;

    const updated = { ...current, ...updates };
    const { user_id, ...dbData } = invoiceToDb(updated) as any;
    const { error } = await supabase
      .from('invoices')
      .update(dbData)
      .eq('id', id);

    if (!error) {
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === id ? updated : inv
        ),
      }));
    }
  },

  deleteInvoice: async (id) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== id),
      }));
    }
  },

  addExpense: async (expense, userId) => {
    const { error } = await supabase.from('expenses').insert(expenseToDb(expense, userId));
    if (!error) {
      set((state) => ({ expenses: [...state.expenses, expense] }));
    }
  },

  addExpensesBulk: async (expenses, userId) => {
    if (expenses.length === 0) return { error: undefined };
    
    const dbRows = expenses.map(e => expenseToDb(e, userId));
    const { error } = await supabase.from('expenses').insert(dbRows);
    
    if (!error) {
      set((state) => ({ expenses: [...state.expenses, ...expenses] }));
    }
    
    return { error: error ? new Error(error.message) : undefined };
  },

  deleteExpensesBulk: async (expenseIds) => {
    if (expenseIds.length === 0) return { error: undefined, deletedCount: 0 };
    
    // Chunk size: delete 100 at a time to avoid PostgREST query limits
    const CHUNK_SIZE = 100;
    const chunks: string[][] = [];
    
    for (let i = 0; i < expenseIds.length; i += CHUNK_SIZE) {
      chunks.push(expenseIds.slice(i, i + CHUNK_SIZE));
    }
    
    let totalDeleted = 0;
    let lastError: Error | undefined;
    const deletedIds: string[] = [];
    
    for (const chunk of chunks) {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', chunk);
      
      if (error) {
        lastError = new Error(error.message);
        // Continue with other chunks even if one fails
      } else {
        totalDeleted += chunk.length;
        deletedIds.push(...chunk);
      }
    }
    
    // Update local state removing all successfully deleted
    if (deletedIds.length > 0) {
      set((state) => ({
        expenses: state.expenses.filter((exp) => !deletedIds.includes(exp.id)),
      }));
    }
    
    return { 
      error: lastError, 
      deletedCount: totalDeleted 
    };
  },

  updateExpensesBulk: async (expenseIds, updates) => {
    if (expenseIds.length === 0) return { error: undefined, updatedCount: 0 };
    
    const CHUNK_SIZE = 100;
    const chunks: string[][] = [];
    
    for (let i = 0; i < expenseIds.length; i += CHUNK_SIZE) {
      chunks.push(expenseIds.slice(i, i + CHUNK_SIZE));
    }
    
    let totalUpdated = 0;
    let lastError: Error | undefined;
    const updatedIds: string[] = [];
    
    for (const chunk of chunks) {
      const { error } = await supabase
        .from('expenses')
        .update({
          category_parent: updates.categoryParent,
          category_child: updates.categoryChild,
        })
        .in('id', chunk);
      
      if (error) {
        lastError = new Error(error.message);
      } else {
        totalUpdated += chunk.length;
        updatedIds.push(...chunk);
      }
    }
    
    if (updatedIds.length > 0) {
      set((state) => ({
        expenses: state.expenses.map((exp) =>
          updatedIds.includes(exp.id)
            ? { ...exp, categoryParent: updates.categoryParent, categoryChild: updates.categoryChild }
            : exp
        ),
      }));
    }
    
    return { error: lastError, updatedCount: totalUpdated };
  },

  updateExpense: async (id, updates) => {
    const current = get().expenses.find((exp) => exp.id === id);
    if (!current) return;

    const updated = { ...current, ...updates };
    const { user_id, ...dbData } = expenseToDb(updated) as any;
    const { error } = await supabase
      .from('expenses')
      .update(dbData)
      .eq('id', id);

    if (!error) {
      set((state) => ({
        expenses: state.expenses.map((exp) =>
          exp.id === id ? updated : exp
        ),
      }));
    }
  },

  deleteExpense: async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        expenses: state.expenses.filter((exp) => exp.id !== id),
      }));
    }
  },

  addProject: async (project, userId) => {
    const { error } = await supabase.from('projects').insert(projectToDb(project, userId));
    if (!error) {
      set((state) => ({ projects: [...state.projects, project] }));
    }
  },

  updateProject: async (id, updates) => {
    const current = get().projects.find((p) => p.id === id);
    if (!current) return;

    const updated = { ...current, ...updates };
    const { user_id, ...dbData } = projectToDb(updated) as any;
    const { error } = await supabase
      .from('projects')
      .update(dbData)
      .eq('id', id);

    if (!error) {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? updated : p
        ),
      }));
    }
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
      }));
    }
  },

  addProjectNote: async (note, userId) => {
    const { error } = await supabase.from('project_notes').insert(projectNoteToDb(note, userId));
    if (!error) {
      set((state) => ({ projectNotes: [note, ...state.projectNotes] }));
    }
  },

  updateProjectNote: async (id, updates) => {
    const current = get().projectNotes.find((n) => n.id === id);
    if (!current) return;

    const updated = { ...current, ...updates };
    const { user_id, ...dbData } = projectNoteToDb(updated) as any;
    const { error } = await supabase
      .from('project_notes')
      .update(dbData)
      .eq('id', id);

    if (!error) {
      set((state) => ({
        projectNotes: state.projectNotes.map((n) =>
          n.id === id ? updated : n
        ),
      }));
    }
  },

  deleteProjectNote: async (id) => {
    const { error } = await supabase.from('project_notes').delete().eq('id', id);
    if (!error) {
      set((state) => ({
        projectNotes: state.projectNotes.filter((n) => n.id !== id),
      }));
    }
  },

  getProjectNotes: (projectId) => {
    return get().projectNotes.filter((n) => n.projectId === projectId);
  },
}));
