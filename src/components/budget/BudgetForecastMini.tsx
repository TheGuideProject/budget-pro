import { useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BudgetMonthSummary } from '@/types';

interface BudgetForecastMiniProps {
  summaries: BudgetMonthSummary[];
}

export function BudgetForecastMini({ summaries }: BudgetForecastMiniProps) {
  const data = useMemo(() => {
    return summaries.slice(0, 6).map(s => ({
      month: format(new Date(s.month), 'MMM', { locale: it }).substring(0, 3),
      balance: s.balance,
      income: s.totalIncome,
      expenses: s.totalExpenses,
    }));
  }, [summaries]);

  const trend = useMemo(() => {
    if (summaries.length < 2) return null;
    const currentBalance = summaries[0]?.balance || 0;
    const nextBalance = summaries[1]?.balance || 0;
    const hasNegativeMonth = summaries.slice(0, 3).some(s => s.balance < 0);
    return {
      direction: nextBalance >= currentBalance ? 'up' : 'down',
      hasAlert: hasNegativeMonth,
      nextMonthBalance: nextBalance,
    };
  }, [summaries]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (summaries.length === 0) {
    return (
      <div className="neo-glass p-4 md:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Previsione Budget</h3>
        <div className="flex items-center justify-center min-h-[180px]">
          <p className="text-muted-foreground text-sm">Nessun dato disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="neo-glass p-4 md:p-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-base font-semibold text-foreground">Previsione Budget</h3>
        {trend && (
          <div className="flex items-center gap-2 flex-wrap">
            {trend.hasAlert && (
              <Badge className="gap-1 text-xs bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20">
                <AlertTriangle className="h-3 w-3" />
                Deficit previsto
              </Badge>
            )}
            <Badge className={cn(
              'gap-1 text-xs border',
              trend.direction === 'up' 
                ? 'bg-success/10 text-success border-success/30 hover:bg-success/20' 
                : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatCurrency(trend.nextMonthBalance)}
            </Badge>
          </div>
        )}
      </div>
      
      <div className="h-[180px] md:h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(8px)',
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'income' ? 'Entrate' : name === 'expenses' ? 'Uscite' : 'Bilancio'
              ]}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ 
                fill: 'hsl(var(--primary))', 
                strokeWidth: 2, 
                r: 4,
                stroke: 'hsl(var(--background))'
              }}
              activeDot={{ 
                r: 6, 
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
