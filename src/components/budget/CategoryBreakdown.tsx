import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/types';
import { getCategoryParent, CATEGORY_PARENTS } from '@/types/categories';
import { cn } from '@/lib/utils';

interface CategoryBreakdownProps {
  expenses: Expense[];
}

interface CategoryData {
  id: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Modern color palette using design system
const CATEGORY_COLORS: Record<string, string> = {
  alimentari: 'bg-success/15 text-success border-success/30',
  ristorazione: 'bg-warning/15 text-warning border-warning/30',
  trasporti: 'bg-primary/15 text-primary border-primary/30',
  casa_utenze: 'bg-accent/15 text-accent border-accent/30',
  salute: 'bg-destructive/15 text-destructive border-destructive/30',
  persona_cura: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
  tempo_libero: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  tecnologia: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  animali: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  finanza_obblighi: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  altro: 'bg-muted text-muted-foreground border-border',
};

const BAR_COLORS: Record<string, string> = {
  alimentari: 'bg-success',
  ristorazione: 'bg-warning',
  trasporti: 'bg-primary',
  casa_utenze: 'bg-accent',
  salute: 'bg-destructive',
  persona_cura: 'bg-pink-500',
  tempo_libero: 'bg-purple-500',
  tecnologia: 'bg-cyan-500',
  animali: 'bg-amber-500',
  finanza_obblighi: 'bg-indigo-500',
  altro: 'bg-muted-foreground',
};

export function CategoryBreakdown({ expenses }: CategoryBreakdownProps) {
  const categoryData = useMemo(() => {
    if (expenses.length === 0) return [];

    // Group expenses by category
    const grouped = expenses.reduce((acc, exp) => {
      const categoryId = exp.categoryParent?.toLowerCase() || 'altro';
      if (!acc[categoryId]) {
        acc[categoryId] = { amount: 0, count: 0 };
      }
      acc[categoryId].amount += exp.amount;
      acc[categoryId].count += 1;
      return acc;
    }, {} as Record<string, { amount: number; count: number }>);

    const total = Object.values(grouped).reduce((sum, cat) => sum + cat.amount, 0);

    // Map to category data with metadata
    const data: CategoryData[] = Object.entries(grouped)
      .map(([id, { amount, count }]) => {
        const parent = getCategoryParent(id);
        return {
          id,
          label: parent?.label || 'Altro',
          amount,
          count,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: CATEGORY_COLORS[id] || CATEGORY_COLORS.altro,
          icon: parent?.icon || CATEGORY_PARENTS.find(p => p.id === 'altro')?.icon || (() => null),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return data;
  }, [expenses]);

  const totalAmount = useMemo(() => 
    categoryData.reduce((sum, cat) => sum + cat.amount, 0),
    [categoryData]
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (expenses.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Spese per Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground text-sm">Nessuna spesa questo mese</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Spese per Categoria</CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            {expenses.length} transazioni
          </span>
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums">
          {formatCurrency(totalAmount)}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Horizontal breakdown bar */}
        <div className="h-3 w-full flex overflow-hidden">
          {categoryData.map((cat, idx) => (
            <div
              key={cat.id}
              className={cn(
                'h-full transition-all duration-500 ease-out',
                BAR_COLORS[cat.id] || BAR_COLORS.altro,
                idx === 0 && 'rounded-l-none',
                idx === categoryData.length - 1 && 'rounded-r-none'
              )}
              style={{ 
                width: `${cat.percentage}%`,
                animationDelay: `${idx * 50}ms`
              }}
              title={`${cat.label}: ${cat.percentage.toFixed(1)}%`}
            />
          ))}
        </div>

        {/* Category list */}
        <div className="divide-y divide-border/50">
          {categoryData.map((cat, idx) => {
            const IconComponent = cat.icon;
            return (
              <div
                key={cat.id}
                className={cn(
                  'flex items-center gap-3 p-4 transition-colors hover:bg-muted/30',
                  'animate-fade-in opacity-0'
                )}
                style={{ animationDelay: `${idx * 75}ms`, animationFillMode: 'forwards' }}
              >
                {/* Icon badge */}
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border',
                  cat.color
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>

                {/* Category info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{cat.label}</span>
                    <span className="font-semibold tabular-nums text-sm">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700 ease-out',
                          BAR_COLORS[cat.id] || BAR_COLORS.altro
                        )}
                        style={{ 
                          width: `${cat.percentage}%`,
                          transitionDelay: `${idx * 50 + 200}ms`
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Transaction count */}
                  <p className="text-xs text-muted-foreground mt-1">
                    {cat.count} {cat.count === 1 ? 'transazione' : 'transazioni'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
