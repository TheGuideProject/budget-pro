import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetMonthSummary } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface BudgetBarChartProps {
  summaries: BudgetMonthSummary[];
  title?: string;
}

export function BudgetBarChart({ summaries, title = 'Entrate vs Uscite' }: BudgetBarChartProps) {
  const data = useMemo(() => {
    return summaries.slice(0, 6).map((s) => ({
      month: format(s.month, 'MMM', { locale: it }),
      entrate: Math.round(s.totalIncome),
      uscite: Math.round(s.totalExpenses),
      saldo: Math.round(s.spendable),
    }));
  }, [summaries]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-sm">Nessun dato disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barGap={4}>
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${Math.round(v / 1000)}k`}
              width={40}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'entrate' ? 'Entrate' : name === 'uscite' ? 'Uscite' : 'Saldo'
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => (
                <span className="text-foreground capitalize">{value}</span>
              )}
            />
            <Bar dataKey="entrate" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="uscite" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
