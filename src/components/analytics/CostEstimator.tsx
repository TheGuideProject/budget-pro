import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { ExpensesSummary } from '@/hooks/useExpensesSummary';
import { Calculator, TrendingUp, Save, AlertCircle, Wallet, CreditCard, Users, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostEstimatorProps {
  actualFixedCosts: number;
  actualVariableCosts: number;
  actualBillsCosts: number;
  monthsOfData: number;
  expensesSummary?: ExpensesSummary;
}

export function CostEstimator({ 
  actualFixedCosts, 
  actualVariableCosts, 
  actualBillsCosts,
  monthsOfData,
  expensesSummary 
}: CostEstimatorProps) {
  const { settings, upsertSettings, defaultSettings } = useFinancialSettings();
  
  const [estimatedFixed, setEstimatedFixed] = useState<number>(0);
  const [estimatedVariable, setEstimatedVariable] = useState<number>(0);
  const [estimatedBills, setEstimatedBills] = useState<number>(0);
  const [useManualEstimates, setUseManualEstimates] = useState<boolean>(true);
  
  // Initial balance state
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [initialBalanceDate, setInitialBalanceDate] = useState<string>('');
  const [useCustomInitialBalance, setUseCustomInitialBalance] = useState<boolean>(false);
  
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setEstimatedFixed(settings.estimated_fixed_costs ?? 0);
      setEstimatedVariable(settings.estimated_variable_costs ?? 0);
      setEstimatedBills(settings.estimated_bills_costs ?? 0);
      setUseManualEstimates(settings.use_manual_estimates ?? true);
      setInitialBalance(settings.initial_balance ?? 0);
      setInitialBalanceDate(settings.initial_balance_date ?? '');
      setUseCustomInitialBalance(settings.use_custom_initial_balance ?? false);
    }
  }, [settings]);

  const handleSave = () => {
    upsertSettings.mutate({
      estimated_fixed_costs: estimatedFixed,
      estimated_variable_costs: estimatedVariable,
      estimated_bills_costs: estimatedBills,
      use_manual_estimates: useManualEstimates,
      initial_balance: initialBalance,
      initial_balance_date: initialBalanceDate || null,
      use_custom_initial_balance: useCustomInitialBalance,
    });
    setHasChanges(false);
  };

  const handleChange = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(Number(e.target.value) || 0);
    setHasChanges(true);
  };

  const totalEstimated = estimatedFixed + estimatedVariable + estimatedBills;
  const totalActual = actualFixedCosts + actualVariableCosts + actualBillsCosts;
  
  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;
  const pensionMonthly = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  
  const activeCosts = useManualEstimates ? totalEstimated : totalActual;
  const totalWithPension = activeCosts + pensionMonthly;
  const workDaysNeeded = dailyRate > 0 ? Math.ceil(totalWithPension / dailyRate) : 0;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

  const DataBadge = () => {
    if (monthsOfData === 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Nessun dato</Badge>;
    }
    if (monthsOfData < 3) {
      return <Badge variant="secondary" className="gap-1">Dati: {monthsOfData} mesi</Badge>;
    }
    return <Badge variant="default" className="gap-1 bg-green-600">Dati: {monthsOfData}+ mesi</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Initial Balance Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Saldo Iniziale Conto
          </CardTitle>
          <CardDescription>
            Imposta il saldo del tuo conto corrente per calcoli più precisi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle for custom initial balance */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="use-initial-balance" className="text-base font-medium">
                Usa saldo personalizzato
              </Label>
              <p className="text-sm text-muted-foreground">
                {useCustomInitialBalance 
                  ? "Il carryover partirà dal saldo che inserisci" 
                  : "Il carryover viene calcolato automaticamente dai dati"}
              </p>
            </div>
            <Switch
              id="use-initial-balance"
              checked={useCustomInitialBalance}
              onCheckedChange={(checked) => {
                setUseCustomInitialBalance(checked);
                setHasChanges(true);
              }}
            />
          </div>

          {/* Initial Balance Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial-balance" className="text-sm font-medium">
                Saldo Conto Corrente
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="initial-balance"
                  type="number"
                  value={initialBalance || ''}
                  onChange={handleChange(setInitialBalance)}
                  className={cn("pl-8", !useCustomInitialBalance && "opacity-50")}
                  disabled={!useCustomInitialBalance}
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Es: il saldo del tuo conto a fine mese
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial-balance-date" className="text-sm font-medium">
                Data di Riferimento
              </Label>
              <Input
                id="initial-balance-date"
                type="date"
                value={initialBalanceDate || ''}
                onChange={(e) => {
                  setInitialBalanceDate(e.target.value);
                  setHasChanges(true);
                }}
                className={cn(!useCustomInitialBalance && "opacity-50")}
                disabled={!useCustomInitialBalance}
              />
              <p className="text-xs text-muted-foreground">
                Data in cui il saldo era quello indicato
              </p>
            </div>
          </div>

          {useCustomInitialBalance && initialBalance !== 0 && (
            <div className={cn(
              "p-3 rounded-lg text-center",
              initialBalance >= 0 ? "bg-green-500/10" : "bg-destructive/10"
            )}>
              <p className="text-sm text-muted-foreground">Saldo di partenza</p>
              <p className={cn(
                "text-xl font-bold",
                initialBalance >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {formatCurrency(initialBalance)}
              </p>
              {initialBalanceDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  al {new Date(initialBalanceDate).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Spese Fisse - Nuovo */}
      {expensesSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-primary" />
              Dettaglio Spese Fisse (Calcolo Intelligente)
            </CardTitle>
            <CardDescription>
              Classificazione automatica di prestiti, trasferimenti e abbonamenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Prestiti */}
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-medium">Rate/Prestiti</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(expensesSummary.monthlyLoans)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expensesSummary.loanSummaries.length} prestiti attivi
                </p>
              </div>
              
              {/* Trasferimenti */}
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">Trasferimenti</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(expensesSummary.monthlyTransfers)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expensesSummary.transferSummaries.length} destinatari
                </p>
              </div>
              
              {/* Abbonamenti */}
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <span className="font-medium">Abbonamenti</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(expensesSummary.monthlySubscriptions)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  mese corrente
                </p>
              </div>
            </div>
            
            {/* Info sulla media variabili */}
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Media Spese Variabili</p>
                  <p className="text-xs text-muted-foreground">
                    Calcolata su {expensesSummary.monthsConsidered} mesi di storico
                    {expensesSummary.isEstimated && " (stima preliminare)"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(expensesSummary.variableMonthlyAverage)}</p>
                  {expensesSummary.isEstimated && (
                    <Badge variant="secondary" className="text-xs">stima</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Estimator Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Stima Spese Mensili
              </CardTitle>
              <CardDescription>
                Inserisci le tue stime o usa i dati effettivi
              </CardDescription>
            </div>
            <DataBadge />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="use-estimates" className="text-base font-medium">
                Usa stime manuali
              </Label>
              <p className="text-sm text-muted-foreground">
                {useManualEstimates 
                  ? "I calcoli useranno le tue stime inserite sotto" 
                  : "I calcoli useranno i dati effettivi (classificazione intelligente)"}
              </p>
            </div>
            <Switch
              id="use-estimates"
              checked={useManualEstimates}
              onCheckedChange={(checked) => {
                setUseManualEstimates(checked);
                setHasChanges(true);
              }}
            />
          </div>

          {/* Cost Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fixed Costs */}
            <div className="space-y-2">
              <Label htmlFor="fixed-costs" className="text-sm font-medium">
                Costi Fissi
                <span className="text-xs text-muted-foreground ml-1">(rate, trasferimenti...)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="fixed-costs"
                  type="number"
                  value={estimatedFixed || ''}
                  onChange={handleChange(setEstimatedFixed)}
                  className={cn("pl-8", !useManualEstimates && "opacity-50")}
                  disabled={!useManualEstimates}
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Effettivo: {formatCurrency(actualFixedCosts)}
              </p>
            </div>

            {/* Variable Costs */}
            <div className="space-y-2">
              <Label htmlFor="variable-costs" className="text-sm font-medium">
                Costi Variabili
                <span className="text-xs text-muted-foreground ml-1">(spesa, svago...)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="variable-costs"
                  type="number"
                  value={estimatedVariable || ''}
                  onChange={handleChange(setEstimatedVariable)}
                  className={cn("pl-8", !useManualEstimates && "opacity-50")}
                  disabled={!useManualEstimates}
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Media ({expensesSummary?.monthsConsidered || 0} mesi): {formatCurrency(actualVariableCosts)}
              </p>
            </div>

            {/* Bills */}
            <div className="space-y-2">
              <Label htmlFor="bills-costs" className="text-sm font-medium">
                Bollette
                <span className="text-xs text-muted-foreground ml-1">(luce, gas...)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="bills-costs"
                  type="number"
                  value={estimatedBills || ''}
                  onChange={handleChange(setEstimatedBills)}
                  className={cn("pl-8", !useManualEstimates && "opacity-50")}
                  disabled={!useManualEstimates}
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Effettivo: {formatCurrency(actualBillsCosts)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground">Totale Spese</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(activeCosts)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {useManualEstimates ? 'stima manuale' : 'calcolo intelligente'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/10 text-center">
              <p className="text-sm text-muted-foreground">+ Pensione</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalWithPension)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                spese + {formatCurrency(pensionMonthly)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-accent/10 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent-foreground" />
                <p className="text-sm text-muted-foreground">Giorni Lavoro</p>
              </div>
              <p className="text-2xl font-bold">
                {workDaysNeeded}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                @ {formatCurrency(dailyRate)}/giorno
              </p>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              className="w-full"
              disabled={upsertSettings.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {upsertSettings.isPending ? 'Salvataggio...' : 'Salva Impostazioni'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
