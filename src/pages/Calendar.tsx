import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { UnifiedCalendar } from '@/components/calendar/UnifiedCalendar';
import { useBudgetStore } from '@/store/budgetStore';
import { InvoiceEditDialog } from '@/components/invoice/InvoiceEditDialog';
import { ExpenseEditDialog } from '@/components/expense/ExpenseEditDialog';
import { Invoice, Expense } from '@/types';

export default function Calendar() {
  const { invoices, expenses, projects, updateInvoice, updateExpense, deleteExpense } = useBudgetStore();
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Calendario</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
            Visualizza tutti i tuoi impegni finanziari in un'unica vista.
          </p>
        </div>

        <UnifiedCalendar 
          invoices={invoices}
          expenses={expenses}
          onInvoiceClick={(invoice) => setEditingInvoice(invoice)}
          onExpenseClick={(expense) => setEditingExpense(expense)}
        />

        <InvoiceEditDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onSave={(id, updates) => {
            updateInvoice(id, updates);
            setEditingInvoice(null);
          }}
        />

        <ExpenseEditDialog
          expense={editingExpense}
          projects={projects}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSave={(id, updates) => {
            updateExpense(id, updates);
            setEditingExpense(null);
          }}
          onDelete={(id) => {
            deleteExpense(id);
            setEditingExpense(null);
          }}
        />
      </div>
    </Layout>
  );
}
