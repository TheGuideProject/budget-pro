import { useMemo } from 'react';
import { SimpleLayout } from '@/components/simple/SimpleLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBudgetStore } from '@/store/budgetStore';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { TrendingDown, TrendingUp, Wallet, PiggyBank, AlertTriangle, CheckCircle } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, differenceInDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function SimpleBudget() {
  const { expenses } = useBudgetStore();
  const { settings } = useFinancialSettings();

  const monthlyBudget = settings?.monthly_salary || 3000;

  const stats = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const daysInMonth = differenceInDays(end, start) + 1;
    const daysPassed = differenceInDays(now, start) + 1;
    const daysRemaining = daysInMonth - daysPassed;

    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return isWithinInterval(d, { start, end });
    });

    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = monthlyBudget - totalSpent;
    const percentUsed = (totalSpent / monthlyBudget) * 100;
    const dailyBudget = remaining / (daysRemaining || 1);

    // Category breakdown
    const byCategory = monthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalSpent,
      remaining,
      percentUsed,
      dailyBudget,
      daysRemaining,
      topCategories,
      isOverBudget: remaining < 0,
      isWarning: percentUsed > 80 && percentUsed < 100,
    };
  }, [expenses, monthlyBudget]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatus = () => {
    if (stats.isOverBudget) return { icon: AlertTriangle, color: 'text-destructive', label: 'Superato!' };
    if (stats.isWarning) return { icon: AlertTriangle, color: 'text-warning', label: 'Attenzione' };
    return { icon: CheckCircle, color: 'text-success', label: 'In regola' };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <SimpleLayout title="Budget">
      <div className="p-4 space-y-6 pb-24">
        {/* Hero Budget Gauge */}
        <div className="neo-glass p-6 text-center gradient-mesh-bg">
          <div className="relative z-10">
            {/* Circular Progress */}
            <div className="relative w-48 h-48 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#budgetGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(stats.percentUsed, 100) * 2.64} 264`}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: stats.isOverBudget 
                      ? 'drop-shadow(0 0 8px hsl(var(--destructive)))' 
                      : 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))'
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold gradient-text">
                  {Math.round(stats.percentUsed)}%
                </span>
                <span className="text-sm text-muted-foreground">utilizzato</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
              status.color,
              'bg-background/80'
            )}>
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(), 'MMMM yyyy', { locale: it })}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="neo-glass">
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-5 w-5 mx-auto mb-2 text-destructive" />
              <p className="text-xs text-muted-foreground">Speso</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalSpent)}</p>
            </CardContent>
          </Card>

          <Card className="neo-glass">
            <CardContent className="p-4 text-center">
              <PiggyBank className={cn(
                'h-5 w-5 mx-auto mb-2',
                stats.isOverBudget ? 'text-destructive' : 'text-success'
              )} />
              <p className="text-xs text-muted-foreground">Rimasto</p>
              <p className={cn(
                'text-lg font-bold',
                stats.isOverBudget && 'text-destructive'
              )}>
                {formatCurrency(stats.remaining)}
              </p>
            </CardContent>
          </Card>

          <Card className="neo-glass">
            <CardContent className="p-4 text-center">
              <Wallet className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-xs text-muted-foreground">Budget giornaliero</p>
              <p className={cn(
                'text-lg font-bold',
                stats.dailyBudget < 0 && 'text-destructive'
              )}>
                {formatCurrency(Math.max(0, stats.dailyBudget))}
              </p>
            </CardContent>
          </Card>

          <Card className="neo-glass">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-accent" />
              <p className="text-xs text-muted-foreground">Giorni rimasti</p>
              <p className="text-lg font-bold">{stats.daysRemaining}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Categories */}
        {stats.topCategories.length > 0 && (
          <Card className="neo-glass">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Spese per categoria</h3>
              <div className="space-y-4">
                {stats.topCategories.map(([category, amount]) => {
                  const percent = (amount / stats.totalSpent) * 100;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{category}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <Progress 
                        value={percent} 
                        className="h-2"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SimpleLayout>
  );
}
