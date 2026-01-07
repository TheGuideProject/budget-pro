import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Briefcase, TrendingUp, Wallet, Receipt } from 'lucide-react';
import { useFinancialSettings, calculateWorkDaysNeeded } from '@/hooks/useFinancialSettings';

interface CostAnalysisProps {
  fixedCosts: number;
  variableCosts: number;
  billsCosts: number;
  pensionAmount: number;
}

export function CostAnalysis({ fixedCosts, variableCosts, billsCosts, pensionAmount }: CostAnalysisProps) {
  const { settings, upsertSettings, defaultSettings } = useFinancialSettings();
  
  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;
  const totalMonthly = fixedCosts + variableCosts + billsCosts + pensionAmount;
  const workDaysNeeded = calculateWorkDaysNeeded(totalMonthly, dailyRate);
  
  // Assuming ~22 working days per month
  const maxWorkDays = 22;
  const workDaysProgress = Math.min((workDaysNeeded / maxWorkDays) * 100, 100);
  
  const handleDailyRateChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    upsertSettings.mutate({ daily_rate: numValue });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Riepilogo Costi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Riepilogo Costi Mensili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Costi Fissi</span>
            <span className="font-medium">{formatCurrency(fixedCosts)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Costi Variabili</span>
            <span className="font-medium">{formatCurrency(variableCosts)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Bollette</span>
            <span className="font-medium">{formatCurrency(billsCosts)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Accantonamento Pensione</span>
            <span className="font-medium text-primary">{formatCurrency(pensionAmount)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-semibold">Totale Mensile</span>
            <span className="font-bold text-lg">{formatCurrency(totalMonthly)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tariffa Giornaliera */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Tariffa Giornaliera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="daily-rate">Quanto fatturi al giorno?</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">€</span>
              <Input
                id="daily-rate"
                type="number"
                value={dailyRate}
                onChange={(e) => handleDailyRateChange(e.target.value)}
                className="max-w-[150px]"
                min={0}
                step={50}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Giorni di Lavoro Necessari */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Giorni di Lavoro Necessari
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{workDaysNeeded}</div>
            <div className="text-muted-foreground">giorni al mese</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso vs 22 giorni lavorativi</span>
              <span>{workDaysNeeded}/22</span>
            </div>
            <Progress 
              value={workDaysProgress} 
              className={workDaysNeeded > maxWorkDays ? '[&>div]:bg-destructive' : ''}
            />
          </div>

          {workDaysNeeded > maxWorkDays && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              ⚠️ Attenzione: servono più giorni di quelli disponibili in un mese!
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span>Entrate necessarie:</span>
              <span className="font-medium">{formatCurrency(totalMonthly)}</span>
            </div>
            <div className="flex justify-between">
              <span>Con tariffa di:</span>
              <span className="font-medium">{formatCurrency(dailyRate)}/giorno</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
