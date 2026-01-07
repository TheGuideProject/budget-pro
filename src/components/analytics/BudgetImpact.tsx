import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calculator, Briefcase } from 'lucide-react';
import { useFinancialSettings, calculateWorkDaysNeeded } from '@/hooks/useFinancialSettings';

interface BudgetImpactProps {
  fixedCosts: number;
  variableCosts: number;
  billsCosts: number;
  averageIncome: number;
}

export function BudgetImpact({ fixedCosts, variableCosts, billsCosts, averageIncome }: BudgetImpactProps) {
  const { settings, defaultSettings } = useFinancialSettings();
  
  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;
  const pensionAmount = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  
  const baseCosts = fixedCosts + variableCosts + billsCosts;
  const totalWithPension = baseCosts + pensionAmount;
  
  const daysWithoutPension = calculateWorkDaysNeeded(baseCosts, dailyRate);
  const daysWithPension = calculateWorkDaysNeeded(totalWithPension, dailyRate);
  const extraDaysNeeded = daysWithPension - daysWithoutPension;
  
  const budgetWithoutPension = averageIncome - baseCosts;
  const budgetWithPension = averageIncome - totalWithPension;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Impatto sul Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confronto Budget */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Senza accantonamento</div>
            <div className={`text-xl font-bold ${budgetWithoutPension >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {formatCurrency(budgetWithoutPension)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {daysWithoutPension} giorni lavoro
            </div>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="text-xs text-muted-foreground mb-1">Con accantonamento</div>
            <div className={`text-xl font-bold ${budgetWithPension >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(budgetWithPension)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {daysWithPension} giorni lavoro
            </div>
          </div>
        </div>

        {/* Differenza */}
        {pensionAmount > 0 && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Giorni extra necessari</span>
              </div>
              <span className="font-bold text-primary">+{extraDaysNeeded}</span>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Riduzione disponibilità</span>
              </div>
              <span className="font-medium text-destructive">-{formatCurrency(pensionAmount)}</span>
            </div>
          </div>
        )}

        {/* Messaggio Status */}
        <div className={`p-3 rounded-lg text-sm ${
          budgetWithPension >= 0 
            ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {budgetWithPension >= 0 ? (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>
                Il tuo budget è sostenibile! Ti restano {formatCurrency(budgetWithPension)} al mese.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              <span>
                Attenzione: le spese superano le entrate di {formatCurrency(Math.abs(budgetWithPension))}.
              </span>
            </div>
          )}
        </div>

        {pensionAmount === 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Imposta un accantonamento pensionistico per vedere l'impatto sul budget
          </div>
        )}
      </CardContent>
    </Card>
  );
}
