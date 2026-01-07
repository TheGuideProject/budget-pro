import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Briefcase, PiggyBank, Calendar, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudgetStore } from '@/store/budgetStore';
import { subMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DebugPanel } from '@/components/debug/DebugPanel';

export function WhatIfSimulator() {
  const { settings, defaultSettings } = useFinancialSettings();
  const { expenses, invoices } = useBudgetStore();

  // Current values
  const currentDailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;
  const currentPension = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  const currentPaymentDelay = settings?.payment_delay_days ?? defaultSettings.payment_delay_days;

  // Simulated values
  const [simDailyRate, setSimDailyRate] = useState(currentDailyRate);
  const [simPension, setSimPension] = useState(currentPension);
  const [simPaymentDelay, setSimPaymentDelay] = useState(currentPaymentDelay);

  // Calculate average monthly expenses from last 12 months
  const { monthlyExpenses, expenseBreakdown, monthlyHistory } = useMemo(() => {
    const now = new Date();
    const twelveMonthsAgo = subMonths(now, 12);
    
    let fixedTotal = 0;
    let variableTotal = 0;
    let billsTotal = 0;
    let monthsWithData = 0;

    // Group expenses by month for history
    const monthlyData = new Map<string, { fixed: number; variable: number; bills: number }>();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      monthlyData.set(monthKey, { fixed: 0, variable: 0, bills: 0 });
    }

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      if (expenseDate >= twelveMonthsAgo && expenseDate <= now) {
        const monthKey = format(expenseDate, 'yyyy-MM');
        const monthData = monthlyData.get(monthKey);
        
        if (expense.category === 'fissa' || expense.category === 'casa') {
          fixedTotal += Number(expense.amount) || 0;
          if (monthData) monthData.fixed += Number(expense.amount) || 0;
        } else if (['variabile', 'cibo', 'svago', 'varie', 'trasporti', 'salute', 'animali', 'viaggi'].includes(expense.category)) {
          variableTotal += Number(expense.amount) || 0;
          if (monthData) monthData.variable += Number(expense.amount) || 0;
        } else if (expense.category === 'abbonamenti' || expense.billType) {
          billsTotal += Number(expense.amount) || 0;
          if (monthData) monthData.bills += Number(expense.amount) || 0;
        }
      }
    });

    // Count months with actual data
    monthlyData.forEach((data) => {
      if (data.fixed + data.variable + data.bills > 0) monthsWithData++;
    });

    const divisor = Math.max(monthsWithData, 1);

    // Convert to array for chart
    const history = Array.from(monthlyData.entries()).map(([key, data]) => ({
      month: format(new Date(key + '-01'), 'MMM', { locale: it }),
      fullMonth: key,
      fixed: data.fixed,
      variable: data.variable,
      bills: data.bills,
      total: data.fixed + data.variable + data.bills,
    }));

    return {
      monthlyExpenses: {
        fixed: fixedTotal / divisor,
        variable: variableTotal / divisor,
        bills: billsTotal / divisor,
        total: (fixedTotal + variableTotal + billsTotal) / divisor,
      },
      expenseBreakdown: [
        { name: 'Fisse', value: fixedTotal / divisor, color: 'hsl(var(--primary))' },
        { name: 'Variabili', value: variableTotal / divisor, color: 'hsl(var(--chart-2))' },
        { name: 'Bollette', value: billsTotal / divisor, color: 'hsl(var(--chart-3))' },
      ],
      monthlyHistory: history,
    };
  }, [expenses]);

  // Current scenario
  const currentScenario = useMemo(() => {
    const totalExpenses = monthlyExpenses.total + currentPension;
    const workDaysNeeded = currentDailyRate > 0 ? Math.ceil(totalExpenses / currentDailyRate) : 0;
    const monthlyIncome = workDaysNeeded * currentDailyRate;
    const surplus = monthlyIncome - totalExpenses;
    
    return {
      totalExpenses,
      workDaysNeeded,
      monthlyIncome,
      surplus,
      annualSurplus: surplus * 12,
    };
  }, [monthlyExpenses, currentDailyRate, currentPension]);

  // Simulated scenario
  const simulatedScenario = useMemo(() => {
    const totalExpenses = monthlyExpenses.total + simPension;
    const workDaysNeeded = simDailyRate > 0 ? Math.ceil(totalExpenses / simDailyRate) : 0;
    const monthlyIncome = workDaysNeeded * simDailyRate;
    const surplus = monthlyIncome - totalExpenses;
    
    return {
      totalExpenses,
      workDaysNeeded,
      monthlyIncome,
      surplus,
      annualSurplus: surplus * 12,
    };
  }, [monthlyExpenses, simDailyRate, simPension]);

  // Comparison data for bar chart
  const comparisonData = useMemo(() => [
    { name: 'Giorni Lavoro', attuale: currentScenario.workDaysNeeded, simulato: simulatedScenario.workDaysNeeded },
  ], [currentScenario, simulatedScenario]);

  // 12 month projection with simulated values
  const projectionData = useMemo(() => {
    const now = new Date();
    const data = [];
    
    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(now, 11 - i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const historyMonth = monthlyHistory.find(h => h.fullMonth === monthKey);
      
      const actualExpenses = historyMonth ? historyMonth.total : 0;
      const projectedWithSim = actualExpenses + (simPension - currentPension);
      
      data.push({
        month: format(monthDate, 'MMM', { locale: it }),
        attuale: actualExpenses + currentPension,
        simulato: projectedWithSim + simPension,
      });
    }
    
    return data;
  }, [monthlyHistory, simPension, currentPension]);

  // Differences
  const diff = {
    workDays: simulatedScenario.workDaysNeeded - currentScenario.workDaysNeeded,
    monthlyExpenses: simulatedScenario.totalExpenses - currentScenario.totalExpenses,
    annualSurplus: simulatedScenario.annualSurplus - currentScenario.annualSurplus,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const DiffBadge = ({ value, unit = '', inverse = false }: { value: number; unit?: string; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    
    if (Math.abs(value) < 0.01) {
      return <Badge variant="secondary" className="ml-2"><Minus className="h-3 w-3" /></Badge>;
    }
    
    return (
      <Badge 
        variant={isPositive ? 'default' : 'destructive'} 
        className={`ml-2 ${isPositive ? 'bg-green-600' : ''}`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {value > 0 ? '+' : ''}{typeof value === 'number' && unit === '€' ? formatCurrency(value) : `${value.toFixed(1)}${unit}`}
      </Badge>
    );
  };

  const hasChanges = simDailyRate !== currentDailyRate || simPension !== currentPension || simPaymentDelay !== currentPaymentDelay;

  const chartConfig = {
    attuale: { label: "Attuale", color: "hsl(var(--muted-foreground))" },
    simulato: { label: "Simulato", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Simulatore What-If
          </CardTitle>
          <CardDescription>
            Modifica i parametri per vedere l'impatto sul piano di lavoro in tempo reale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Tariffa Giornaliera
                </Label>
                <span className="text-sm font-mono">{formatCurrency(simDailyRate)}</span>
              </div>
              <Slider
                value={[simDailyRate]}
                onValueChange={([val]) => setSimDailyRate(val)}
                min={200}
                max={1500}
                step={50}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>200 €</span>
                <span className="text-primary font-medium">Attuale: {formatCurrency(currentDailyRate)}</span>
                <span>1.500 €</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Pensione Mensile
                </Label>
                <span className="text-sm font-mono">{formatCurrency(simPension)}</span>
              </div>
              <Slider
                value={[simPension]}
                onValueChange={([val]) => setSimPension(val)}
                min={0}
                max={2000}
                step={50}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 €</span>
                <span className="text-primary font-medium">Attuale: {formatCurrency(currentPension)}</span>
                <span>2.000 €</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Ritardo Incasso
                </Label>
                <span className="text-sm font-mono">{simPaymentDelay} giorni</span>
              </div>
              <Slider
                value={[simPaymentDelay]}
                onValueChange={([val]) => setSimPaymentDelay(val)}
                min={0}
                max={120}
                step={15}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 gg</span>
                <span className="text-primary font-medium">Attuale: {currentPaymentDelay} gg</span>
                <span>120 gg</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Work Days Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Confronto Giorni Lavoro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip 
                    formatter={(value) => `${value} giorni`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="attuale" fill="hsl(var(--muted-foreground))" name="Attuale" radius={4} />
                  <Bar dataKey="simulato" fill="hsl(var(--primary))" name="Simulato" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-muted-foreground" />
                <span>Attuale: {currentScenario.workDaysNeeded} gg</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Simulato: {simulatedScenario.workDaysNeeded} gg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Expense Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Composizione Spese Medie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              {expenseBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 12 Month Projection Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Storico e Proiezione 12 Mesi</CardTitle>
          <CardDescription>Andamento spese mensili (inclusa pensione)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="attuale" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="simulato" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  strokeDasharray={hasChanges ? "5 5" : "0"}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel */}
      <DebugPanel
        title="What-If Simulator"
        hookName="useMemo() su expenses + settings"
        calculation={`monthlyExpenses = calcolo media 12 mesi per categoria
totalExpenses = monthlyExpenses.total + pensionAmount
workDaysNeeded = ceil(totalExpenses / dailyRate)
surplus = monthlyIncome - totalExpenses`}
        values={[
          { label: 'Spese Fisse Media', value: monthlyExpenses.fixed },
          { label: 'Spese Variabili Media', value: monthlyExpenses.variable },
          { label: 'Bollette Media', value: monthlyExpenses.bills },
          { label: 'Totale Spese Media', value: monthlyExpenses.total },
          { label: '--- Scenario Attuale ---', value: '', isRaw: true },
          { label: 'Tariffa Giornaliera', value: currentDailyRate },
          { label: 'Pensione', value: currentPension },
          { label: 'Giorni Necessari', value: currentScenario.workDaysNeeded },
          { label: 'Surplus Annuale', value: currentScenario.annualSurplus },
          { label: '--- Scenario Simulato ---', value: '', isRaw: true },
          { label: 'Tariffa Simulata', value: simDailyRate },
          { label: 'Pensione Simulata', value: simPension },
          { label: 'Giorni Necessari (sim)', value: simulatedScenario.workDaysNeeded },
          { label: 'Surplus Annuale (sim)', value: simulatedScenario.annualSurplus },
        ]}
        dataSource="Supabase: expenses + user_financial_settings via useBudgetStore()"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={hasChanges && diff.workDays !== 0 ? 'border-primary' : ''}>
          <CardContent className="pt-6 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Giorni Lavoro/Mese</p>
            <p className="text-3xl font-bold">{simulatedScenario.workDaysNeeded}</p>
            {hasChanges && diff.workDays !== 0 && (
              <DiffBadge value={diff.workDays} unit=" gg" inverse />
            )}
          </CardContent>
        </Card>

        <Card className={hasChanges && diff.monthlyExpenses !== 0 ? 'border-primary' : ''}>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Spese Mensili</p>
            <p className="text-3xl font-bold">{formatCurrency(simulatedScenario.totalExpenses)}</p>
            {hasChanges && diff.monthlyExpenses !== 0 && (
              <DiffBadge value={diff.monthlyExpenses} unit="€" inverse />
            )}
          </CardContent>
        </Card>

        <Card className={hasChanges && diff.annualSurplus !== 0 ? 'border-primary' : ''}>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Surplus Annuale</p>
            <p className={`text-3xl font-bold ${simulatedScenario.annualSurplus >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(simulatedScenario.annualSurplus)}
            </p>
            {hasChanges && diff.annualSurplus !== 0 && (
              <DiffBadge value={diff.annualSurplus} unit="€" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key insights */}
      {hasChanges && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              📊 Impatto delle modifiche
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diff.workDays < 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-700 dark:text-green-400">
                  <TrendingDown className="h-5 w-5" />
                  <span>Risparmierai <strong>{Math.abs(diff.workDays)} giorni</strong> di lavoro al mese</span>
                </div>
              )}
              {diff.workDays > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-amber-700 dark:text-amber-400">
                  <TrendingUp className="h-5 w-5" />
                  <span>Dovrai lavorare <strong>{diff.workDays} giorni in più</strong> al mese</span>
                </div>
              )}
              {diff.annualSurplus > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-700 dark:text-green-400">
                  <TrendingUp className="h-5 w-5" />
                  <span>Guadagnerai <strong>{formatCurrency(diff.annualSurplus)}</strong> in più all'anno</span>
                </div>
              )}
              {diff.annualSurplus < 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-amber-700 dark:text-amber-400">
                  <TrendingDown className="h-5 w-5" />
                  <span>Perderai <strong>{formatCurrency(Math.abs(diff.annualSurplus))}</strong> all'anno</span>
                </div>
              )}
              {simDailyRate > currentDailyRate && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-blue-700 dark:text-blue-400">
                  <Briefcase className="h-5 w-5" />
                  <span>Aumentando la tariffa del {((simDailyRate / currentDailyRate - 1) * 100).toFixed(0)}% lavorerai meno giorni</span>
                </div>
              )}
              {simPension !== currentPension && (
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg text-purple-700 dark:text-purple-400">
                  <PiggyBank className="h-5 w-5" />
                  <span>
                    {simPension > currentPension 
                      ? `Aumentando la pensione di ${formatCurrency(simPension - currentPension)}/mese accumulerai di più`
                      : `Riducendo la pensione risparmierai ${formatCurrency(currentPension - simPension)}/mese ma accumulerai meno`
                    }
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
