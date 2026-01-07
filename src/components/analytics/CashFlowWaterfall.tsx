import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer } from 'recharts';
import { WorkPlanMonth } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Droplets } from 'lucide-react';

interface CashFlowWaterfallProps {
  workPlan: WorkPlanMonth[];
  startingBalance: number;
}

interface WaterfallDataPoint {
  name: string;
  value: number;
  displayValue: number;
  start: number;
  end: number;
  type: 'income' | 'expense' | 'balance' | 'start';
  isPositive: boolean;
}

export function CashFlowWaterfall({ workPlan, startingBalance }: CashFlowWaterfallProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const chartData = useMemo((): WaterfallDataPoint[] => {
    const data: WaterfallDataPoint[] = [];
    
    // Starting balance bar
    data.push({
      name: 'Inizio',
      value: startingBalance,
      displayValue: startingBalance,
      start: 0,
      end: startingBalance,
      type: 'start',
      isPositive: startingBalance >= 0,
    });

    let runningBalance = startingBalance;

    workPlan.forEach((month) => {
      const monthName = format(month.month, 'MMM', { locale: it });
      
      // Net flow for this month
      const netFlow = month.balance;
      const prevBalance = runningBalance;
      runningBalance = month.cumulativeBalance;

      data.push({
        name: monthName,
        value: netFlow,
        displayValue: Math.abs(netFlow),
        start: netFlow >= 0 ? prevBalance : runningBalance,
        end: netFlow >= 0 ? runningBalance : prevBalance,
        type: netFlow >= 0 ? 'income' : 'expense',
        isPositive: netFlow >= 0,
      });
    });

    // Final balance
    const lastBalance = workPlan.length > 0 ? workPlan[workPlan.length - 1].cumulativeBalance : startingBalance;
    data.push({
      name: 'Finale',
      value: lastBalance,
      displayValue: lastBalance,
      start: 0,
      end: lastBalance,
      type: 'balance',
      isPositive: lastBalance >= 0,
    });

    return data;
  }, [workPlan, startingBalance]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WaterfallDataPoint;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold">{data.name}</p>
          <p className={data.isPositive ? 'text-green-600' : 'text-destructive'}>
            {data.type === 'start' || data.type === 'balance' 
              ? `Saldo: ${formatCurrency(data.value)}`
              : `${data.isPositive ? '+' : '-'}${formatCurrency(Math.abs(data.value))}`
            }
          </p>
          {data.type !== 'start' && data.type !== 'balance' && (
            <p className="text-muted-foreground text-xs">
              Saldo cumulativo: {formatCurrency(data.end)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Find min and max for Y axis
  const allValues = chartData.flatMap(d => [d.start, d.end]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const padding = Math.abs(maxValue - minValue) * 0.1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          Cash Flow Waterfall
        </CardTitle>
        <CardDescription>
          Visualizzazione del flusso di cassa mese per mese
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer 
          config={{
            income: { label: 'Entrata', color: 'hsl(var(--chart-2))' },
            expense: { label: 'Uscita', color: 'hsl(var(--chart-1))' },
          }} 
          className="h-[300px]"
        >
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={[minValue - padding, maxValue + padding]}
              tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            
            {/* Invisible bar from 0 to start (for waterfall effect) */}
            <Bar 
              dataKey="start" 
              stackId="waterfall" 
              fill="transparent"
              radius={0}
            />
            
            {/* Actual value bar */}
            <Bar 
              dataKey={(d: WaterfallDataPoint) => d.type === 'start' || d.type === 'balance' ? d.value : d.displayValue} 
              stackId="waterfall" 
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => {
                let fillColor = 'hsl(var(--chart-2))'; // green for positive
                
                if (entry.type === 'start') {
                  fillColor = entry.isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))';
                } else if (entry.type === 'balance') {
                  fillColor = entry.isPositive ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)';
                } else if (entry.type === 'expense') {
                  fillColor = 'hsl(var(--chart-1))'; // red
                }
                
                return <Cell key={`cell-${index}`} fill={fillColor} />;
              })}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[hsl(var(--chart-2))]" />
            <span>Surplus mese</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[hsl(var(--chart-1))]" />
            <span>Deficit mese</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[hsl(142,76%,36%)]" />
            <span>Saldo finale</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
