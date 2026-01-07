import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Flame, Droplets, Calculator, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useConsumptionAnalysis, ProviderConsumptionSummary } from '@/hooks/useConsumptionAnalysis';
import { format, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';

const billTypeConfig: Record<string, { icon: React.ReactNode; label: string; colorClass: string }> = {
  luce: { icon: <Zap className="h-4 w-4" />, label: 'Luce', colorClass: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700' },
  gas: { icon: <Flame className="h-4 w-4" />, label: 'Gas', colorClass: 'bg-orange-500/10 border-orange-500/30 text-orange-700' },
  acqua: { icon: <Droplets className="h-4 w-4" />, label: 'Acqua', colorClass: 'bg-blue-500/10 border-blue-500/30 text-blue-700' },
};

interface ForecastCardProps {
  summary: ProviderConsumptionSummary;
  previousYearSameMonth?: number;
}

function ForecastCard({ summary, previousYearSameMonth }: ForecastCardProps) {
  const config = billTypeConfig[summary.billType] || billTypeConfig.luce;
  const nextBillDate = addMonths(new Date(), 1);
  
  // Compare estimated with same month last year
  const vsLastYear = previousYearSameMonth && previousYearSameMonth > 0
    ? ((summary.estimatedNextBill - previousYearSameMonth) / previousYearSameMonth) * 100
    : 0;
  
  return (
    <div className={`p-4 rounded-lg border ${config.colorClass}`}>
      <div className="flex items-center gap-2 mb-3">
        {config.icon}
        <span className="font-medium">{config.label}</span>
        <span className="text-xs opacity-70">({summary.provider})</span>
      </div>
      
      <div className="space-y-3">
        {/* Estimated next bill */}
        <div>
          <p className="text-xs opacity-70 mb-1">Stima prossima bolletta</p>
          <p className="text-2xl font-bold">€{summary.estimatedNextBill.toFixed(2)}</p>
        </div>
        
        {/* Expected consumption */}
        <div className="flex justify-between text-sm">
          <span className="opacity-70">Consumo stimato</span>
          <span className="font-medium">
            {summary.estimatedMonthlyConsumption.toFixed(1)} {summary.consumptionUnit}
          </span>
        </div>
        
        {/* Average bill */}
        <div className="flex justify-between text-sm">
          <span className="opacity-70">Media bollette</span>
          <span className="font-medium">€{summary.avgBillAmount.toFixed(2)}</span>
        </div>
        
        {/* Comparison with last year same month */}
        {previousYearSameMonth && previousYearSameMonth > 0 && (
          <div className="flex justify-between items-center text-sm pt-2 border-t border-current/10">
            <span className="opacity-70">vs stesso mese {new Date().getFullYear() - 1}</span>
            <Badge variant={vsLastYear > 0 ? 'destructive' : 'secondary'} className="text-xs">
              {vsLastYear > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {vsLastYear > 0 ? '+' : ''}{vsLastYear.toFixed(0)}%
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConsumptionForecast() {
  const { summaryByProvider, monthlyData } = useConsumptionAnalysis();
  
  // Get previous year same month data for each provider
  const previousYearData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const previousYear = new Date().getFullYear() - 1;
    
    const data: Record<string, number> = {};
    
    monthlyData.forEach(d => {
      if (d.year === previousYear && d.monthDate.getMonth() === currentMonth) {
        const key = `${d.billType}-${d.provider}`;
        data[key] = (data[key] || 0) + d.amount;
      }
    });
    
    return data;
  }, [monthlyData]);

  // Calculate annual projection
  const annualProjection = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const monthsRemaining = 12 - currentMonth;
    
    let currentSpent = 0;
    let projectedRemaining = 0;
    
    summaryByProvider.forEach(summary => {
      currentSpent += summary.currentYearTotal;
      projectedRemaining += summary.estimatedNextBill * monthsRemaining;
    });
    
    return {
      currentSpent,
      projectedRemaining,
      totalProjected: currentSpent + projectedRemaining,
      monthsRemaining,
    };
  }, [summaryByProvider]);

  if (summaryByProvider.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Previsionale Bollette
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Carica bollette con dati sui consumi per generare previsioni.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Previsionale Bollette
          </CardTitle>
          <p className="text-xs text-muted-foreground">Basato sui dati di consumo (kWh, Smc, m³)</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Forecast Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaryByProvider.map((summary) => (
            <ForecastCard 
              key={`${summary.billType}-${summary.provider}`} 
              summary={summary}
              previousYearSameMonth={previousYearData[`${summary.billType}-${summary.provider}`]}
            />
          ))}
        </div>
        
        {/* Annual Projection */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Proiezione Annuale {new Date().getFullYear()}</h4>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Speso finora</p>
              <p className="text-lg font-bold">€{annualProjection.currentSpent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stima restante</p>
              <p className="text-lg font-bold">€{annualProjection.projectedRemaining.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mesi restanti</p>
              <p className="text-lg font-bold">{annualProjection.monthsRemaining}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Totale previsto</p>
              <p className="text-xl font-bold text-primary">€{annualProjection.totalProjected.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
