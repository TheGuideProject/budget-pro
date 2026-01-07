import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, BarChart, Bar } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Calendar, Briefcase, Info, History, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Invoice, Expense } from '@/types';
import { useWorkPlanForecast } from '@/hooks/useWorkPlanForecast';
import { useMonthlySnapshot } from '@/hooks/useMonthlySnapshot';
import { AIWorkPlanAnalyzer } from './AIWorkPlanAnalyzer';
import { CarryoverDebugPanel } from './CarryoverDebugPanel';
import { CashFlowWaterfall } from './CashFlowWaterfall';
import { MonthlyGoalProgress } from './MonthlyGoalProgress';
import { MonthlyForecastCards } from './MonthlyForecastCards';
import { DebugPanel } from '@/components/debug/DebugPanel';

interface WorkPlanTimelineProps {
  invoices: Invoice[];
  expenses: Expense[];
}

const chartConfig = {
  income: {
    label: 'Incassi (da scadenze)',
    color: 'hsl(var(--chart-2))',
  },
  expenses: {
    label: 'Uscite',
    color: 'hsl(var(--chart-1))',
  },
  estimatedExpenses: {
    label: 'Uscite Stimate',
    color: 'hsl(var(--chart-4))',
  },
  actualExpenses: {
    label: 'Uscite Effettive',
    color: 'hsl(var(--chart-5))',
  },
  balance: {
    label: 'Saldo Cumulativo',
    color: 'hsl(var(--chart-3))',
  },
  historicalWorkDays: {
    label: 'Giorni Lavorati (Anno Scorso)',
    color: 'hsl(var(--chart-4))',
  },
  workDaysNeeded: {
    label: 'Giorni Necessari',
    color: 'hsl(var(--primary))',
  },
  carryover: {
    label: 'Riporto',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function WorkPlanTimeline({ invoices, expenses }: WorkPlanTimelineProps) {
  const [includeDrafts, setIncludeDrafts] = useState(true); // ON by default to show draft invoices
  const [useForecastMode, setUseForecastMode] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  const { workPlan, summary, settings, historicalSummary, startingBalance, realBankingBalance, forecastCarryover } = useWorkPlanForecast({ 
    invoices, 
    expenses,
    includeDrafts,
    useForecastMode,
  });
  
  // Get calculated expense totals from unified snapshot hook
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const { current: snapshot, averages } = useMonthlySnapshot(expenses, { monthKey: currentMonthKey });
  
  // Calculate effective settings based on toggle
  // When useManualEstimates is OFF, use calculated values from snapshot
  const effectiveSettings = useMemo(() => {
    if (settings.useManualEstimates) {
      return settings;
    }
    return {
      ...settings,
      estimatedFixed: averages.fixedMonthly,
      estimatedVariable: averages.variableMonthly,
      estimatedBills: averages.billsMonthly,
    };
  }, [settings, averages]);

  const chartData = useMemo(() => {
    return workPlan.map(month => ({
      month: format(month.month, 'MMM', { locale: it }),
      fullMonth: format(month.month, 'MMMM yyyy', { locale: it }),
      income: Math.round(month.expectedIncome),
      expenses: Math.round(month.totalExpenses),
      estimatedExpenses: Math.round(month.estimatedExpenses),
      actualExpenses: Math.round(month.actualExpenses),
      balance: Math.round(month.cumulativeBalance),
      monthBalance: Math.round(month.balance),
      workDays: month.workDaysNeeded,
      workDaysExtra: month.workDaysExtra,
      historicalWorkDays: month.historicalWorkDays,
      historicalIncome: Math.round(month.historicalIncome),
      historicalYear: month.historicalYear,
      carryover: Math.round(month.carryover || 0),
      cashInFromDue: Math.round(month.cashInFromDue || 0),
      plannedWork: Math.round(month.plannedWork || 0),
      draftIncome: Math.round(month.draftIncome || 0),
      workDaysDifference: month.workDaysDifference,
      status: month.status,
    }));
  }, [workPlan]);

  const showComparison = settings.useManualEstimates && 
    workPlan.some(m => m.actualExpenses > 0);

  const hasHistoricalData = historicalSummary.monthCount > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Starting Balance Card with Mode Toggle */}
      <Card className={startingBalance >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Wallet className={`h-5 w-5 ${startingBalance >= 0 ? 'text-green-600' : 'text-destructive'}`} />
              <div>
                <p className="text-sm text-muted-foreground">
                  {useForecastMode ? 'Saldo Previsionale (inizio mese)' : 'Saldo Bancario Reale'}
                </p>
                <p className={`text-2xl font-bold ${startingBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(startingBalance)}
                </p>
                {useForecastMode && realBankingBalance !== undefined && Math.abs(realBankingBalance - startingBalance) > 100 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Saldo reale: {formatCurrency(realBankingBalance)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Forecast Mode Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border">
                <TrendingUp className="h-4 w-4 text-primary" />
                <Label htmlFor="forecast-mode" className="text-xs cursor-pointer whitespace-nowrap">
                  Previsionale
                </Label>
                <Switch 
                  id="forecast-mode" 
                  checked={useForecastMode}
                  onCheckedChange={setUseForecastMode}
                />
              </div>
              {/* Include Drafts Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border">
                <Switch 
                  id="include-drafts" 
                  checked={includeDrafts}
                  onCheckedChange={setIncludeDrafts}
                />
                <Label htmlFor="include-drafts" className="text-xs text-muted-foreground cursor-pointer">
                  Includi bozze
                </Label>
              </div>
              {/* Debug Panel Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border">
                <Switch 
                  id="debug-panel" 
                  checked={showDebugPanel}
                  onCheckedChange={setShowDebugPanel}
                />
                <Label htmlFor="debug-panel" className="text-xs text-muted-foreground cursor-pointer">
                  Debug
                </Label>
              </div>
            </div>
          </div>
          {useForecastMode && (
            <p className="text-xs text-muted-foreground mt-3 border-t pt-2">
              <strong>Modalità Previsionale:</strong> Il saldo è calcolato in base alle fatture in scadenza (non ricevute), 
              proiettando il flusso di cassa futuro. Ideale per pianificazione.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Debug Panel */}
      {showDebugPanel && (
        <CarryoverDebugPanel 
          invoices={invoices}
          expenses={expenses}
          startingBalance={startingBalance}
          realBankingBalance={realBankingBalance}
          forecastCarryover={forecastCarryover}
        />
      )}

      {/* Cash Flow Waterfall Chart */}
      <CashFlowWaterfall workPlan={workPlan} startingBalance={startingBalance} />

      {/* Historical Year Summary */}
      {hasHistoricalData && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Analisi Anno Precedente ({historicalSummary.referenceYear})
            </CardTitle>
            <CardDescription>
              Basato sulle fatture emesse negli ultimi 12 mesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-background border">
                <Briefcase className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Giorni Lavorati</p>
                <p className="text-2xl font-bold">{historicalSummary.totalWorkDays}</p>
                <p className="text-xs text-muted-foreground">ultimi 12 mesi</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background border">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-muted-foreground">Fatturato Totale</p>
                <p className="text-2xl font-bold">{formatCurrency(historicalSummary.totalIncome)}</p>
                <p className="text-xs text-muted-foreground">ultimi 12 mesi</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background border">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Media Mensile</p>
                <p className="text-2xl font-bold">{historicalSummary.averageWorkDaysPerMonth} gg</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(historicalSummary.totalIncome / 12)}/mese</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background border">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                <p className="text-sm text-muted-foreground">Mese Top</p>
                <p className="text-2xl font-bold">{historicalSummary.topMonthDays} gg</p>
                <p className="text-xs text-muted-foreground">mese {historicalSummary.topMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      <DebugPanel
        title="KPI Work Plan"
        hookName="useWorkPlanForecast() + useMonthlySnapshot()"
        calculation={`summary.averageWorkDays = media giorni necessari su 12 mesi
summary.totalDeficitMonths = mesi con balance < 0
effectiveSettings = settings.useManualEstimates ? settings : averages
startingBalance = useForecastMode ? forecastCarryover : realBankingBalance`}
        values={[
          { label: 'Giorni Medi/Mese', value: summary.averageWorkDays },
          { label: 'Mesi Deficit', value: summary.totalDeficitMonths },
          { label: 'Mesi Surplus', value: summary.totalSurplusMonths },
          { label: 'Saldo Finale 12M', value: summary.finalBalance ?? 0 },
          { label: 'Saldo Iniziale', value: startingBalance },
          { label: 'Saldo Bancario Reale', value: realBankingBalance ?? 0 },
          { label: 'Tariffa Giornaliera', value: settings.dailyRate },
          { label: 'Pensione Mensile', value: settings.pensionMonthly },
          { label: 'Spese Fisse (calc)', value: averages.fixedMonthly, indent: 1 },
          { label: 'Variabili (calc)', value: averages.variableMonthly, indent: 1 },
          { label: 'Bollette (calc)', value: averages.billsMonthly, indent: 1 },
        ]}
        dataSource="Supabase: invoices + expenses via useBudgetStore()"
      />

      {/* KPI Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Giorni Necessari/Mese</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.averageWorkDays.toFixed(1)}</p>
            {hasHistoricalData && (
              <p className="text-xs text-muted-foreground">
                vs {historicalSummary.averageWorkDaysPerMonth} lavorati (anno scorso)
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className={summary.totalDeficitMonths > 0 ? 'bg-destructive/10 border-destructive/50' : 'bg-muted/50'}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Mesi a Rischio</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalDeficitMonths}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Mesi in Surplus</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalSurplusMonths}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Saldo Finale 12 Mesi</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${(summary.finalBalance ?? 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(summary.finalBalance ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for critical months */}
      {summary.criticalMonths.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attenzione: Mesi Critici</AlertTitle>
          <AlertDescription>
            I seguenti mesi potrebbero andare in deficit: <strong>{summary.criticalMonths.join(', ')}</strong>.
            <br />
            <span className="text-sm">
              Considera di anticipare alcuni lavori o ridurre le spese. Buffer consigliato: {formatCurrency(summary.recommendedBuffer)}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Settings info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Parametri di Calcolo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Tariffa: <strong className="text-foreground">{formatCurrency(settings.dailyRate)}/giorno</strong></span>
            <span>Incasso basato su: <strong className="text-foreground">Scadenza fattura (dueDate)</strong></span>
            <span>Pensione: <strong className="text-foreground">{formatCurrency(settings.pensionMonthly)}/mese</strong></span>
            <span>Modalità: <Badge variant={settings.useManualEstimates ? 'secondary' : 'default'}>
              {settings.useManualEstimates ? 'Stime Manuali' : 'Dati Effettivi'}
            </Badge></span>
          </div>
        </CardContent>
      </Card>

      {/* Chart - Cash Flow with Carryover */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow 12 Mesi (con Riporto)</CardTitle>
          <CardDescription>
            Incassi basati su scadenze fattura (dueDate) + saldo cumulativo con carryover
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tickLine={false}
                axisLine={false}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                className="text-xs"
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm space-y-1">
                        <p className="font-medium">{data.fullMonth}</p>
                        <p className="text-sm text-muted-foreground">Riporto da mese prec.: {formatCurrency(data.carryover)}</p>
                        <p className="text-sm text-green-600">Incassi (scadenze): {formatCurrency(data.income)}</p>
                        <p className="text-sm text-red-500">Uscite: {formatCurrency(data.expenses)}</p>
                        <p className="text-sm text-muted-foreground">Saldo mese: {formatCurrency(data.monthBalance)}</p>
                        <p className={`text-sm font-medium ${data.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          Saldo cumulativo: {formatCurrency(data.balance)}
                        </p>
                        {data.plannedWork > 0 && (
                          <p className="text-sm text-primary">Bozze incluse: {formatCurrency(data.plannedWork)}</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="income"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.3}
                name="Incassi"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.3}
                name="Uscite"
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.2}
                strokeWidth={2}
                name="Saldo Cumulativo"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Work days chart */}
      <Card>
        <CardHeader>
          <CardTitle>Confronto Giorni Lavorati: Storico vs Necessari</CardTitle>
          <CardDescription>
            Giorni lavorati stesso mese anno scorso vs giorni necessari per coprire spese + recupero deficit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diff = data.workDaysDifference;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm space-y-1">
                        <p className="font-medium">{data.fullMonth}</p>
                        <p className="text-sm" style={{ color: 'hsl(var(--chart-4))' }}>
                          Lavorati ({data.historicalYear}): <strong>{data.historicalWorkDays} gg</strong>
                        </p>
                        <p className="text-sm text-primary">
                          Necessari (copertura): <strong>{data.workDays} gg</strong>
                        </p>
                        {data.workDaysExtra > 0 && (
                          <p className="text-sm text-amber-600">
                            + {data.workDaysExtra} gg per recupero deficit
                          </p>
                        )}
                        <p className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {diff >= 0 ? `+${diff} giorni surplus` : `${diff} giorni deficit`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="historicalWorkDays" 
                fill="hsl(var(--chart-4))"
                radius={[4, 4, 0, 0]}
                name="Lavorati (Anno Scorso)"
              />
              <Bar 
                dataKey="workDays" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Necessari"
              />
            </BarChart>
          </ChartContainer>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
              <span className="text-muted-foreground">Lavorati (Anno Scorso)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
              <span className="text-muted-foreground">Necessari (Copertura Spese)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Work Plan Analyzer */}
      <AIWorkPlanAnalyzer
        workPlan={workPlan}
        summary={summary}
        historicalSummary={historicalSummary}
        pendingInvoices={invoices}
        settings={effectiveSettings}
        includeDrafts={includeDrafts}
      />

      {/* Modern Monthly Forecast Cards */}
      <MonthlyForecastCards 
        workPlan={workPlan}
        includeDrafts={includeDrafts}
        historicalYear={historicalSummary.referenceYear}
      />
    </div>
  );
}
