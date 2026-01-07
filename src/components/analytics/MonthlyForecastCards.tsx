import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Wallet,
  FileEdit,
  ChevronRight,
  LayoutGrid,
  List,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { WorkPlanMonth } from '@/types';
import { cn } from '@/lib/utils';

interface MonthlyForecastCardsProps {
  workPlan: (WorkPlanMonth & { 
    carryover?: number;
    draftIncome?: number;
    cashInFromDue?: number;
  })[];
  includeDrafts: boolean;
  historicalYear?: number;
}

export function MonthlyForecastCards({ workPlan, includeDrafts, historicalYear }: MonthlyForecastCardsProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Find first deficit month and calculate months until deficit
  const deficitAnalysis = useMemo(() => {
    const firstDeficitMonth = workPlan.find(m => m.cumulativeBalance < 0);
    const firstDeficitIndex = firstDeficitMonth 
      ? workPlan.indexOf(firstDeficitMonth) + 1 
      : null;
    
    // Find lowest point (maximum drawdown)
    const lowestBalance = Math.min(...workPlan.map(m => m.cumulativeBalance));
    const lowestMonth = workPlan.find(m => m.cumulativeBalance === lowestBalance);
    
    // Calculate total deficit recovery needed
    const totalDeficit = workPlan
      .filter(m => m.cumulativeBalance < 0)
      .reduce((worst, m) => Math.min(worst, m.cumulativeBalance), 0);

    return {
      firstDeficitMonth,
      monthsUntilDeficit: firstDeficitIndex,
      lowestBalance,
      lowestMonth,
      totalDeficit,
      hasDeficit: firstDeficitMonth !== null
    };
  }, [workPlan]);

  // Summary stats
  const stats = useMemo(() => {
    const totalIncome = workPlan.reduce((sum, m) => sum + m.expectedIncome, 0);
    const totalExpenses = workPlan.reduce((sum, m) => sum + m.totalExpenses, 0);
    const finalBalance = workPlan.length > 0 ? workPlan[workPlan.length - 1].cumulativeBalance : 0;
    const avgMonthlyBalance = workPlan.reduce((sum, m) => sum + m.balance, 0) / workPlan.length;
    
    return { totalIncome, totalExpenses, finalBalance, avgMonthlyBalance };
  }, [workPlan]);

  return (
    <Card className="border-2 border-primary/10 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-primary/5 via-background to-background pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-primary" />
              Proiezione 12 Mesi
            </CardTitle>
            <CardDescription className="mt-1">
              Quando rischio di andare in rosso? Entrate previste + bozze vs spese storiche
            </CardDescription>
          </div>
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as 'compact' | 'detailed')}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="compact" aria-label="Vista compatta" className="px-3">
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Compatta</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="detailed" aria-label="Vista dettagliata" className="px-3">
              <List className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Dettagliata</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Predictive Alert */}
        {deficitAnalysis.hasDeficit && deficitAnalysis.firstDeficitMonth && (
          <Alert variant="destructive" className="mt-4 border-2 animate-pulse">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-base font-semibold">
              Rischio Deficit tra {deficitAnalysis.monthsUntilDeficit} mesi
            </AlertTitle>
            <AlertDescription className="mt-1">
              A <strong>{format(deficitAnalysis.firstDeficitMonth.month, 'MMMM yyyy', { locale: it })}</strong> il saldo previsto è{' '}
              <strong className="text-destructive">{formatCurrency(deficitAnalysis.firstDeficitMonth.cumulativeBalance)}</strong>.
              {deficitAnalysis.lowestBalance < deficitAnalysis.firstDeficitMonth.cumulativeBalance && (
                <> Punto più basso: {formatCurrency(deficitAnalysis.lowestBalance)}.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {!deficitAnalysis.hasDeficit && stats.finalBalance > 0 && (
          <Alert className="mt-4 border-2 border-green-500/30 bg-green-500/5">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-base font-semibold text-green-700">
              Bilancio in Positivo per 12 Mesi
            </AlertTitle>
            <AlertDescription className="mt-1 text-green-600">
              Saldo finale previsto: <strong>{formatCurrency(stats.finalBalance)}</strong>. 
              Nessun mese a rischio deficit.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Horizontal scrolling month cards */}
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory -mx-2 px-2">
          {workPlan.map((month, idx) => (
            <MonthCard 
              key={month.monthKey}
              month={month}
              isFirst={idx === 0}
              isDeficit={month.cumulativeBalance < 0}
              isFirstDeficit={deficitAnalysis.firstDeficitMonth?.monthKey === month.monthKey}
              viewMode={viewMode}
              includeDrafts={includeDrafts}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>

        {/* Summary Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-600" />
            <p className="text-xs text-muted-foreground">Entrate Totali</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <TrendingDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <p className="text-xs text-muted-foreground">Uscite Totali</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Saldo Finale</p>
            <p className={cn("text-lg font-bold", stats.finalBalance >= 0 ? 'text-green-600' : 'text-destructive')}>
              {formatCurrency(stats.finalBalance)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-xs text-muted-foreground">Media Mensile</p>
            <p className={cn("text-lg font-bold", stats.avgMonthlyBalance >= 0 ? 'text-green-600' : 'text-destructive')}>
              {formatCurrency(stats.avgMonthlyBalance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MonthCardProps {
  month: WorkPlanMonth & { 
    carryover?: number;
    draftIncome?: number;
    cashInFromDue?: number;
  };
  isFirst: boolean;
  isDeficit: boolean;
  isFirstDeficit: boolean;
  viewMode: 'compact' | 'detailed';
  includeDrafts: boolean;
  formatCurrency: (value: number) => string;
}

function MonthCard({ 
  month, 
  isFirst, 
  isDeficit, 
  isFirstDeficit,
  viewMode, 
  includeDrafts,
  formatCurrency 
}: MonthCardProps) {
  const hasDrafts = (month.draftIncome || 0) > 0;
  const incomeProgress = month.totalExpenses > 0 
    ? Math.min(100, (month.expectedIncome / month.totalExpenses) * 100)
    : 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex-shrink-0 snap-start rounded-xl border-2 transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
              viewMode === 'compact' ? 'w-28 p-3' : 'w-44 p-4',
              isFirstDeficit && 'ring-2 ring-destructive ring-offset-2 animate-pulse',
              isDeficit 
                ? 'border-destructive/50 bg-destructive/5' 
                : month.status === 'surplus'
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-muted bg-muted/20',
              isFirst && 'border-primary/50 bg-primary/5'
            )}
          >
            {/* Month Header */}
            <div className="text-center mb-2">
              <p className={cn(
                "font-semibold uppercase tracking-wide",
                viewMode === 'compact' ? 'text-xs' : 'text-sm'
              )}>
                {format(month.month, viewMode === 'compact' ? 'MMM' : 'MMMM', { locale: it })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(month.month, 'yy')}
              </p>
            </div>

            {/* Status Icon */}
            <div className="flex justify-center mb-2">
              {isDeficit ? (
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
              ) : month.status === 'surplus' ? (
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Balance */}
            <p className={cn(
              "text-center font-bold",
              viewMode === 'compact' ? 'text-sm' : 'text-lg',
              month.cumulativeBalance >= 0 ? 'text-green-600' : 'text-destructive'
            )}>
              {month.cumulativeBalance >= 0 ? '+' : ''}{formatCurrency(month.cumulativeBalance)}
            </p>

            {/* Income/Expense bars - detailed view only */}
            {viewMode === 'detailed' && (
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Entrate</span>
                    <span className="text-green-600">{formatCurrency(month.expectedIncome)}</span>
                  </div>
                  <Progress value={incomeProgress} className="h-1.5" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uscite</span>
                  <span className="text-destructive">{formatCurrency(month.totalExpenses)}</span>
                </div>
              </div>
            )}

            {/* Draft Badge */}
            {hasDrafts && includeDrafts && (
              <Badge 
                variant="secondary" 
                className="mt-2 w-full justify-center text-xs bg-amber-500/20 text-amber-700 border-amber-500/30"
              >
                <FileEdit className="h-3 w-3 mr-1" />
                {viewMode === 'detailed' ? formatCurrency(month.draftIncome || 0) : 'Bozze'}
              </Badge>
            )}

            {/* First month indicator */}
            {isFirst && (
              <Badge variant="outline" className="mt-2 w-full justify-center text-xs">
                Oggi
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-4">
          <div className="space-y-2">
            <p className="font-semibold text-base">
              {format(month.month, 'MMMM yyyy', { locale: it })}
            </p>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Riporto: <span className={month.carryover && month.carryover >= 0 ? 'text-green-600' : 'text-destructive'}>
                  {formatCurrency(month.carryover || 0)}
                </span>
              </p>
              <p className="text-green-600">
                ↗ Entrate: {formatCurrency(month.expectedIncome)}
                {hasDrafts && <span className="text-amber-500"> (di cui bozze: {formatCurrency(month.draftIncome || 0)})</span>}
              </p>
              <p className="text-destructive">
                ↘ Uscite: {formatCurrency(month.totalExpenses)}
              </p>
              <div className="border-t pt-1 mt-1">
                <p className="text-muted-foreground">Saldo mese: {formatCurrency(month.balance)}</p>
                <p className={cn("font-semibold", month.cumulativeBalance >= 0 ? 'text-green-600' : 'text-destructive')}>
                  Saldo cumulativo: {formatCurrency(month.cumulativeBalance)}
                </p>
              </div>
              {month.workDaysNeeded > 0 && (
                <p className="text-primary text-xs">
                  Giorni lavoro necessari: {month.workDaysNeeded}
                </p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
