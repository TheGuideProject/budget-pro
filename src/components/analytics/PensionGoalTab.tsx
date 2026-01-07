import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { PiggyBank, Target, TrendingUp, Calculator, AlertCircle, CheckCircle, Briefcase } from 'lucide-react';
import { useFinancialSettings, calculatePensionFund } from '@/hooks/useFinancialSettings';
import { useBudgetStore } from '@/store/budgetStore';
import { useWorkPlanForecast } from '@/hooks/useWorkPlanForecast';
import { DebugPanel } from '@/components/debug/DebugPanel';

const chartConfig = {
  contributions: {
    label: 'Contributi',
    color: 'hsl(var(--chart-1))',
  },
  returns: {
    label: 'Rendimenti',
    color: 'hsl(var(--chart-2))',
  },
  target: {
    label: 'Obiettivo',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function PensionGoalTab() {
  const { settings, defaultSettings, upsertSettings } = useFinancialSettings();
  const { expenses, invoices } = useBudgetStore();
  const { pensionGoal, settings: workSettings } = useWorkPlanForecast({ invoices, expenses });

  const [targetAmount, setTargetAmount] = useState(settings?.pension_target_amount ?? 0);
  const [targetYears, setTargetYears] = useState(settings?.pension_target_years ?? 20);
  const [returnRate, setReturnRate] = useState((settings?.sp500_return_rate ?? 0.10) * 100);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setTargetAmount(settings.pension_target_amount ?? 0);
      setTargetYears(settings.pension_target_years ?? 20);
      setReturnRate((settings.sp500_return_rate ?? 0.10) * 100);
    }
  }, [settings]);

  const currentMonthly = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;

  // Calculate required monthly to reach target
  const monthlyRate = (returnRate / 100) / 12;
  const totalMonths = targetYears * 12;
  const requiredMonthly = targetAmount > 0 && totalMonths > 0
    ? targetAmount * (monthlyRate / (Math.pow(1 + monthlyRate, totalMonths) - 1))
    : 0;

  const gapMonthly = Math.max(0, requiredMonthly - currentMonthly);
  const extraWorkDays = dailyRate > 0 ? gapMonthly / dailyRate : 0;

  // Project current contribution
  const { futureValue, totalContributed, totalReturns } = calculatePensionFund(
    currentMonthly,
    targetYears,
    returnRate / 100
  );

  // Progress percentage
  const progressPercent = targetAmount > 0 ? Math.min(100, (futureValue / targetAmount) * 100) : 0;

  // Generate chart data
  const chartData = [];
  for (let year = 0; year <= targetYears; year++) {
    const { futureValue: fv, totalContributed: tc } = calculatePensionFund(
      currentMonthly,
      year,
      returnRate / 100
    );
    chartData.push({
      year,
      contributions: Math.round(tc),
      total: Math.round(fv),
      returns: Math.round(fv - tc),
      target: targetAmount,
    });
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSave = async () => {
    await upsertSettings.mutateAsync({
      pension_target_amount: targetAmount,
      pension_target_years: targetYears,
      sp500_return_rate: returnRate / 100,
    });
    setHasChanges(false);
  };

  const handleChange = (setter: (val: number) => void) => (val: number) => {
    setter(val);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Goal Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Obiettivo Pensionistico
          </CardTitle>
          <CardDescription>
            Definisci il capitale che vuoi raggiungere e l'orizzonte temporale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Capitale Obiettivo (€)</Label>
              <Input
                id="targetAmount"
                type="number"
                value={targetAmount}
                onChange={(e) => handleChange(setTargetAmount)(parseFloat(e.target.value) || 0)}
                placeholder="500000"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Orizzonte Temporale: {targetYears} anni</Label>
              <Slider
                value={[targetYears]}
                onValueChange={([val]) => handleChange(setTargetYears)(val)}
                min={5}
                max={40}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Rendimento Atteso: {returnRate.toFixed(1)}%</Label>
              <Slider
                value={[returnRate]}
                onValueChange={([val]) => handleChange(setReturnRate)(val)}
                min={3}
                max={15}
                step={0.5}
                className="mt-2"
              />
            </div>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={upsertSettings.isPending}>
                Salva Impostazioni
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current vs Required */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Situazione Attuale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Contributo Mensile</span>
              <span className="font-bold">{formatCurrency(currentMonthly)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valore Proiettato</span>
              <span className="font-bold text-green-600">{formatCurrency(futureValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Totale Contributi</span>
              <span>{formatCurrency(totalContributed)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Rendimenti Stimati</span>
              <span className="text-green-600">{formatCurrency(totalReturns)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={gapMonthly > 0 ? 'border-amber-500/50' : 'border-green-500/50'}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Per Raggiungere l'Obiettivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Contributo Richiesto</span>
              <span className="font-bold">{formatCurrency(requiredMonthly)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Differenza Mensile</span>
              <span className={gapMonthly > 0 ? 'font-bold text-amber-600' : 'text-green-600'}>
                {gapMonthly > 0 ? `+${formatCurrency(gapMonthly)}` : 'OK'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Giorni Lavoro Extra/Mese
              </span>
              <span className={extraWorkDays > 0 ? 'font-bold text-amber-600' : 'text-green-600'}>
                {extraWorkDays > 0 ? `+${extraWorkDays.toFixed(1)}` : '0'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Panel */}
      <DebugPanel
        title="Calcoli Pensione"
        hookName="useFinancialSettings() + calculatePensionFund()"
        calculation={`requiredMonthly = targetAmount * (monthlyRate / (pow(1 + monthlyRate, totalMonths) - 1))
gapMonthly = max(0, requiredMonthly - currentMonthly)
extraWorkDays = gapMonthly / dailyRate
futureValue = calculatePensionFund(currentMonthly, targetYears, returnRate)`}
        values={[
          { label: 'Obiettivo', value: targetAmount },
          { label: 'Anni', value: targetYears },
          { label: 'Rendimento %', value: returnRate },
          { label: 'Contributo Attuale', value: currentMonthly },
          { label: 'Contributo Richiesto', value: requiredMonthly },
          { label: 'Gap Mensile', value: gapMonthly },
          { label: 'Giorni Extra/Mese', value: parseFloat(extraWorkDays.toFixed(1)) },
          { label: 'Valore Futuro Proiettato', value: futureValue },
          { label: 'Totale Contributi', value: totalContributed },
          { label: 'Rendimenti Stimati', value: totalReturns },
          { label: 'Progress %', value: parseFloat(progressPercent.toFixed(1)) },
        ]}
        dataSource="Supabase: user_financial_settings via useFinancialSettings()"
      />

      {/* Progress bar */}
      {targetAmount > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Proiezione vs Obiettivo
              </span>
              <span className="text-sm font-medium">
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between mt-2 text-sm">
              <span>{formatCurrency(futureValue)}</span>
              <span className="text-muted-foreground">{formatCurrency(targetAmount)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert based on status */}
      {targetAmount > 0 && (
        gapMonthly > 0 ? (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Obiettivo Non Raggiunto</AlertTitle>
            <AlertDescription>
              Con il contributo attuale di {formatCurrency(currentMonthly)}/mese, raggiungerai {formatCurrency(futureValue)} in {targetYears} anni.
              <br />
              Per raggiungere {formatCurrency(targetAmount)}, devi aumentare il contributo di {formatCurrency(gapMonthly)}/mese, 
              ovvero lavorare <strong>{extraWorkDays.toFixed(1)} giorni in più</strong> ogni mese.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Obiettivo Raggiungibile</AlertTitle>
            <AlertDescription>
              Con il contributo attuale, supererai l'obiettivo di {formatCurrency(targetAmount)} raggiungendo {formatCurrency(futureValue)}.
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Projection chart */}
      <Card>
        <CardHeader>
          <CardTitle>Proiezione Fondo Pensione</CardTitle>
          <CardDescription>
            Crescita stimata con rendimento {returnRate.toFixed(1)}% annuo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="year" 
                tickFormatter={(v) => `${v}a`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <p className="font-medium mb-2">Anno {label}</p>
                        <div className="space-y-1 text-sm">
                          <p>Contributi: {formatCurrency(payload[0]?.payload?.contributions || 0)}</p>
                          <p>Rendimenti: {formatCurrency(payload[0]?.payload?.returns || 0)}</p>
                          <p className="font-bold">Totale: {formatCurrency(payload[0]?.payload?.total || 0)}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {targetAmount > 0 && (
                <ReferenceLine 
                  y={targetAmount} 
                  stroke="hsl(var(--chart-3))" 
                  strokeDasharray="5 5"
                  label={{ value: 'Obiettivo', position: 'right' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="contributions"
                stackId="1"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="returns"
                stackId="1"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Scenario comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confronto Scenari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[currentMonthly, currentMonthly + 200, currentMonthly + 500].map((contribution, idx) => {
              const { futureValue: fv } = calculatePensionFund(contribution, targetYears, returnRate / 100);
              const extraDays = dailyRate > 0 ? (contribution - currentMonthly) / dailyRate : 0;
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg ${idx === 0 ? 'bg-muted' : 'bg-muted/50 border border-dashed'}`}
                >
                  <p className="text-sm text-muted-foreground">
                    {idx === 0 ? 'Attuale' : `+${formatCurrency(contribution - currentMonthly)}/mese`}
                  </p>
                  <p className="text-lg font-bold mt-1">{formatCurrency(contribution)}/mese</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(fv)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {extraDays > 0 ? `+${extraDays.toFixed(1)} giorni/mese` : 'Attuale'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
