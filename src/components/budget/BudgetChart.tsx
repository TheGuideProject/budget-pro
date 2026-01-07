import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetMonthSummary } from '@/types';

interface BudgetChartProps {
  summaries: BudgetMonthSummary[];
}

export function BudgetChart({ summaries }: BudgetChartProps) {
  const chartData = useMemo(() => {
    return summaries.map(summary => ({
      name: format(summary.month, 'MMM yy', { locale: it }),
      previsto: Math.round(summary.forecastSpendable), // Sempre previsionale per linea uniforme
      reale: summary.isCurrentMonth ? Math.round(summary.realSpendable) : null, // Solo mese corrente
      entrate: Math.round(summary.totalIncome),
      uscite: Math.round(summary.totalExpenses),
    }));
  }, [summaries]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento Saldo Previsto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-muted-foreground text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value: number | null, name: string) => {
                  if (value === null) return ['-', name];
                  return [formatCurrency(value), name];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="previsto" 
                name="Previsione"
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="reale" 
                name="Reale (oggi)"
                stroke="hsl(var(--warning))" 
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--warning))', r: 6 }}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="entrate" 
                name="Entrate"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="uscite" 
                name="Uscite"
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
