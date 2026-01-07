import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, isSameMonth, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  TrendingUp, 
  FileText, 
  Clock,
  ArrowRight,
  AlertCircle,
  Plus,
  Euro,
  Wallet,
  Receipt,
  Users,
  Camera,
  Briefcase,
  Gift,
  Calendar,
  BadgeEuro,
  Sparkles
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { BudgetForecastMini } from '@/components/budget/BudgetForecastMini';
import { BudgetGauge } from '@/components/budget/BudgetGauge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBudgetStore } from '@/store/budgetStore';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBudgetForecast } from '@/hooks/useBudgetForecast';
import { useSalaryForecast } from '@/hooks/useSalaryForecast';
import { useMonthlySnapshot, getSnapshotDebugValues } from '@/hooks/useMonthlySnapshot';
import { cn } from '@/lib/utils';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatters';

export default function Index() {
  const { invoices, expenses } = useBudgetStore();
  const { profile, isSecondary, isPrimary, incomeType, loading: profileLoading } = useUserProfile();
  const { transfers, getTotalTransferredForMonth, getAccumulatedBudget } = useBudgetTransfers();
  const { getMonthlyIncome, getAnnualIncome, getUpcomingBonuses, getNextSalaryDate, settings: salarySettings } = useSalaryForecast();
  const currentMonth = new Date();
  const currentMonthKey = format(currentMonth, 'yyyy-MM');
  
  const isEmployee = incomeType === 'employee';
  const isFamilyMember = incomeType === 'family_member';

  // === UNICA FONTE DI VERITÀ: useMonthlySnapshot ===
  const { current: snapshot, averages } = useMonthlySnapshot(expenses, {
    monthKey: currentMonthKey,
    viewMode: 'profile',
  });

  // Budget forecast for dashboard charts
  const { summaries, currentMonth: forecastCurrentSummary } = useBudgetForecast({
    invoices: isSecondary || isEmployee || isFamilyMember ? [] : invoices,
    expenses,
    horizonMonths: 3,
    forecastMonths: 6,
    isSecondary,
  });

  // Stats for PRIMARY users (invoices-based) - USA SNAPSHOT PER SPESE
  const primaryStats = useMemo(() => {
    if (isSecondary) return null;
    
    const now = new Date();
    const thisMonth = invoices.filter(inv => isSameMonth(new Date(inv.dueDate), now));
    const nextMonth = invoices.filter(inv => isSameMonth(new Date(inv.dueDate), addMonths(now, 1)));
    
    const pendingInvoices = invoices.filter(inv => inv.status !== 'pagata');
    const overdueInvoices = pendingInvoices.filter(inv => new Date(inv.dueDate) < now);

    const totalPending = pendingInvoices.reduce((sum, inv) => 
      sum + (inv.remainingAmount ?? inv.totalAmount), 0);
    
    const expectedThisMonth = thisMonth
      .filter(inv => inv.status !== 'pagata')
      .reduce((sum, inv) => sum + (inv.remainingAmount ?? inv.totalAmount), 0);
    
    const expectedNextMonth = nextMonth
      .filter(inv => inv.status !== 'pagata')
      .reduce((sum, inv) => sum + (inv.remainingAmount ?? inv.totalAmount), 0);

    // USA SNAPSHOT invece di calcoli locali!
    const totalMonthExpenses = snapshot.totalExpenses;

    return {
      totalPending,
      pendingCount: pendingInvoices.length,
      expectedThisMonth,
      expectedNextMonth,
      overdueCount: overdueInvoices.length,
      totalMonthExpenses,
      availableThisMonth: expectedThisMonth - totalMonthExpenses,
    };
  }, [invoices, isSecondary, snapshot.totalExpenses]);

  // Stats for SECONDARY users (transfers-based) - with carryover
  const secondaryStats = useMemo(() => {
    if (!isSecondary) return null;

    const now = new Date();
    const receivedThisMonth = getTotalTransferredForMonth(currentMonthKey, 'received');
    
    // Calculate expenses by month for getAccumulatedBudget
    const expensesByMonth = new Map<string, number>();
    expenses.forEach(exp => {
      const expMonthKey = format(new Date(exp.date), 'yyyy-MM');
      expensesByMonth.set(expMonthKey, (expensesByMonth.get(expMonthKey) || 0) + exp.amount);
    });

    // Use getAccumulatedBudget to include carryover from previous months
    const accumulated = getAccumulatedBudget(currentMonthKey, 'received', expensesByMonth);
    
    // Calculate spent this month from own expenses
    const spentThisMonth = expensesByMonth.get(currentMonthKey) || 0;

    // Total received historically
    const totalReceived = transfers
      .filter(t => t.toUserId === profile?.userId)
      .reduce((sum, t) => sum + t.amount, 0);

    // Recent transfers
    const recentTransfers = transfers
      .filter(t => t.toUserId === profile?.userId)
      .slice(0, 5);

    return {
      receivedThisMonth,
      spentThisMonth,
      carryover: accumulated.carryover,
      availableThisMonth: accumulated.carryover + receivedThisMonth,
      remainingBudget: accumulated.remaining, // Includes carryover
      totalReceived,
      recentTransfers,
    };
  }, [isSecondary, expenses, transfers, currentMonthKey, getTotalTransferredForMonth, getAccumulatedBudget, profile]);

  const upcomingInvoices = useMemo(() => {
    if (isSecondary) return [];
    return invoices
      .filter(inv => inv.status !== 'pagata' && new Date(inv.dueDate) >= new Date())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [invoices, isSecondary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (profileLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // SECONDARY USER DASHBOARD
  if (isSecondary && secondaryStats) {
    return (
      <Layout>
        <div className="space-y-6 md:space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
            <div className="gradient-mesh-bg absolute inset-0" />
            <div className="relative z-10 p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Dashboard</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                    Ciao {profile?.displayName}!
                  </h1>
                  <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
                    Ecco il tuo budget familiare
                  </p>
                </div>
                <Link to="/spese-fisse">
                  <Button className="gap-2 w-full sm:w-auto auth-button">
                    <Plus className="h-4 w-4" />
                    Aggiungi Spesa
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Grid - Secondary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Disponibile"
              value={formatCurrency(secondaryStats.availableThisMonth)}
              subtitle={secondaryStats.carryover > 0 
                ? `€${secondaryStats.carryover.toFixed(0)} residuo + €${secondaryStats.receivedThisMonth.toFixed(0)} ricevuto`
                : "Bonifici dal familiare"}
              icon={<Euro className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
              className="animate-fade-in"
            />
            <StatCard
              title="Speso Questo Mese"
              value={formatCurrency(secondaryStats.spentThisMonth)}
              subtitle={format(currentMonth, 'MMMM yyyy', { locale: it })}
              icon={<Receipt className="h-5 w-5 md:h-6 md:w-6 text-destructive" />}
              className="animate-fade-in stagger-1"
            />
            <StatCard
              title="Budget Rimanente"
              value={formatCurrency(secondaryStats.remainingBudget)}
              subtitle="Incluso residuo mesi precedenti"
              icon={<Wallet className="h-5 w-5 md:h-6 md:w-6 text-success" />}
              className="animate-fade-in stagger-2"
            />
            <StatCard
              title="Totale Ricevuto"
              value={formatCurrency(secondaryStats.totalReceived)}
              subtitle="Storico completo"
              icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-accent" />}
              className="animate-fade-in stagger-3"
            />
          </div>

          {/* Debug Panel */}
          <DebugPanel
            title="Stats Secondary Dashboard"
            hookName="useBudgetTransfers() + getAccumulatedBudget()"
            calculation={`receivedThisMonth = getTotalTransferredForMonth(monthKey, 'received')
spentThisMonth = expensesByMonth.get(currentMonthKey)
accumulated = getAccumulatedBudget(monthKey, 'received', expensesByMonth)
remainingBudget = accumulated.remaining (includes carryover)`}
            values={[
              { label: 'Ricevuto Mese', value: secondaryStats.receivedThisMonth },
              { label: 'Speso Mese', value: secondaryStats.spentThisMonth },
              { label: 'Carryover', value: secondaryStats.carryover },
              { label: 'Disponibile', value: secondaryStats.availableThisMonth },
              { label: 'Budget Rimanente', value: secondaryStats.remainingBudget },
              { label: 'Totale Ricevuto Storico', value: secondaryStats.totalReceived, isRaw: true },
            ]}
            dataSource="Supabase: budget_transfers + expenses via useBudgetTransfers()"
          />

          {/* Budget Progress Alert */}
          {secondaryStats.remainingBudget < 0 && (
            <div className="neo-glass border-destructive/30 bg-destructive/5 animate-fade-in p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">
                  Budget superato di {formatCurrency(Math.abs(secondaryStats.remainingBudget))}
                </p>
                <p className="text-sm text-muted-foreground">
                  Hai speso più di quanto ricevuto questo mese
                </p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Recent Transfers */}
            <div className="lg:col-span-2 neo-glass p-4 md:p-6 animate-slide-up">
              <div className="flex flex-row items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Ultimi Bonifici Ricevuti</h3>
                <Link to="/invoices">
                  <Button variant="ghost" size="sm" className="gap-2 hover:bg-primary/10">
                    Vedi tutti
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {secondaryStats.recentTransfers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                    <Euro className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground">Nessun bonifico ricevuto</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {secondaryStats.recentTransfers.map((transfer, index) => (
                    <div 
                      key={transfer.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl",
                        "bg-gradient-to-r from-muted/50 to-muted/30",
                        "hover:from-success/10 hover:to-success/5",
                        "transition-all duration-300 hover:shadow-md"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                          <Euro className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{transfer.description || 'Bonifico familiare'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(transfer.createdAt, 'dd MMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success">+{formatCurrency(transfer.amount)}</p>
                        <Badge variant="outline" className="text-xs bg-muted/50">
                          {transfer.month}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions - Secondary */}
            <div className="neo-glass p-4 md:p-6 animate-slide-up stagger-1">
              <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
              <div className="space-y-3">
                <Link to="/spese-fisse" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-primary/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Aggiungi Spesa</p>
                      <p className="text-sm text-muted-foreground">Registra una nuova spesa</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/budget?tab=ocr" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-warning/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
                      <Camera className="h-5 w-5 text-warning" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Scansiona Scontrino</p>
                      <p className="text-sm text-muted-foreground">Importa spese con OCR</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/family-budget" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-accent/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Budget Familiare</p>
                      <p className="text-sm text-muted-foreground">Gestione trasferimenti</p>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Monthly Expense Summary */}
          <div className="neo-glass p-4 md:p-6 animate-slide-up stagger-2">
            <h3 className="text-lg font-semibold mb-4">Riepilogo Mese Corrente</h3>
            <div className="space-y-4">
              {secondaryStats.carryover > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5">
                  <span className="text-muted-foreground">Residuo mesi precedenti</span>
                  <span className="font-semibold text-accent">+{formatCurrency(secondaryStats.carryover)}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                <span className="text-muted-foreground">Ricevuto questo mese</span>
                <span className="font-semibold text-success">+{formatCurrency(secondaryStats.receivedThisMonth)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                <span className="text-muted-foreground">Speso</span>
                <span className="font-semibold text-destructive">-{formatCurrency(secondaryStats.spentThisMonth)}</span>
              </div>
              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Rimanente</span>
                  <span className={cn(
                    "text-xl font-bold",
                    secondaryStats.remainingBudget >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatCurrency(secondaryStats.remainingBudget)}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      secondaryStats.spentThisMonth / secondaryStats.receivedThisMonth > 0.9 
                        ? "bg-gradient-to-r from-destructive to-destructive/70" 
                        : secondaryStats.spentThisMonth / secondaryStats.receivedThisMonth > 0.7 
                          ? "bg-gradient-to-r from-warning to-warning/70" 
                          : "bg-gradient-to-r from-success to-success/70"
                    )}
                    style={{ 
                      width: `${Math.min(100, (secondaryStats.spentThisMonth / secondaryStats.receivedThisMonth) * 100 || 0)}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {secondaryStats.receivedThisMonth > 0 
                    ? `${Math.round((secondaryStats.spentThisMonth / secondaryStats.receivedThisMonth) * 100)}% del budget utilizzato`
                    : 'Nessun budget ricevuto questo mese'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // FAMILY MEMBER DASHBOARD (no direct income)
  if (isFamilyMember && !isSecondary) {
    // USA SNAPSHOT invece di calcoli locali - ma mantieni lista per UI
    const monthExpenses = snapshot.expenses;
    const totalMonthExpenses = snapshot.totalExpenses;
    
    // Get transfers received if linked
    const receivedThisMonth = getTotalTransferredForMonth(currentMonthKey, 'received');
    
    const expensesByMonth = new Map<string, number>();
    expenses.forEach(exp => {
      const expMonthKey = format(new Date(exp.date), 'yyyy-MM');
      expensesByMonth.set(expMonthKey, (expensesByMonth.get(expMonthKey) || 0) + exp.amount);
    });
    const accumulated = getAccumulatedBudget(currentMonthKey, 'received', expensesByMonth);
    
    return (
      <Layout>
        <div className="space-y-6 md:space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
            <div className="gradient-mesh-bg absolute inset-0" />
            <div className="relative z-10 p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Dashboard</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                    Ciao {profile?.displayName}!
                  </h1>
                  <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
                    Gestisci le tue spese
                  </p>
                </div>
                <Link to="/spese-fisse">
                  <Button className="gap-2 w-full sm:w-auto auth-button">
                    <Plus className="h-4 w-4" />
                    Aggiungi Spesa
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Link Family Alert */}
          {!profile?.linkedToUserId && (
            <div className="neo-glass border-warning/30 bg-warning/5 animate-fade-in p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-warning">
                  Collegati a un familiare
                </p>
                <p className="text-sm text-muted-foreground">
                  Inserisci il codice invito per ricevere il budget condiviso
                </p>
              </div>
              <Link to="/profile">
                <Button variant="outline" size="sm" className="hover:bg-warning/10">
                  Vai al Profilo
                </Button>
              </Link>
            </div>
          )}

          {/* Stats Grid - Family Member */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <StatCard
              title="Budget Disponibile"
              value={formatCurrency(accumulated.remaining)}
              subtitle={receivedThisMonth > 0 ? `€${receivedThisMonth.toFixed(0)} ricevuto questo mese` : "Ricevuto da familiare"}
              icon={<Euro className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
              className="animate-fade-in"
            />
            <StatCard
              title="Speso Questo Mese"
              value={formatCurrency(totalMonthExpenses)}
              subtitle={format(currentMonth, 'MMMM yyyy', { locale: it })}
              icon={<Receipt className="h-5 w-5 md:h-6 md:w-6 text-destructive" />}
              className="animate-fade-in stagger-1"
            />
            <StatCard
              title="Transazioni"
              value={monthExpenses.length.toString()}
              subtitle="Questo mese"
              icon={<Wallet className="h-5 w-5 md:h-6 md:w-6 text-accent" />}
              className="animate-fade-in stagger-2"
            />
          </div>

          {/* Debug Panel - Family Member */}
          <DebugPanel
            title="Stats Family Member Dashboard"
            hookName="useBudgetTransfers() + getAccumulatedBudget()"
            calculation={`receivedThisMonth = getTotalTransferredForMonth(monthKey, 'received')
accumulated = getAccumulatedBudget(monthKey, 'received', expensesByMonth)
totalMonthExpenses = monthExpenses.filter(!carta_credito).reduce(sum)`}
            values={[
              { label: 'Budget Disponibile', value: accumulated.remaining },
              { label: 'Ricevuto Mese', value: receivedThisMonth },
              { label: 'Spese Mese', value: totalMonthExpenses },
              { label: 'N. Transazioni', value: monthExpenses.length },
            ]}
            dataSource="Supabase: budget_transfers + expenses via useBudgetTransfers()"
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Recent Expenses */}
            <div className="lg:col-span-2 neo-glass p-4 md:p-6 animate-slide-up">
              <div className="flex flex-row items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Spese Recenti</h3>
                <Link to="/spese-fisse">
                  <Button variant="ghost" size="sm" className="gap-2 hover:bg-primary/10">
                    Vedi tutte
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {monthExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground">Nessuna spesa registrata</p>
                  <Link to="/spese-fisse">
                    <Button variant="outline" className="mt-4 hover:bg-primary/10">
                      Aggiungi la prima spesa
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {monthExpenses.slice(0, 5).map((expense, index) => (
                    <div 
                      key={expense.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl",
                        "bg-gradient-to-r from-muted/50 to-muted/30",
                        "hover:from-destructive/10 hover:to-destructive/5",
                        "transition-all duration-300 hover:shadow-md"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                          <Receipt className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(expense.date), 'dd MMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-destructive">-{formatCurrency(expense.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions - Family Member */}
            <div className="neo-glass p-4 md:p-6 animate-slide-up stagger-1">
              <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
              <div className="space-y-3">
                <Link to="/spese-fisse" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-primary/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Aggiungi Spesa</p>
                      <p className="text-sm text-muted-foreground">Registra una nuova spesa</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/budget?tab=ocr" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-warning/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
                      <Camera className="h-5 w-5 text-warning" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Scansiona Scontrino</p>
                      <p className="text-sm text-muted-foreground">Importa spese con OCR</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/profile" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-accent/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Collegamento Famiglia</p>
                      <p className="text-sm text-muted-foreground">Inserisci codice invito</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/calendar" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-primary/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Calendario</p>
                      <p className="text-sm text-muted-foreground">Scadenze e pagamenti</p>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // EMPLOYEE USER DASHBOARD
  if (isEmployee && !isSecondary) {
    const upcomingBonuses = getUpcomingBonuses();
    const nextSalaryDate = getNextSalaryDate();
    const thisMonthIncome = getMonthlyIncome(currentMonth);
    const annualIncome = getAnnualIncome;
    
    // USA SNAPSHOT invece di calcoli locali - ma mantieni lista per UI
    const monthExpenses = snapshot.expenses;
    const totalMonthExpenses = snapshot.totalExpenses;
    
    const remainingBudget = thisMonthIncome - totalMonthExpenses;
    const daysUntilSalary = Math.ceil((nextSalaryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return (
      <Layout>
        <div className="space-y-6 md:space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
            <div className="gradient-mesh-bg absolute inset-0" />
            <div className="relative z-10 p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Dashboard</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                    Ciao {profile?.displayName}!
                  </h1>
                  <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
                    Ecco la tua situazione finanziaria
                  </p>
                </div>
                <Link to="/spese">
                  <Button className="gap-2 w-full sm:w-auto auth-button">
                    <Plus className="h-4 w-4" />
                    Aggiungi Spesa
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Grid - Employee */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Prossimo Stipendio"
              value={formatCurrency(salarySettings?.monthly_salary || 0)}
              subtitle={`${daysUntilSalary > 0 ? `Tra ${daysUntilSalary} giorni` : 'Oggi!'} - ${format(nextSalaryDate, 'dd MMM', { locale: it })}`}
              icon={<BadgeEuro className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
              className="animate-fade-in"
            />
            <StatCard
              title="Entrate Mese"
              value={formatCurrency(thisMonthIncome)}
              subtitle={format(currentMonth, 'MMMM yyyy', { locale: it })}
              icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />}
              className="animate-fade-in stagger-1"
            />
            <StatCard
              title="Speso Questo Mese"
              value={formatCurrency(totalMonthExpenses)}
              subtitle={`${monthExpenses.length} transazioni`}
              icon={<Receipt className="h-5 w-5 md:h-6 md:w-6 text-destructive" />}
              className="animate-fade-in stagger-2"
            />
            <StatCard
              title="Budget Rimanente"
              value={formatCurrency(remainingBudget)}
              subtitle="Entrate - Spese mese"
              icon={<Wallet className="h-5 w-5 md:h-6 md:w-6 text-accent" />}
              className="animate-fade-in stagger-3"
            />
          </div>

          {/* Debug Panel - Employee */}
          <DebugPanel
            title="Stats Employee Dashboard"
            hookName="useSalaryForecast() + useBudgetStore()"
            calculation={`thisMonthIncome = getMonthlyIncome(currentMonth)
totalMonthExpenses = monthExpenses.filter(!carta_credito).reduce(sum)
remainingBudget = thisMonthIncome - totalMonthExpenses`}
            values={[
              { label: 'Stipendio Mensile', value: salarySettings?.monthly_salary || 0 },
              { label: 'Entrate Mese', value: thisMonthIncome },
              { label: 'Spese Mese', value: totalMonthExpenses },
              { label: 'Budget Rimanente', value: remainingBudget },
              { label: 'N. Transazioni', value: monthExpenses.length },
              { label: 'Giorni al Prossimo Stipendio', value: daysUntilSalary },
              { label: 'Reddito Annuale', value: annualIncome },
            ]}
            dataSource="Supabase: expenses + salary_settings via useSalaryForecast()"
          />

          {/* Budget Warning */}
          {remainingBudget < 0 && (
            <div className="neo-glass border-destructive/30 bg-destructive/5 animate-fade-in p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">
                  Budget superato di {formatCurrency(Math.abs(remainingBudget))}
                </p>
                <p className="text-sm text-muted-foreground">
                  Hai speso più di quanto guadagnato questo mese
                </p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Upcoming Bonuses */}
            <div className="lg:col-span-2 neo-glass p-4 md:p-6 animate-slide-up">
              <div className="flex flex-row items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-warning" />
                  <h3 className="text-lg font-semibold">Bonus e Mensilità Extra</h3>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/30">{upcomingBonuses.length} in arrivo</Badge>
              </div>
              {upcomingBonuses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                    <Gift className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground">Nessun bonus configurato</p>
                  <Link to="/profile">
                    <Button variant="outline" className="mt-4 hover:bg-primary/10">
                      Configura bonus
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBonuses.slice(0, 5).map((bonus, index) => {
                    const isNextMonth = isSameMonth(bonus.month, addMonths(currentMonth, 1));
                    const isThisMonth = isSameMonth(bonus.month, currentMonth);
                    
                    return (
                      <div 
                        key={`${bonus.name}-${index}`}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl transition-all duration-300",
                          isThisMonth 
                            ? "bg-gradient-to-r from-success/20 to-success/10 border border-success/30" 
                            : "bg-gradient-to-r from-muted/50 to-muted/30 hover:from-warning/10 hover:to-warning/5"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            isThisMonth ? "bg-success/20" : "bg-warning/10"
                          )}>
                            <Gift className={cn("h-5 w-5", isThisMonth ? "text-success" : "text-warning")} />
                          </div>
                          <div>
                            <p className="font-medium">{bonus.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(bonus.month, 'MMMM yyyy', { locale: it })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">+{formatCurrency(bonus.amount)}</p>
                          {isThisMonth && (
                            <Badge className="text-xs bg-success/10 text-success border-success/30">Questo mese!</Badge>
                          )}
                          {isNextMonth && (
                            <Badge variant="outline" className="text-xs">Prossimo mese</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions - Employee */}
            <div className="neo-glass p-4 md:p-6 animate-slide-up stagger-1">
              <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
              <div className="space-y-3">
                <Link to="/spese" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-primary/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Aggiungi Spesa</p>
                      <p className="text-sm text-muted-foreground">Registra una nuova spesa</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/budget?tab=ocr" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-warning/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
                      <Camera className="h-5 w-5 text-warning" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Scansiona Scontrino</p>
                      <p className="text-sm text-muted-foreground">Importa spese con OCR</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/analytics" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-accent/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                      <TrendingUp className="h-5 w-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Analisi Finanze</p>
                      <p className="text-sm text-muted-foreground">Grafici e previsioni</p>
                    </div>
                  </Button>
                </Link>
                <Link to="/profile" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-success/10 hover:shadow-md transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-success/20 to-success/10">
                      <Briefcase className="h-5 w-5 text-success" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Impostazioni Lavoro</p>
                      <p className="text-sm text-muted-foreground">Stipendio e bonus</p>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Annual Income Summary */}
          <div className="neo-glass p-4 md:p-6 animate-slide-up stagger-2">
            <h3 className="text-lg font-semibold mb-4">Riepilogo Annuale</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
              <div className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Reddito Annuo Previsto</p>
                <p className="text-lg md:text-2xl font-bold gradient-text mt-1 md:mt-2">{formatCurrency(annualIncome)}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Stipendi + Bonus + Extra</p>
              </div>
              <div className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Media Mensile</p>
                <p className="text-lg md:text-2xl font-bold text-success mt-1 md:mt-2">{formatCurrency(annualIncome / 12)}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Distribuito su 12 mesi</p>
              </div>
              <div className="p-4 md:p-6 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Prossimi Bonus</p>
                <p className="text-lg md:text-2xl font-bold text-warning mt-1 md:mt-2">{upcomingBonuses.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Nei prossimi 12 mesi</p>
              </div>
            </div>
          </div>

          {/* Budget Gauge */}
          {forecastCurrentSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="neo-glass p-4 md:p-6 animate-slide-up">
                <h3 className="text-base font-semibold mb-4">Utilizzo Budget Mese</h3>
                <div className="min-h-[200px] flex items-center justify-center">
                  <BudgetGauge 
                    spent={totalMonthExpenses} 
                    total={thisMonthIncome}
                    compact={false}
                  />
                </div>
              </div>
              <BudgetForecastMini summaries={summaries} />
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // PRIMARY USER DASHBOARD (Freelancer - original)
  const stats = primaryStats || {
    totalPending: 0,
    pendingCount: 0,
    expectedThisMonth: 0,
    expectedNextMonth: 0,
    overdueCount: 0,
    totalMonthExpenses: 0,
    availableThisMonth: 0,
  };

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
          <div className="gradient-mesh-bg absolute inset-0" />
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary">Dashboard</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                  Benvenuto!
                </h1>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
                  Ecco una panoramica delle tue finanze
                </p>
              </div>
              <Link to="/new-invoice">
                <Button className="gap-2 w-full sm:w-auto auth-button">
                  <Plus className="h-4 w-4" />
                  Nuova Fattura
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="Entrate in Arrivo"
            value={formatCurrency(stats.totalPending)}
            subtitle={`${stats.pendingCount} fatture in attesa`}
            icon={<Euro className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
            className="animate-fade-in"
          />
          <StatCard
            title="Questo Mese"
            value={formatCurrency(stats.expectedThisMonth)}
            subtitle={format(currentMonth, 'MMMM yyyy', { locale: it })}
            icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />}
            className="animate-fade-in stagger-1"
          />
          <StatCard
            title="Prossimo Mese"
            value={formatCurrency(stats.expectedNextMonth)}
            subtitle={format(addMonths(currentMonth, 1), 'MMMM yyyy', { locale: it })}
            icon={<Clock className="h-5 w-5 md:h-6 md:w-6 text-accent" />}
            className="animate-fade-in stagger-2"
          />
          <StatCard
            title="Budget Disponibile"
            value={formatCurrency(stats.availableThisMonth)}
            subtitle="Entrate - Spese mese corrente"
            icon={<FileText className="h-5 w-5 md:h-6 md:w-6 text-warning" />}
            className="animate-fade-in stagger-3"
          />
        </div>

        {/* Debug Panel - Primary/Freelancer */}
        <DebugPanel
          title="Stats Primary Dashboard"
          hookName="useMemo() su invoices + expenses"
          calculation={`totalPending = pendingInvoices.reduce(sum remainingAmount ?? totalAmount)
expectedThisMonth = thisMonth.filter(!pagata).reduce(sum)
totalMonthExpenses = monthExpenses.filter(!carta_credito).reduce(sum)
availableThisMonth = expectedThisMonth - totalMonthExpenses - prevMonthCC`}
          values={[
            { label: 'Fatture Pendenti', value: stats.totalPending },
            { label: 'N. Fatture Pendenti', value: stats.pendingCount },
            { label: 'Atteso Questo Mese', value: stats.expectedThisMonth },
            { label: 'Atteso Prossimo Mese', value: stats.expectedNextMonth },
            { label: 'Fatture Scadute', value: stats.overdueCount },
            { label: 'Spese Mese', value: stats.totalMonthExpenses },
            { label: 'Disponibile', value: stats.availableThisMonth },
          ]}
          dataSource="Supabase: invoices + expenses via useBudgetStore()"
        />

        {/* Overdue Alert */}
        {stats.overdueCount > 0 && (
          <div className="neo-glass border-destructive/30 bg-destructive/5 animate-fade-in p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">
                {stats.overdueCount} fattur{stats.overdueCount === 1 ? 'a scaduta' : 'e scadute'}
              </p>
              <p className="text-sm text-muted-foreground">
                Controlla le fatture in ritardo e sollecita i pagamenti
              </p>
            </div>
            <Link to="/invoices">
              <Button variant="outline" size="sm" className="hover:bg-destructive/10">
                Vedi dettagli
              </Button>
            </Link>
          </div>
        )}

        {/* Impact Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {forecastCurrentSummary && (
            <div className="neo-glass p-4 md:p-6 animate-slide-up">
              <h3 className="text-base font-semibold mb-4">Utilizzo Budget Mese</h3>
              <div className="min-h-[200px] flex items-center justify-center">
                <BudgetGauge 
                  spent={forecastCurrentSummary.totalExpenses} 
                  total={forecastCurrentSummary.totalIncome}
                  compact={false}
                />
              </div>
            </div>
          )}
          <BudgetForecastMini summaries={summaries} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Upcoming Invoices */}
          <div className="lg:col-span-2 neo-glass p-4 md:p-6 animate-slide-up">
            <div className="flex flex-row items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Prossime Entrate</h3>
              <Link to="/invoices">
                <Button variant="ghost" size="sm" className="gap-2 hover:bg-primary/10">
                  Vedi tutte
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {upcomingInvoices.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">Nessuna fattura in arrivo</p>
                <Link to="/new-invoice">
                  <Button variant="outline" className="mt-4 hover:bg-primary/10">
                    Crea la prima fattura
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingInvoices.map((invoice, index) => {
                  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                  const isDueSoon = daysUntilDue <= 7;
                  const displayAmount = invoice.remainingAmount ?? invoice.totalAmount;

                  return (
                    <div 
                      key={invoice.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl",
                        "bg-gradient-to-r from-muted/50 to-muted/30",
                        "hover:from-primary/10 hover:to-primary/5",
                        "transition-all duration-300 hover:shadow-md"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.clientName}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {invoice.projectName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(displayAmount)}</p>
                        {invoice.paidAmount > 0 && (
                          <p className="text-xs text-success">
                            Anticipo: {formatCurrency(invoice.paidAmount)}
                          </p>
                        )}
                        <p className={cn(
                          'text-sm',
                          isDueSoon ? 'text-warning font-medium' : 'text-muted-foreground'
                        )}>
                          {isDueSoon ? `Tra ${daysUntilDue} giorni` : format(new Date(invoice.dueDate), 'dd MMM', { locale: it })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="neo-glass p-4 md:p-6 animate-slide-up stagger-1">
            <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
            <div className="space-y-3">
              <Link to="/new-invoice" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-primary/10 hover:shadow-md transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Nuova Fattura</p>
                    <p className="text-sm text-muted-foreground">Crea fattura Q-Consulting</p>
                  </div>
                </Button>
              </Link>
              <Link to="/budget?tab=ocr" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-warning/10 hover:shadow-md transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
                    <Camera className="h-5 w-5 text-warning" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Scansiona Scontrino</p>
                    <p className="text-sm text-muted-foreground">Importa spese con OCR</p>
                  </div>
                </Button>
              </Link>
              <Link to="/budget" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-accent/10 hover:shadow-md transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Gestisci Budget</p>
                    <p className="text-sm text-muted-foreground">Spese e disponibilità</p>
                  </div>
                </Button>
              </Link>
              <Link to="/invoices" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-4 hover:bg-success/10 hover:shadow-md transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-success/20 to-success/10">
                    <FileText className="h-5 w-5 text-success" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Lista Fatture</p>
                    <p className="text-sm text-muted-foreground">Visualizza e gestisci</p>
                  </div>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Monthly Forecast */}
        <div className="neo-glass p-4 md:p-6 animate-slide-up stagger-2">
          <h3 className="text-base md:text-lg font-semibold mb-4">Previsione Prossimi 3 Mesi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            {[0, 1, 2].map((monthOffset) => {
              const month = addMonths(currentMonth, monthOffset);
              const monthInvoices = invoices.filter(inv => 
                isSameMonth(new Date(inv.dueDate), month) && inv.status !== 'pagata'
              );
              const total = monthInvoices.reduce((sum, inv) => sum + (inv.remainingAmount ?? inv.totalAmount), 0);
              const count = monthInvoices.length;

              return (
                <div 
                  key={monthOffset}
                  className={cn(
                    'p-4 md:p-6 rounded-xl transition-all overflow-hidden',
                    monthOffset === 0 
                      ? 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20' 
                      : 'bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/20'
                  )}
                >
                  <p className="text-xs md:text-sm font-medium text-muted-foreground capitalize truncate">
                    {format(month, 'MMMM yyyy', { locale: it })}
                  </p>
                  <p className={cn(
                    "text-lg md:text-2xl font-bold mt-1 md:mt-2 truncate",
                    monthOffset === 0 ? "gradient-text" : ""
                  )}>
                    {formatCurrency(total)}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                    {count} fattur{count === 1 ? 'a' : 'e'} in scadenza
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
