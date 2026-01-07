import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PiggyBank, TrendingUp, Calendar, Coins } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useFinancialSettings, calculatePensionFund } from '@/hooks/useFinancialSettings';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const RETURN_RATE_OPTIONS = [
  { value: '0.07', label: '7% (Conservativo)' },
  { value: '0.08', label: '8% (Moderato)' },
  { value: '0.10', label: '10% (Media Storica S&P 500)' },
  { value: '0.12', label: '12% (Ottimistico)' },
];

export function PensionSimulator() {
  const { settings, upsertSettings, defaultSettings } = useFinancialSettings();
  const [years, setYears] = useState(20);
  
  const pensionAmount = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  const returnRate = settings?.sp500_return_rate ?? defaultSettings.sp500_return_rate;

  const handlePensionAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    upsertSettings.mutate({ 
      pension_monthly_amount: numValue,
      pension_start_date: settings?.pension_start_date || new Date().toISOString().split('T')[0],
    });
  };

  const handleReturnRateChange = (value: string) => {
    upsertSettings.mutate({ sp500_return_rate: parseFloat(value) });
  };

  const { futureValue, totalContributed, totalReturns } = useMemo(() => {
    return calculatePensionFund(pensionAmount, years, returnRate);
  }, [pensionAmount, years, returnRate]);

  // Generate chart data
  const chartData = useMemo(() => {
    const data = [];
    for (let y = 0; y <= years; y += Math.max(1, Math.floor(years / 20))) {
      const result = calculatePensionFund(pensionAmount, y, returnRate);
      data.push({
        year: y,
        value: Math.round(result.futureValue),
        contributed: Math.round(result.totalContributed),
      });
    }
    // Ensure we always have the final year
    if (data[data.length - 1]?.year !== years) {
      data.push({
        year: years,
        value: Math.round(futureValue),
        contributed: Math.round(totalContributed),
      });
    }
    return data;
  }, [pensionAmount, years, returnRate, futureValue, totalContributed]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartConfig = {
    value: {
      label: "Valore Totale",
      color: "hsl(var(--primary))",
    },
    contributed: {
      label: "Capitale Versato",
      color: "hsl(var(--muted-foreground))",
    },
  };

  return (
    <div className="space-y-4">
      {/* Importo Mensile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Accantonamento Mensile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pension-amount">Quanto vuoi mettere da parte ogni mese?</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">€</span>
              <Input
                id="pension-amount"
                type="number"
                value={pensionAmount}
                onChange={(e) => handlePensionAmountChange(e.target.value)}
                className="max-w-[150px]"
                min={0}
                step={50}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Questo valore rimarrà fisso finché non lo modifichi. I calcoli futuri partiranno da oggi.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Rendimento annuo atteso</Label>
            <Select value={returnRate.toString()} onValueChange={handleReturnRateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETURN_RATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Slider Anni */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Orizzonte Temporale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{years}</div>
            <div className="text-muted-foreground">anni</div>
          </div>
          <Slider
            value={[years]}
            onValueChange={([value]) => setYears(value)}
            min={1}
            max={40}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 anno</span>
            <span>40 anni</span>
          </div>
        </CardContent>
      </Card>

      {/* Risultati */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Proiezione Fondo Pensione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{formatCurrency(futureValue)}</div>
            <div className="text-muted-foreground">Valore stimato tra {years} anni</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-lg font-semibold">{formatCurrency(totalContributed)}</div>
              <div className="text-xs text-muted-foreground">Capitale Versato</div>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg text-center">
              <div className="text-lg font-semibold text-primary">{formatCurrency(totalReturns)}</div>
              <div className="text-xs text-muted-foreground">Rendimenti</div>
            </div>
          </div>

          {pensionAmount > 0 && (
            <div className="h-[200px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorContributed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(v) => `${v}a`}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="contributed"
                    stroke="hsl(var(--muted-foreground))"
                    fillOpacity={1}
                    fill="url(#colorContributed)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )}

          {pensionAmount === 0 && (
            <div className="bg-muted/50 p-4 rounded-lg text-center text-muted-foreground">
              Imposta un importo mensile per vedere la proiezione
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
