import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { CreditCard, Users, Tv, Zap, TrendingUp, Calendar, Wallet, Info } from 'lucide-react';
import { Expense } from '@/types';
import { useUnifiedExpenses } from '@/hooks/useUnifiedExpenses';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

interface SpeseFisseChartsProps {
  expenses: Expense[];
}

// Colori vivaci e distinguibili
const COLORS = {
  loan: '#3B82F6',        // Blu vivace
  transfer: '#10B981',    // Verde smeraldo  
  subscription: '#8B5CF6', // Viola
  utility: '#F59E0B',     // Arancione
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function SpeseFisseCharts({ expenses }: SpeseFisseChartsProps) {
  // Usa useUnifiedExpenses per dati coerenti con tutto il sito
  const unified = useUnifiedExpenses(expenses);
  
  const {
    loanSummaries,
    transferSummaries,
    monthlyLoans: totalLoans,
    monthlySubs: totalSubscriptions,
    totalMonthlyTransfers: totalTransfers,
    totalMonthlyFixed: estimatedMonthly,
    monthlyBillsEstimate,
    byType,
  } = unified;
  
  // Pie chart data - NOTA: i trasferimenti ora sono VARIABILI, non fissi
  // Ma li mostriamo comunque nel riepilogo per informazione
  const pieData = useMemo(() => {
    const data = [];
    if (totalLoans > 0) {
      data.push({ name: 'Rate Prestiti', value: totalLoans, color: COLORS.loan });
    }
    // Trasferimenti ora sono VARIABILI, quindi li mostriamo ma con nota
    if (totalTransfers > 0) {
      data.push({ name: 'Trasferimenti (variabili)', value: totalTransfers, color: COLORS.transfer });
    }
    if (totalSubscriptions > 0) {
      data.push({ name: 'Abbonamenti', value: totalSubscriptions, color: COLORS.subscription });
    }
    if (monthlyBillsEstimate > 0) {
      data.push({ name: 'Bollette', value: monthlyBillsEstimate, color: COLORS.utility });
    }
    return data;
  }, [totalLoans, totalTransfers, totalSubscriptions, monthlyBillsEstimate]);

  // Monthly trend data (last 6 months) - usa classificazione unificata
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthExpenses = expenses.filter(exp => {
        const date = new Date(exp.date);
        return date >= monthStart && date <= monthEnd;
      });
      
      let loans = 0, transfers = 0, subs = 0, utilities = 0;
      
      monthExpenses.forEach(exp => {
        // Usa la stessa logica di classificazione
        const desc = (exp.description || '').toLowerCase();
        
        // Prestiti
        if (desc.match(/rata\s+\d+\/\d+|prestito|mutuo|finanziamento|younited/i)) {
          loans += exp.amount;
        }
        // Trasferimenti - ora sono variabili ma li mostriamo per trend storico
        else if (desc.match(/trasferimento.*mam|bonifico.*mam|mamy|mamma/i) || exp.isFamilyExpense) {
          transfers += exp.amount;
        }
        // Abbonamenti
        else if (exp.category === 'abbonamenti' || exp.subscriptionType) {
          subs += exp.amount;
        }
        // Bollette
        else if (exp.billType) {
          utilities += exp.amount;
        }
      });
      
      months.push({
        month: format(monthDate, 'MMM', { locale: it }),
        'Rate': loans,
        'Trasferimenti': transfers,
        'Abbonamenti': subs,
        'Bollette': utilities,
        totale: loans + transfers + subs + utilities,
      });
    }
    
    return months;
  }, [expenses]);

  // Numero abbonamenti per visualizzazione
  const subscriptionsCount = byType.fixed_sub.length;

  return (
    <div className="space-y-6">
      {/* Info Banner - Nuova classificazione */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-sm">Nuova classificazione spese</p>
            <p className="text-xs text-muted-foreground mt-1">
              I <strong>trasferimenti al secondario</strong> sono ora conteggiati come spese <strong>variabili</strong>, 
              non più fisse. Il totale mensile spese fisse include solo rate prestiti e abbonamenti.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Totale Fissi/Mese</p>
                <p className="text-xl font-bold">{formatCurrency(estimatedMonthly)}</p>
                <p className="text-xs text-muted-foreground">rate + abbonamenti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-1/10">
                <CreditCard className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rate Attive</p>
                <p className="text-xl font-bold">{loanSummaries.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalLoans)}/mese</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trasferimenti</p>
                <p className="text-xl font-bold">{transferSummaries.length}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalTransfers)}/mese
                  <Badge variant="outline" className="ml-1 text-[8px] px-1">variabili</Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-3/10">
                <Tv className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Abbonamenti</p>
                <p className="text-xl font-bold">{subscriptionsCount}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalSubscriptions)}/mese</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown del Totale Mensile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dettaglio Totale Mensile: {formatCurrency(estimatedMonthly)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Rate Prestiti */}
            <div className="p-3 rounded-lg border-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" style={{ color: COLORS.loan }} /> 
                  <span style={{ color: COLORS.loan }}>Rate Prestiti</span>
                </span>
                <span className="font-bold text-lg" style={{ color: COLORS.loan }}>{formatCurrency(totalLoans)}</span>
              </div>
              <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                {loanSummaries.map((loan, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{loan.name}</span>
                    <span className="font-medium">{formatCurrency(loan.monthlyAmount)}</span>
                  </div>
                ))}
                {loanSummaries.length === 0 && <span>Nessuna rata attiva</span>}
              </div>
            </div>

            {/* Trasferimenti */}
            <div className="p-3 rounded-lg border-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: COLORS.transfer }} /> 
                  <span style={{ color: COLORS.transfer }}>Trasferimenti</span>
                </span>
                <span className="font-bold text-lg" style={{ color: COLORS.transfer }}>{formatCurrency(totalTransfers)}</span>
              </div>
              <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                {transferSummaries.map((t, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{t.recipient}</span>
                    <span className="font-medium">{formatCurrency(t.monthlyAmount)}</span>
                  </div>
                ))}
                {transferSummaries.length === 0 && <span>Nessun trasferimento</span>}
              </div>
            </div>

            {/* Abbonamenti */}
            <div className="p-3 rounded-lg border-2" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium flex items-center gap-2">
                  <Tv className="h-4 w-4" style={{ color: COLORS.subscription }} /> 
                  <span style={{ color: COLORS.subscription }}>Abbonamenti</span>
                </span>
                <span className="font-bold text-lg" style={{ color: COLORS.subscription }}>{formatCurrency(totalSubscriptions)}</span>
              </div>
              <div className="pl-6 text-sm text-muted-foreground">
                <span>{subscriptionsCount} abbonamenti attivi</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              ⚠️ Bollette escluse dal totale mensile (variano di mese in mese)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Distribuzione Spese Fisse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}: {formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Trend Ultimi 6 Mesi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Rate" stackId="a" fill={COLORS.loan} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Trasferimenti" stackId="a" fill={COLORS.transfer} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Abbonamenti" stackId="a" fill={COLORS.subscription} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Bollette" stackId="a" fill={COLORS.utility} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Timeline */}
      {loanSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Riepilogo Prestiti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loanSummaries.map((loan, index) => (
                <div key={index} className="p-4 rounded-lg border-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold" style={{ color: COLORS.loan }}>{loan.name}</h4>
                    <span className="text-lg font-bold" style={{ color: COLORS.loan }}>
                      {formatCurrency(loan.monthlyAmount)}/mese
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{loan.paidCount}/{loan.totalCount} rate</span>
                      <span className="font-bold" style={{ color: COLORS.loan }}>{loan.completionPercent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ width: `${loan.completionPercent}%`, backgroundColor: COLORS.loan }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                      <p className="text-xs text-green-600">Versato</p>
                      <p className="font-bold text-green-600">{formatCurrency(loan.totalPaid)}</p>
                    </div>
                    <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/30">
                      <p className="text-xs text-orange-500">Da versare</p>
                      <p className="font-bold text-orange-500">{formatCurrency(loan.totalRemaining)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground">Prima rata</p>
                      <p className="font-medium">{format(loan.firstPayment, 'MMM yyyy', { locale: it })}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground">Ultima rata</p>
                      <p className="font-medium">{format(loan.lastPayment, 'MMM yyyy', { locale: it })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
