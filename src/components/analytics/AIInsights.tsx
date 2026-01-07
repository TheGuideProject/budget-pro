import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMonthlySnapshot } from '@/hooks/useMonthlySnapshot';
import { Expense, Invoice } from '@/types';
import { subMonths, format, startOfYear, endOfYear, subYears } from 'date-fns';
import { DebugPanel } from '@/components/debug/DebugPanel';

interface AIInsightsProps {
  expenses: Expense[];
  invoices: Invoice[];
}

interface MonthlyBreakdown {
  month: string;
  fixed: number;
  variable: number;
  bills: number;
  total: number;
}

export function AIInsights({ expenses, invoices }: AIInsightsProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { settings, defaultSettings } = useFinancialSettings();
  const { profile } = useUserProfile();
  
  // Use centralized snapshot for expense data
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const { current: snapshot, averages } = useMonthlySnapshot(expenses, { monthKey: currentMonthKey });

  // Calculate 12 month breakdown
  const { monthlyBreakdown, lastYearIncome, thisYearIncome, projectedAnnualIncome } = useMemo(() => {
    const now = new Date();
    const lastYearStart = startOfYear(subYears(now, 1));
    const lastYearEnd = endOfYear(subYears(now, 1));
    const thisYearStart = startOfYear(now);
    
    // Monthly breakdown (per storico)
    const breakdown: MonthlyBreakdown[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      
      let fixed = 0;
      let variable = 0;
      let bills = 0;

      expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        if (format(expDate, 'yyyy-MM') === monthKey) {
          if (exp.category === 'fissa' || exp.category === 'casa') {
            fixed += Number(exp.amount) || 0;
          } else if (['variabile', 'cibo', 'svago', 'varie', 'trasporti', 'salute', 'animali', 'viaggi'].includes(exp.category)) {
            variable += Number(exp.amount) || 0;
          } else if (exp.category === 'abbonamenti' || exp.billType) {
            bills += Number(exp.amount) || 0;
          }
        }
      });

      breakdown.push({
        month: format(monthDate, 'MMM yyyy'),
        fixed,
        variable,
        bills,
        total: fixed + variable + bills,
      });
    }

    // Last year income
    const lastYearInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= lastYearStart && invDate <= lastYearEnd;
    });
    const lastYearTotal = lastYearInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    // This year income (YTD)
    const thisYearInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= thisYearStart && invDate <= now;
    });
    const thisYearTotal = thisYearInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    
    // Projected annual income
    const monthsElapsed = now.getMonth() + 1;
    const projected = monthsElapsed > 0 ? (thisYearTotal / monthsElapsed) * 12 : 0;

    return {
      monthlyBreakdown: breakdown,
      lastYearIncome: lastYearTotal,
      thisYearIncome: thisYearTotal,
      projectedAnnualIncome: projected,
    };
  }, [expenses, invoices]);

  // Calculate a summary hash to detect significant changes
  const expensesSummaryHash = useMemo(() => {
    const total = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    return `${expenses.length}-${total.toFixed(0)}`;
  }, [expenses]);

  // Reset analysis when expenses change significantly
  useEffect(() => {
    setAnalysis(null);
  }, [expensesSummaryHash]);

  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;
  const pensionAmount = settings?.pension_monthly_amount ?? defaultSettings.pension_monthly_amount;
  
  // Usa i dati dal snapshot centralizzato
  const totalMonthlyFixed = averages.fixedMonthly;
  const variableAverage = averages.variableMonthly;
  const totalMonthly = totalMonthlyFixed + variableAverage + pensionAmount;
  const workDaysNeeded = Math.ceil(totalMonthly / dailyRate);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      // Prepare personal data
      const personalData = profile ? {
        age: profile.age,
        gender: profile.gender,
        yearsWorked: profile.yearsWorked,
        familyStructure: profile.familyStructure,
        familyMembersCount: profile.familyMembersCount,
        housingType: profile.housingType,
        housingSqm: profile.housingSqm,
        heatingType: profile.heatingType,
        hasCar: profile.hasCar,
        carCount: profile.carCount,
        citySize: profile.citySize,
        region: profile.region,
      } : null;

      // Invia dati strutturati e coerenti
      const { data, error } = await supabase.functions.invoke('analyze-finances', {
        body: {
          financialData: {
            // Dati dal calcolo intelligente (snapshot centralizzato)
            fixedCosts: totalMonthlyFixed,
            variableCosts: variableAverage,
            billsCosts: averages.billsMonthly,
            totalMonthly,
            dailyRate,
            workDaysNeeded,
            pensionAmount,
            averageIncome: thisYearIncome / Math.max(new Date().getMonth() + 1, 1),
            lastYearIncome,
            thisYearIncome,
            projectedAnnualIncome,
            // Nuovi campi per breakdown dettagliato
            monthlyLoans: snapshot.fixedExpenses.loans,
            monthlyTransfers: averages.transfersMonthly,
            monthlySubscriptions: snapshot.fixedExpenses.subscriptions,
            monthsOfData: averages.monthsConsidered,
            isEstimated: averages.isEstimated,
          },
          monthlyBreakdown,
          personalData,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      toast.error('Errore nell\'analisi AI');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Consigli AI Personalizzati
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
      {/* Debug Panel */}
        <DebugPanel
          title="Dati Inviati a AI"
          hookName="useMonthlySnapshot()"
          calculation={`totalMonthlyFixed = averages.fixedMonthly
variableAverage = averages.variableMonthly
totalMonthly = totalMonthlyFixed + variableAverage + pensionAmount
workDaysNeeded = ceil(totalMonthly / dailyRate)`}
          values={[
            { label: 'Spese Fisse', value: totalMonthlyFixed },
            { label: 'Media Variabili', value: variableAverage },
            { label: 'Pensione', value: pensionAmount },
            { label: 'Totale Mensile', value: totalMonthly },
            { label: 'Tariffa Giornaliera', value: dailyRate },
            { label: 'Giorni Lavoro Necessari', value: workDaysNeeded },
            { label: 'Reddito Anno Scorso', value: lastYearIncome },
            { label: 'Reddito Quest\'Anno (YTD)', value: thisYearIncome },
            { label: 'Proiezione Annuale', value: projectedAnnualIncome },
            { label: 'Mesi con Dati', value: averages.monthsConsidered, isRaw: true },
            { label: 'Totale Spese DB', value: expenses.length, isRaw: true },
          ]}
          dataSource="Supabase: expenses + invoices + user_financial_settings"
        />

        {!analysis && !isLoading && (
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 mx-auto text-primary/50 mb-3" />
            <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">Dati attuali (classificazione intelligente):</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Spese fisse:</span>
                  <span className="font-semibold ml-1">{formatCurrency(totalMonthlyFixed)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Media variabili:</span>
                  <span className="font-semibold ml-1">{formatCurrency(variableAverage)}</span>
                </div>
              </div>
              <p className="font-semibold text-foreground mt-2">
                Totale stimato mensile: {formatCurrency(totalMonthlyFixed + variableAverage)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {expenses.length} spese registrate • media su {averages.monthsConsidered} mesi
              </p>
            </div>
            <p className="text-muted-foreground mb-2">
              L'AI analizzerà i tuoi dati finanziari e il tuo profilo personale.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {profile?.age || profile?.familyStructure 
                ? "✓ Profilo personale configurato" 
                : "⚠ Configura il tuo profilo per consigli più accurati"}
            </p>
            <Button onClick={fetchAnalysis} className="gap-2">
              <Brain className="h-4 w-4" />
              Chiedi all'AI
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-muted-foreground">Analisi in corso...</p>
            <p className="text-xs text-muted-foreground mt-1">Sto analizzando i tuoi dati finanziari...</p>
          </div>
        )}

        {analysis && !isLoading && (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {analysis}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAnalysis} 
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Aggiorna Analisi
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
