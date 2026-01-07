import { useMemo, useState } from 'react';
import { addMonths, format, isSameMonth, setDate, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  TrendingUp, TrendingDown, CreditCard, Wallet,
  ChevronLeft, ChevronRight, AlertTriangle,
  PiggyBank, Zap, ArrowDownLeft, BarChart3, Receipt
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MonthExpensesList } from '@/components/budget/MonthExpensesList';
import { BudgetGauge } from '@/components/budget/BudgetGauge';
import { BudgetBarChart } from '@/components/budget/BudgetBarChart';
import { CategoryBreakdown } from '@/components/budget/CategoryBreakdown';
import { useBudgetStore } from '@/store/budgetStore';
import { useBudgetForecast } from '@/hooks/useBudgetForecast';
import { useMonthlySnapshot, getSnapshotDebugValues } from '@/hooks/useMonthlySnapshot';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatters';

// === KPI CARD COMPONENT ===
interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  trend?: 'up' | 'down' | 'neutral';
}

function KPICard({ title, value, subtitle, icon, variant = 'default', trend }: KPICardProps) {
  const variants = {
    default: 'bg-card border',
    success: 'bg-success/10 border-success/30',
    warning: 'bg-warning/10 border-warning/30',
    destructive: 'bg-destructive/10 border-destructive/30',
    primary: 'bg-primary/10 border-primary/30',
  };
  
  const textVariants = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    primary: 'text-primary',
  };
  
  return (
    <Card className={cn('transition-all hover:shadow-md', variants[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className={cn('text-xl font-bold tabular-nums', textVariants[variant])}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg', variants[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Budget() {
  const { user } = useAuth();
  const { profile, isSecondary } = useUserProfile();
  const { transfers } = useBudgetTransfers();
  const { invoices, expenses, deleteExpense, updateExpense } = useBudgetStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [uploadingExpenseId, setUploadingExpenseId] = useState<string | null>(null);

  // State for "already spent" adjustment - per month
  const [alreadySpentByMonth, setAlreadySpentByMonth] = useState<Record<string, number>>({});
  const currentMonthKey = format(currentMonth, 'yyyy-MM');
  const alreadySpent = alreadySpentByMonth[currentMonthKey] || 0;

  // === UNICA FONTE DI VERITÀ: useMonthlySnapshot ===
  const { current: snapshot, averages } = useMonthlySnapshot(expenses, {
    monthKey: currentMonthKey,
    viewMode: 'profile',
  });

  // Filter family transfers for secondary profiles
  const receivedTransfers = useMemo(() => {
    if (!isSecondary || !user) return [];
    return transfers.filter(t => t.toUserId === user.id);
  }, [transfers, isSecondary, user]);

  // Budget forecast (uses updated unified logic)
  const { summaries, currentMonth: forecastCurrentSummary } = useBudgetForecast({
    invoices: isSecondary ? [] : invoices,
    expenses,
    horizonMonths: 3,
    forecastMonths: 12,
    alreadySpent,
    familyTransfers: receivedTransfers,
    isSecondary,
  });

  // Get displayed summary for selected month
  const displayedSummary = useMemo(() => {
    const found = summaries.find(s => isSameMonth(s.month, currentMonth));
    return found ?? forecastCurrentSummary;
  }, [summaries, currentMonth, forecastCurrentSummary]);

  // Credit card effective date calculation
  const getExpenseEffectiveDate = (exp: Expense) => {
    const isCreditCard = exp.paymentMethod === 'carta_credito';
    if (!isCreditCard) {
      return exp.bookedDate ? new Date(exp.bookedDate) : new Date(exp.date);
    }
    if (exp.bookedDate && new Date(exp.bookedDate).getTime() !== new Date(exp.date).getTime()) {
      return new Date(exp.bookedDate);
    }
    const purchaseDate = exp.purchaseDate ? new Date(exp.purchaseDate) : new Date(exp.date);
    const nextMonth = addMonths(startOfMonth(purchaseDate), 1);
    return setDate(nextMonth, 10);
  };

  // Usa snapshot.expenses per la lista del mese
  const monthExpenses = snapshot.expenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const handleUploadReceipt = async (expenseId: string, file: File) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }
    setUploadingExpenseId(expenseId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${expenseId}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('expense-receipts').upload(fileName, file);
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('expense-receipts').getPublicUrl(fileName);
      await updateExpense(expenseId, { attachmentUrl: publicUrl.publicUrl });
      toast.success('Scontrino caricato');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Errore durante il caricamento');
    } finally {
      setUploadingExpenseId(null);
    }
  };

  const isPastMonth = displayedSummary?.isPastMonth;
  const isCurrentMonthView = displayedSummary?.isCurrentMonth;
  
  const spendingPercentage = displayedSummary && displayedSummary.totalIncome > 0 
    ? (displayedSummary.totalExpenses / displayedSummary.totalIncome) * 100 
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* === HEADER === */}
        <header className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Budget Mensile</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSecondary ? 'Gestisci il tuo budget familiare' : 'Entrate, uscite e previsionale automatico'}
              </p>
            </div>
          </div>
          
          {/* Month Navigator */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-card rounded-lg border min-w-[180px] text-center">
              <span className="font-semibold capitalize text-sm">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </span>
              {isPastMonth && (
                <Badge variant="outline" className="ml-2 text-[10px]">Storico</Badge>
              )}
              {isCurrentMonthView && (
                <Badge variant="secondary" className="ml-2 text-[10px]">Attuale</Badge>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* === KPI CARDS === */}
        {displayedSummary && (
          <div className={cn(
            "grid gap-3",
            isSecondary ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-5"
          )}>
            <KPICard
              title={isSecondary ? "Ricevuto" : "Entrate"}
              value={formatCurrency(displayedSummary.totalIncome)}
              subtitle={isSecondary ? "Bonifici familiari" : `${formatCurrency(displayedSummary.receivedIncome)} incassati`}
              icon={isSecondary ? <ArrowDownLeft className="h-5 w-5 text-success" /> : <TrendingUp className="h-5 w-5 text-success" />}
              variant="success"
            />
            
            {!isSecondary && (
              <>
                <KPICard
                  title="Spese Fisse"
                  value={formatCurrency(snapshot.fixedExpenses.total)}
                  subtitle={`${formatCurrency(snapshot.fixedExpenses.loans)} rate • ${formatCurrency(snapshot.fixedExpenses.subscriptions)} abb.`}
                  icon={<Wallet className="h-5 w-5 text-primary" />}
                  variant="primary"
                />
                <KPICard
                  title="Bollette"
                  value={formatCurrency(snapshot.bills.real || averages.billsMonthly)}
                  subtitle={snapshot.bills.realCount > 0 ? "Costi reali" : "Media stimata"}
                  icon={<Zap className="h-5 w-5 text-yellow-500" />}
                  variant="warning"
                />
              </>
            )}
            
            <KPICard
              title="Variabili"
              value={formatCurrency(averages.variableMonthly)}
              subtitle={`Media ${averages.monthsConsidered} mesi`}
              icon={<TrendingDown className="h-5 w-5 text-warning" />}
              variant="default"
            />
            
            {!isSecondary && (
              <KPICard
                title="Carta Credito"
                value={formatCurrency(snapshot.creditCard.booked)}
                subtitle={`${formatCurrency(snapshot.creditCard.pending)} in arrivo`}
                icon={<CreditCard className="h-5 w-5 text-destructive" />}
                variant="destructive"
              />
            )}
            
            {isSecondary && (
              <KPICard
                title="Budget Rimanente"
                value={formatCurrency(displayedSummary.spendable)}
                subtitle="Ricevuto - Speso"
                icon={<Wallet className="h-5 w-5 text-primary" />}
                variant="primary"
              />
            )}
          </div>
        )}

        {/* Debug Panel - KPI (usa snapshot centralizzato) */}
        {displayedSummary && (
          <DebugPanel
            title="KPI Cards Budget (useMonthlySnapshot)"
            hookName="useMonthlySnapshot() + useBudgetForecast()"
            calculation={`snapshot.fixedExpenses.total = loans + subscriptions
averages.variableMonthly = media spese variabili su X mesi
snapshot.bills.real = bollette effettive del mese
snapshot.creditCard.booked/pending = carta credito`}
            values={[
              { label: 'Entrate (forecast)', value: displayedSummary?.totalIncome },
              { label: '--- Snapshot Mese ---', value: '', isRaw: true },
              { label: 'SPESE FISSE (tot)', value: snapshot.fixedExpenses.total },
              { label: '├─ Rate/Prestiti', value: snapshot.fixedExpenses.loans, indent: 1 },
              { label: '└─ Abbonamenti', value: snapshot.fixedExpenses.subscriptions, indent: 1 },
              { label: 'Variabili Mese', value: snapshot.variableExpenses.total, indent: 1 },
              { label: 'Bollette Mese', value: snapshot.bills.real, indent: 1 },
              { label: 'CC Booked', value: snapshot.creditCard.booked, indent: 1 },
              { label: 'CC Pending', value: snapshot.creditCard.pending, indent: 1 },
              { label: 'TOTALE MESE', value: snapshot.totalExpenses },
              { label: '--- Medie ---', value: '', isRaw: true },
              { label: 'Media Fissi', value: averages.fixedMonthly, indent: 1 },
              { label: 'Media Variabili', value: averages.variableMonthly, indent: 1 },
              { label: 'Media Bollette', value: averages.billsMonthly, indent: 1 },
              { label: 'Mesi Considerati', value: String(averages.monthsConsidered), isRaw: true },
              { label: 'N. Spese Mese', value: snapshot.expenseCount, isRaw: true },
              { label: 'First IDs', value: snapshot.firstExpenseIds.join(', '), isRaw: true },
            ]}
            dataSource="Supabase: expenses via useMonthlySnapshot()"
          />
        )}

        {/* === CHARTS GRID === */}
        {displayedSummary && (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Gauge + Bar Chart stacked on left */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="flex flex-col items-center justify-center p-6">
                <BudgetGauge
                  spent={displayedSummary.totalExpenses}
                  total={displayedSummary.totalIncome}
                  size="lg"
                />
              </Card>
              <BudgetBarChart summaries={summaries.slice(0, 6)} />
            </div>
            
            {/* Category Breakdown - takes 2 columns */}
            <div className="lg:col-span-2">
              <CategoryBreakdown expenses={monthExpenses} />
            </div>
          </div>
        )}

        {/* === REAL SITUATION CARD (current month only) === */}
        {displayedSummary?.isCurrentMonth && !isSecondary && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Situazione Reale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: Breakdown */}
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">In banca (incassato)</span>
                      <span className="font-bold text-success">{formatCurrency(displayedSummary.receivedIncome)}</span>
                    </div>
                  </div>
                  
                  {displayedSummary.pendingIncome > 0 && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Fatture in attesa
                        </span>
                        <span className="font-bold text-warning">{formatCurrency(displayedSummary.pendingIncome)}</span>
                      </div>
                    </div>
                  )}
                  
                  {displayedSummary.carryover > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Carryover precedente</span>
                        <span className="font-semibold text-success">+{formatCurrency(displayedSummary.carryover)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Spese del mese</span>
                      <span className="font-semibold text-destructive">-{formatCurrency(displayedSummary.totalExpenses)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Right: Spendable */}
                <div className="space-y-3">
                  <div className={cn(
                    "p-4 rounded-xl border-2",
                    displayedSummary.realSpendable >= 0 
                      ? "bg-success/10 border-success" 
                      : "bg-destructive/10 border-destructive"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <PiggyBank className="h-5 w-5" />
                      <span className="font-semibold text-sm uppercase tracking-wide">Puoi Spendere Ora</span>
                    </div>
                    <p className={cn(
                      "text-3xl font-bold tabular-nums",
                      displayedSummary.realSpendable >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(displayedSummary.realSpendable)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solo soldi già in banca
                    </p>
                  </div>
                  
                  <div className={cn(
                    "p-4 rounded-lg border",
                    displayedSummary.forecastSpendable >= 0 
                      ? "bg-primary/5 border-primary/20" 
                      : "bg-destructive/5 border-destructive/20"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Previsionale Fine Mese</span>
                    </div>
                    <p className={cn(
                      "text-xl font-bold tabular-nums",
                      displayedSummary.forecastSpendable >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {formatCurrency(displayedSummary.forecastSpendable)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Se incassi tutte le fatture
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* === BUDGET UTILIZATION === */}
        {displayedSummary && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Utilizzo Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Speso vs Entrate</span>
                  <span className={cn(
                    'font-medium',
                    spendingPercentage > 90 ? 'text-destructive' : 
                    spendingPercentage > 70 ? 'text-warning' : 'text-success'
                  )}>
                    {spendingPercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(spendingPercentage, 100)} 
                  className={cn(
                    'h-3',
                    spendingPercentage > 90 ? '[&>div]:bg-destructive' : 
                    spendingPercentage > 70 ? '[&>div]:bg-warning' : '[&>div]:bg-success'
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <p className="text-xs text-muted-foreground">Entrate</p>
                  <p className="font-bold text-success">{formatCurrency(displayedSummary.totalIncome)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <p className="text-xs text-muted-foreground">Uscite</p>
                  <p className="font-bold text-destructive">{formatCurrency(displayedSummary.totalExpenses)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-primary/10">
                  <p className="text-xs text-muted-foreground">Risparmio</p>
                  <p className="font-bold text-primary">{formatCurrency(displayedSummary.savingsMonthly || 0)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={cn('font-bold', displayedSummary.spendable >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(displayedSummary.spendable)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* === MONTH EXPENSES LIST === */}
        <div className="mt-6">
          <MonthExpensesList
            expenses={monthExpenses}
            onUploadReceipt={handleUploadReceipt}
            onDeleteExpense={(id) => deleteExpense(id)}
            onEditExpense={(exp) => {
              toast.info(`Modifica spesa: ${exp.description}`);
            }}
            uploadingExpenseId={uploadingExpenseId}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </Layout>
  );
}
