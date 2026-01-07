import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Invoice, Expense } from '@/types';
import { format, addMonths, startOfMonth, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { Bug, TrendingUp, TrendingDown, Wallet, Receipt, CreditCard } from 'lucide-react';

interface CarryoverDebugPanelProps {
  invoices: Invoice[];
  expenses: Expense[];
  startingBalance: number;
  realBankingBalance: number;
  forecastCarryover: number;
}

interface MonthDebugData {
  month: Date;
  monthKey: string;
  income: number;
  incomeDetails: { invoice: string; amount: number; paidDate: string }[];
  expenses: number;
  expenseDetails: { description: string; category: string; amount: number }[];
  balance: number;
  runningBalance: number;
}

export function CarryoverDebugPanel({
  invoices,
  expenses,
  startingBalance,
  realBankingBalance,
  forecastCarryover,
}: CarryoverDebugPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const debugData = useMemo((): MonthDebugData[] => {
    const now = new Date();
    const months: MonthDebugData[] = [];
    let runningBalance = 0;

    for (let i = -3; i < 0; i++) {
      const month = addMonths(startOfMonth(now), i);
      const monthKey = format(month, 'yyyy-MM');

      // Income from paid invoices
      const paidInvoices = invoices.filter(inv => {
        if (inv.status === 'bozza') return false;
        const paidDate = inv.paidDate ? new Date(inv.paidDate) : null;
        return paidDate && isSameMonth(paidDate, month);
      });

      const income = paidInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || inv.totalAmount), 0);
      const incomeDetails = paidInvoices.map(inv => ({
        invoice: `${inv.invoiceNumber} - ${inv.clientName}`,
        amount: Number(inv.paidAmount || inv.totalAmount),
        paidDate: inv.paidDate ? format(new Date(inv.paidDate), 'dd/MM', { locale: it }) : '-',
      }));

      // Expenses
      const monthExpensesList = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return isSameMonth(expDate, month);
      });

      const expensesTotal = monthExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
      const expenseDetails = monthExpensesList
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map(exp => ({
          description: exp.description,
          category: exp.category,
          amount: exp.amount,
        }));

      const balance = income - expensesTotal;
      runningBalance += balance;

      months.push({
        month,
        monthKey,
        income,
        incomeDetails,
        expenses: expensesTotal,
        expenseDetails,
        balance,
        runningBalance,
      });
    }

    return months;
  }, [invoices, expenses]);

  const totalIncome = debugData.reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = debugData.reduce((sum, m) => sum + m.expenses, 0);

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bug className="h-5 w-5 text-amber-600" />
          Debug: Calcolo Carryover
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-background border text-center">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Carryover Calcolato</p>
            <p className={`text-lg font-bold ${forecastCarryover >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(forecastCarryover)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background border text-center">
            <Receipt className="h-4 w-4 mx-auto mb-1 text-green-600" />
            <p className="text-xs text-muted-foreground">Tot. Entrate (3 mesi)</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-3 rounded-lg bg-background border text-center">
            <CreditCard className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-xs text-muted-foreground">Tot. Uscite (3 mesi)</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-3 rounded-lg bg-background border text-center">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Saldo Bancario Reale</p>
            <p className={`text-lg font-bold ${realBankingBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(realBankingBalance)}
            </p>
          </div>
        </div>

        {/* Month by month breakdown */}
        <Accordion type="single" collapsible className="w-full">
          {debugData.map((monthData, idx) => (
            <AccordionItem key={monthData.monthKey} value={monthData.monthKey}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-medium">
                    {format(monthData.month, 'MMMM yyyy', { locale: it })}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {formatCurrency(monthData.income)}
                    </span>
                    <span className="text-red-500 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {formatCurrency(monthData.expenses)}
                    </span>
                    <Badge variant={monthData.balance >= 0 ? 'default' : 'destructive'}>
                      {formatCurrency(monthData.balance)}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid md:grid-cols-2 gap-4 p-2">
                  {/* Incomes */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" /> Entrate
                    </h4>
                    {monthData.incomeDetails.length > 0 ? (
                      <div className="space-y-1">
                        {monthData.incomeDetails.map((inc, i) => (
                          <div key={i} className="flex justify-between text-xs p-2 bg-green-500/10 rounded">
                            <span className="truncate max-w-[180px]">{inc.invoice}</span>
                            <span className="font-mono">{formatCurrency(inc.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nessuna fattura incassata</p>
                    )}
                  </div>

                  {/* Expenses */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-500 flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" /> Uscite (top 10)
                    </h4>
                    {monthData.expenseDetails.length > 0 ? (
                      <div className="space-y-1">
                        {monthData.expenseDetails.map((exp, i) => (
                          <div key={i} className="flex justify-between text-xs p-2 bg-red-500/10 rounded">
                            <span className="truncate max-w-[150px]">{exp.description}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{exp.category}</Badge>
                              <span className="font-mono">{formatCurrency(exp.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nessuna spesa registrata</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 p-2 bg-muted rounded text-xs">
                  <strong>Saldo mese:</strong> {formatCurrency(monthData.income)} - {formatCurrency(monthData.expenses)} = 
                  <span className={monthData.balance >= 0 ? ' text-green-600' : ' text-destructive'}> {formatCurrency(monthData.balance)}</span>
                  <br />
                  <strong>Saldo cumulativo:</strong> 
                  <span className={monthData.runningBalance >= 0 ? ' text-green-600' : ' text-destructive'}> {formatCurrency(monthData.runningBalance)}</span>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <strong>Formula:</strong> Carryover = Σ(Entrate mese - Uscite mese) per gli ultimi 3 mesi
          <br />
          <strong>Note:</strong> Per i mesi passati usiamo SOLO dati reali dal DB (no stime). Il saldo calcolato ({formatCurrency(forecastCarryover)}) 
          dovrebbe approssimare il saldo bancario reale ({formatCurrency(realBankingBalance)}).
        </div>
      </CardContent>
    </Card>
  );
}
