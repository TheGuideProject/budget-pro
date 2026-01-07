import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/types';
import { classifyExpense, UnifiedExpenseType } from '@/utils/expenseClassification';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--accent))',
  'hsl(210, 70%, 60%)',
  'hsl(280, 70%, 60%)',
  'hsl(30, 70%, 60%)',
];

// Labels per i tipi unificati di spesa
const unifiedTypeLabels: Record<UnifiedExpenseType, string> = {
  variable: 'Variabile',
  fixed_loan: 'Rate Prestiti',
  fixed_sub: 'Abbonamenti',
  utility_bill: 'Bollette',
  credit_card: 'Carta Credito',
};

interface BudgetPieChartProps {
  expenses: Expense[];
  title?: string;
}

export function BudgetPieChart({ expenses, title = 'Spese per Tipo' }: BudgetPieChartProps) {
  const data = useMemo(() => {
    const grouped = expenses.reduce((acc, exp) => {
      const unifiedType = classifyExpense(exp);
      acc[unifiedType] = (acc[unifiedType] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([type, amount]) => ({
        name: unifiedTypeLabels[type as UnifiedExpenseType] || type,
        value: amount,
        type,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (expenses.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[260px]">
          <p className="text-muted-foreground text-sm">Nessuna spesa da visualizzare</p>
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
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
              formatter={(value) => <span className="text-foreground text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
