import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle } from 'lucide-react';
import { BudgetMonthSummary } from '@/types';
import { cn } from '@/lib/utils';

interface BudgetTimelineProps {
  summaries: BudgetMonthSummary[];
  formatCurrency: (amount: number) => string;
}

export function BudgetTimeline({ summaries, formatCurrency }: BudgetTimelineProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Timeline Previsionale</h3>
      
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-4 min-w-max">
          {summaries.map((summary, idx) => (
            <div
              key={summary.monthKey}
              className={cn(
                'flex-shrink-0 w-64 p-4 rounded-xl border transition-all',
                idx === 0 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-card border-border hover:border-primary/30'
              )}
            >
              {/* Month header */}
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  'font-semibold capitalize',
                  idx === 0 ? 'text-primary' : 'text-foreground'
                )}>
                  {format(summary.month, 'MMMM yyyy', { locale: it })}
                </span>
                {idx === 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Corrente
                  </span>
                )}
              </div>

              {/* Income */}
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  Entrate
                </span>
                <span className="text-success font-medium">
                  {formatCurrency(summary.totalIncome)}
                </span>
              </div>

              {/* Expenses */}
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  Uscite
                </span>
                <span className="text-destructive font-medium">
                  - {formatCurrency(summary.totalExpenses)}
                </span>
              </div>

              {/* Carryover */}
              {summary.carryover > 0 && (
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-success" />
                    Riporto +
                  </span>
                  <span className="text-success font-medium">
                    + {formatCurrency(summary.carryover)}
                  </span>
                </div>
              )}

              {/* Overspend Allocated */}
              {summary.overspendAllocated > 0 && (
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    Debito allocato
                  </span>
                  <span className="text-warning font-medium">
                    - {formatCurrency(summary.overspendAllocated)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-border my-2" />

              {/* Spendable */}
              <div className="flex items-center justify-between">
                <span className="font-medium">Spendibile</span>
                <span className={cn(
                  'font-bold text-lg',
                  summary.spendable >= 0 ? 'text-primary' : 'text-destructive'
                )}>
                  {formatCurrency(summary.spendable)}
                </span>
              </div>

              {/* Explanation tooltip for overspend */}
              {summary.overspendAllocated > 0 && (
                <p className="mt-2 text-xs text-muted-foreground bg-warning/10 p-2 rounded">
                  Questo mese hai {formatCurrency(summary.overspendAllocated)} in meno perché è stato allocato l'overspend dei mesi precedenti.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
