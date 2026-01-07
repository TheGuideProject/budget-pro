import { useMemo } from 'react';
import { CostEstimator } from './CostEstimator';
import { AIInsights } from './AIInsights';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useExpensesSummary } from '@/hooks/useExpensesSummary';
import { Invoice, Expense } from '@/types';
import { format, startOfYear, endOfYear, subYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Clock, PiggyBank, Settings2, TrendingUp, TrendingDown, CalendarDays, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DebugPanel } from '@/components/debug/DebugPanel';

interface OverviewTabProps {
  expenses: Expense[];
  invoices: Invoice[];
}

export function OverviewTab({ expenses, invoices }: OverviewTabProps) {
  const { settings, defaultSettings } = useFinancialSettings();
  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;
  const pensionAmount = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  const paymentDelay = settings?.payment_delay_days ?? defaultSettings.payment_delay_days;

  // Usa il nuovo hook centralizzato per spese coerenti
  const expensesSummary = useExpensesSummary(expenses);

  const { 
    averageIncome, 
    monthsOfData,
    lastYearIncome,
    thisYearIncome,
    projectedAnnualIncome,
    incomeGrowth,
  } = useMemo(() => {
    const now = new Date();
    const lastYearStart = startOfYear(subYears(now, 1));
    const lastYearEnd = endOfYear(subYears(now, 1));
    const thisYearStart = startOfYear(now);
    
    let incomeTotal = 0;

    // Track unique months of expense data
    const expenseMonths = new Set<string>();

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      expenseMonths.add(format(expenseDate, 'yyyy-MM'));
    });

    // Income in last 12 months
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    invoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate >= twelveMonthsAgo && invoiceDate <= now) {
        incomeTotal += Number(invoice.totalAmount) || 0;
      }
    });

    // Last year income
    const lastYearInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= lastYearStart && invDate <= lastYearEnd;
    });
    const lastYearTotal = lastYearInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    // This year income (YTD)
    const thisYearInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= thisYearStart && invDate <= now;
    });
    const thisYearTotal = thisYearInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    
    // Projected annual income
    const monthsElapsed = now.getMonth() + 1;
    const projected = monthsElapsed > 0 ? (thisYearTotal / monthsElapsed) * 12 : 0;

    // Income growth percentage
    const growth = lastYearTotal > 0 ? ((projected - lastYearTotal) / lastYearTotal) * 100 : 0;

    const monthsWithData = expenseMonths.size;
    const divisor = Math.min(Math.max(monthsWithData, 1), 12);

    return {
      averageIncome: incomeTotal / divisor,
      monthsOfData: expenseMonths.size,
      lastYearIncome: lastYearTotal,
      thisYearIncome: thisYearTotal,
      projectedAnnualIncome: projected,
      incomeGrowth: growth,
    };
  }, [expenses, invoices]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  return (
    <div className="space-y-6">
      {/* Riepilogo Spese Mensili - Nuovo Card con dati coerenti */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Riepilogo Spese Mensili Stimate
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Spese fisse (prestiti, trasferimenti, abbonamenti) + media spese variabili calcolata su {expensesSummary.monthsConsidered} mesi di storico.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Prestiti/Rate */}
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Rate/Prestiti</p>
              <p className="text-lg font-bold">{formatCurrency(expensesSummary.monthlyLoans)}</p>
            </div>
            
            {/* Trasferimenti */}
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Trasferimenti</p>
              <p className="text-lg font-bold">{formatCurrency(expensesSummary.monthlyTransfers)}</p>
            </div>
            
            {/* Abbonamenti */}
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Abbonamenti</p>
              <p className="text-lg font-bold">{formatCurrency(expensesSummary.monthlySubscriptions)}</p>
            </div>
            
            {/* Variabili (media) */}
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Media Variabili
                {expensesSummary.isEstimated && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">stima</Badge>
                )}
              </p>
              <p className="text-lg font-bold">{formatCurrency(expensesSummary.variableMonthlyAverage)}</p>
              <p className="text-[10px] text-muted-foreground">su {expensesSummary.monthsConsidered} mesi</p>
            </div>
          </div>
          
          {/* Totali */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground">Totale Spese Fisse</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(expensesSummary.totalMonthlyFixed)}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-secondary/10 text-center">
              <p className="text-sm text-muted-foreground">+ Media Variabili</p>
              <p className="text-xl font-bold">{formatCurrency(expensesSummary.totalMonthlyExpenses)}</p>
              <p className="text-xs text-muted-foreground">fissi + variabili</p>
            </div>
            
            <div className="p-4 rounded-lg bg-accent/10 text-center border border-accent/20">
              <p className="text-sm text-muted-foreground">Totale + Bollette</p>
              <p className="text-xl font-bold">{formatCurrency(expensesSummary.totalWithUtilities)}</p>
              <p className="text-xs text-muted-foreground">+ {formatCurrency(expensesSummary.monthlyUtilities)} bollette</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel */}
      <DebugPanel
        title="Riepilogo Spese Mensili"
        hookName="useExpensesSummary(expenses)"
        calculation={`monthlyLoans = groupLoanPayments(expenses).reduce(sum)
monthlyTransfers = groupFamilyTransfers(expenses).reduce(sum)  
monthlySubscriptions = filter(recurring && abbonamenti).reduce(sum)
variableMonthlyAverage = calculateProgressiveVariableAverage(expenses, monthsConsidered)
totalMonthlyFixed = loans + transfers + subscriptions
totalWithUtilities = totalMonthlyExpenses + monthlyUtilities`}
        values={[
          { label: 'Rate/Prestiti', value: expensesSummary.monthlyLoans },
          { label: 'Trasferimenti', value: expensesSummary.monthlyTransfers },
          { label: 'Abbonamenti', value: expensesSummary.monthlySubscriptions },
          { label: 'Media Variabili', value: expensesSummary.variableMonthlyAverage },
          { label: '└─ Mesi considerati', value: expensesSummary.monthsConsidered, indent: 1 },
          { label: 'Totale Fisse', value: expensesSummary.totalMonthlyFixed },
          { label: 'Bollette', value: expensesSummary.monthlyUtilities },
          { label: 'TOTALE MENSILE', value: expensesSummary.totalWithUtilities },
          { label: 'Expenses Totali', value: expenses.length, isRaw: true },
        ]}
        dataSource="Supabase: expenses table via useExpensesSummary()"
      />

      {/* Cost Estimator - passa i dati calcolati correttamente */}
      <CostEstimator
        actualFixedCosts={expensesSummary.totalMonthlyFixed}
        actualVariableCosts={expensesSummary.variableMonthlyAverage}
        actualBillsCosts={expensesSummary.monthlyUtilities}
        monthsOfData={monthsOfData}
        expensesSummary={expensesSummary}
      />

      {/* Income Comparison Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Confronto Reddito Annuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Last Year */}
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">Reddito {lastYear}</p>
              <p className="text-xl font-bold">{formatCurrency(lastYearIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">Anno completo</p>
            </div>

            {/* This Year (YTD) */}
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">Reddito {currentYear} (YTD)</p>
              <p className="text-xl font-bold">{formatCurrency(thisYearIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().getMonth() + 1} mesi
              </p>
            </div>

            {/* Projected */}
            <div className="p-4 rounded-lg bg-primary/10 text-center border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Proiezione {currentYear}</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(projectedAnnualIncome)}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {incomeGrowth >= 0 ? (
                  <Badge variant="default" className="bg-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{incomeGrowth.toFixed(1)}%
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {incomeGrowth.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Advice based on income comparison */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
            {incomeGrowth > 10 && (
              <p className="text-green-600 dark:text-green-400">
                💡 <strong>Ottimo andamento!</strong> Il tuo reddito è in crescita del {incomeGrowth.toFixed(0)}% rispetto all'anno scorso. 
                Considera di aumentare l'accantonamento pensionistico.
              </p>
            )}
            {incomeGrowth >= 0 && incomeGrowth <= 10 && (
              <p className="text-muted-foreground">
                📊 <strong>Reddito stabile</strong>. Il tuo andamento è in linea con l'anno scorso. 
                Mantieni la disciplina nelle spese.
              </p>
            )}
            {incomeGrowth < 0 && incomeGrowth >= -10 && (
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ <strong>Leggero calo</strong>. Il reddito previsto è inferiore del {Math.abs(incomeGrowth).toFixed(0)}% rispetto al {lastYear}. 
                Valuta di ridurre le spese variabili.
              </p>
            )}
            {incomeGrowth < -10 && (
              <p className="text-destructive">
                🚨 <strong>Attenzione!</strong> Il reddito previsto è in calo significativo ({incomeGrowth.toFixed(0)}%). 
                Rivedi il piano di lavoro e le spese fisse.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Settings Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            Parametri di Calcolo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Briefcase className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Tariffa Giornaliera</p>
              <p className="font-semibold">{formatCurrency(dailyRate)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <PiggyBank className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Pensione Mensile</p>
              <p className="font-semibold">{formatCurrency(pensionAmount)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Ritardo Pagamento</p>
              <p className="font-semibold">{paymentDelay} giorni</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Settings2 className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Reddito Medio/Mese</p>
              <p className="font-semibold">{formatCurrency(averageIncome)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights - con dati coerenti */}
      <AIInsights
        expenses={expenses}
        invoices={invoices}
      />
    </div>
  );
}
