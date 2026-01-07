import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Flame, Droplets, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { useConsumptionAnalysis, ProviderConsumptionSummary } from '@/hooks/useConsumptionAnalysis';
import { BillType } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const billTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  luce: { icon: <Zap className="h-5 w-5" />, label: 'Luce', color: 'text-yellow-500' },
  gas: { icon: <Flame className="h-5 w-5" />, label: 'Gas', color: 'text-orange-500' },
  acqua: { icon: <Droplets className="h-5 w-5" />, label: 'Acqua', color: 'text-blue-500' },
};

function VariationBadge({ variation }: { variation: number }) {
  if (Math.abs(variation) < 1) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Minus className="h-3 w-3 mr-1" />
        = 0%
      </Badge>
    );
  }
  
  if (variation > 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{variation.toFixed(1)}%
      </Badge>
    );
  }
  
  return (
    <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">
      <TrendingDown className="h-3 w-3 mr-1" />
      {variation.toFixed(1)}%
    </Badge>
  );
}

function ProviderCard({ summary }: { summary: ProviderConsumptionSummary }) {
  const config = billTypeConfig[summary.billType] || billTypeConfig.luce;
  
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-3">
        <span className={config.color}>{config.icon}</span>
        <div className="flex-1">
          <h4 className="font-medium">{config.label}</h4>
          <p className="text-xs text-muted-foreground">{summary.provider}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Consumption YTD */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Consumo YTD</span>
          <span className="font-semibold">
            {summary.currentYearConsumption.toFixed(0)} {summary.consumptionUnit}
          </span>
        </div>
        
        {/* Variation vs previous year */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">vs anno prec.</span>
          <VariationBadge variation={summary.consumptionVariation} />
        </div>
        
        {/* Price per unit */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Costo medio</span>
          <span className="text-sm font-medium">
            €{summary.avgPricePerUnit.toFixed(2)}/{summary.consumptionUnit}
          </span>
        </div>
        
        {/* Total spent */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">Speso {new Date().getFullYear()}</span>
          <span className="font-bold text-primary">€{summary.currentYearTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export function ConsumptionTracker() {
  const { summaryByProvider, monthlyData, totalCurrentYear, totalPreviousYear, overallVariation } = useConsumptionAnalysis();
  
  // Prepare chart data - group by month and year for comparison
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    // Group by month number (0-11)
    const monthlyTotals = new Map<number, { currentYear: number; previousYear: number; month: string }>();
    
    monthlyData.forEach(data => {
      const month = data.monthDate.getMonth();
      if (!monthlyTotals.has(month)) {
        monthlyTotals.set(month, {
          currentYear: 0,
          previousYear: 0,
          month: format(new Date(2024, month, 1), 'MMM', { locale: it }),
        });
      }
      
      const entry = monthlyTotals.get(month)!;
      if (data.year === currentYear) {
        entry.currentYear += data.amount;
      } else if (data.year === previousYear) {
        entry.previousYear += data.amount;
      }
    });
    
    // Convert to array and sort by month
    return Array.from(monthlyTotals.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, data]) => data);
  }, [monthlyData]);

  if (summaryByProvider.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Consumi e Confronto Anno Precedente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nessun dato sui consumi disponibile.</p>
            <p className="text-sm mt-2">Carica bollette con dati sui consumi (Luce, Gas, Acqua) per visualizzare l'analisi.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Consumi e Confronto Anno Precedente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaryByProvider.map((summary) => (
            <ProviderCard 
              key={`${summary.billType}-${summary.provider}`} 
              summary={summary} 
            />
          ))}
        </div>
        
        {/* Overall Stats */}
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="flex-1 min-w-[120px]">
            <p className="text-sm text-muted-foreground">Totale {new Date().getFullYear()}</p>
            <p className="text-xl font-bold">€{totalCurrentYear.toFixed(2)}</p>
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="text-sm text-muted-foreground">Totale {new Date().getFullYear() - 1}</p>
            <p className="text-xl font-bold">€{totalPreviousYear.toFixed(2)}</p>
          </div>
          <div className="flex-1 min-w-[120px]">
            <p className="text-sm text-muted-foreground">Variazione</p>
            <VariationBadge variation={overallVariation} />
          </div>
        </div>
        
        {/* Comparison Chart */}
        {chartData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`€${value.toFixed(2)}`, '']}
                  labelFormatter={(label) => `Mese: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="previousYear" 
                  name={`${new Date().getFullYear() - 1}`}
                  fill="hsl(var(--muted-foreground))" 
                  opacity={0.5}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="currentYear" 
                  name={`${new Date().getFullYear()}`}
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
