import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBudgetStore } from '@/store/budgetStore';
import { useMonthlySnapshot, getSnapshotDebugValues, getAveragesDebugValues } from '@/hooks/useMonthlySnapshot';
import { formatCurrency, formatCount } from '@/lib/formatters';
import { CheckCircle, AlertTriangle, Bug, RefreshCw, Copy, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Debug() {
  const { expenses, invoices } = useBudgetStore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Get snapshots for current month
  const { current: snapshot, averages, getSnapshot } = useMonthlySnapshot(expenses, { monthKey: selectedMonth });
  
  // Generate last 6 months for comparison
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: it }),
      });
    }
    return result;
  }, []);
  
  // Get snapshots for all months
  const monthlySnapshots = useMemo(() => {
    return months.map(m => ({
      ...m,
      snapshot: getSnapshot(m.key),
    }));
  }, [months, getSnapshot]);
  
  // Check for inconsistencies
  const inconsistencies = useMemo(() => {
    const issues: string[] = [];
    
    // Check if expense counts match
    const currentExpenses = snapshot.expenses;
    const totalFromStore = expenses.filter(e => format(new Date(e.date), 'yyyy-MM') === selectedMonth).length;
    
    if (currentExpenses.length !== totalFromStore) {
      issues.push(`Conteggio spese: snapshot (${currentExpenses.length}) ≠ store filtrato (${totalFromStore})`);
    }
    
    // Check if totals add up
    const calculatedTotal = snapshot.fixedExpenses.total + 
                            snapshot.variableExpenses.total + 
                            snapshot.bills.real + 
                            snapshot.transfers.totalAsExpense;
    
    if (Math.abs(calculatedTotal - snapshot.totalExpenses) > 1) {
      issues.push(`Totale spese non corrisponde: calcolato (${formatCurrency(calculatedTotal)}) ≠ totalExpenses (${formatCurrency(snapshot.totalExpenses)})`);
    }
    
    return issues;
  }, [snapshot, expenses, selectedMonth]);

  const copyDebugData = () => {
    const debugData = {
      selectedMonth,
      snapshot: {
        totalExpenses: snapshot.totalExpenses,
        expenseCount: snapshot.expenseCount,
        fixedExpenses: snapshot.fixedExpenses.total,
        variableExpenses: snapshot.variableExpenses.total,
        bills: snapshot.bills.real,
        transfers: snapshot.transfers.totalAsExpense,
        creditCardPending: snapshot.creditCard.pending,
        creditCardBooked: snapshot.creditCard.booked,
      },
      averages: {
        fixedMonthly: averages.fixedMonthly,
        variableMonthly: averages.variableMonthly,
        billsMonthly: averages.billsMonthly,
        transfersMonthly: averages.transfersMonthly,
        totalMonthly: averages.totalMonthly,
        monthsConsidered: averages.monthsConsidered,
      },
      monthlyComparison: monthlySnapshots.map(m => ({
        month: m.key,
        total: m.snapshot.totalExpenses,
        count: m.snapshot.expenseCount,
      })),
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    toast.success('Dati debug copiati');
  };

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="h-6 w-6 text-primary" />
              Debug Console
            </h1>
            <p className="text-muted-foreground">
              Confronta i dati finanziari tra le pagine
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={copyDebugData}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Inconsistencies Alert */}
        {inconsistencies.length > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Incongruenze Rilevate ({inconsistencies.length})</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 mt-2 space-y-1">
                {inconsistencies.map((issue, i) => (
                  <li key={i} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Dati Coerenti</AlertTitle>
            <AlertDescription>
              Nessuna incongruenza rilevata nei calcoli per {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: it })}.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spese Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(snapshot.totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">{formatCount(snapshot.expenseCount)} spese</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spese Fisse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(snapshot.fixedExpenses.total)}</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Rate: {formatCurrency(snapshot.fixedExpenses.loans)}</p>
                <p>Abbonamenti: {formatCurrency(snapshot.fixedExpenses.subscriptions)}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spese Variabili
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(snapshot.variableExpenses.total)}</p>
              <p className="text-xs text-muted-foreground">{formatCount(snapshot.variableExpenses.count)} transazioni</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bollette & Utenze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(snapshot.bills.real)}</p>
              <p className="text-xs text-muted-foreground">{formatCount(snapshot.bills.realCount)} bollette</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trasferimenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Come uscita:</span>
                  <span className="font-medium">{formatCurrency(snapshot.transfers.totalAsExpense)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Come entrata:</span>
                  <span className="font-medium text-green-600">{formatCurrency(snapshot.transfers.totalAsIncome)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatCount(snapshot.transfers.count)} trasferimenti</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Carta di Credito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Pending (prossimo addebito):</span>
                  <span className="font-medium text-amber-600">{formatCurrency(snapshot.creditCard.pending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Addebitate (da mese prec.):</span>
                  <span className="font-medium">{formatCurrency(snapshot.creditCard.booked)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Medie Mensili
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Fisse:</span>
                  <span className="font-medium">{formatCurrency(averages.fixedMonthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Variabili:</span>
                  <span className="font-medium">{formatCurrency(averages.variableMonthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bollette:</span>
                  <span className="font-medium">{formatCurrency(averages.billsMonthly)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-2">
                  <span className="font-medium">Totale:</span>
                  <span className="font-bold">{formatCurrency(averages.totalMonthly)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Calcolato su {averages.monthsConsidered} mesi {averages.isEstimated && '(stimato)'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Monthly Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Confronto Mensile</CardTitle>
            <CardDescription>
              Verifica coerenza tra mesi - stessa logica di calcolo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Mese</th>
                    <th className="text-right py-2 px-2">Spese Totali</th>
                    <th className="text-right py-2 px-2">Fisse</th>
                    <th className="text-right py-2 px-2">Variabili</th>
                    <th className="text-right py-2 px-2">Bollette</th>
                    <th className="text-right py-2 px-2">Trasferimenti</th>
                    <th className="text-right py-2 px-2">N. Spese</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySnapshots.map(m => (
                    <tr 
                      key={m.key} 
                      className={`border-b hover:bg-muted/50 ${m.key === selectedMonth ? 'bg-primary/10' : ''}`}
                    >
                      <td className="py-2 px-2 font-medium">
                        {m.label}
                        {m.key === selectedMonth && (
                          <Badge variant="secondary" className="ml-2 text-xs">Attivo</Badge>
                        )}
                      </td>
                      <td className="text-right py-2 px-2 font-bold">
                        {formatCurrency(m.snapshot.totalExpenses)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatCurrency(m.snapshot.fixedExpenses.total)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatCurrency(m.snapshot.variableExpenses.total)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatCurrency(m.snapshot.bills.real)}
                      </td>
                      <td className="text-right py-2 px-2">
                        {formatCurrency(m.snapshot.transfers.totalAsExpense)}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {formatCount(m.snapshot.expenseCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Source of Truth Info */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Source of Truth</CardTitle>
            <CardDescription>
              Tutti i calcoli provengono da <code className="bg-muted px-1 rounded">useMonthlySnapshot()</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Pagine che usano questo hook:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Dashboard (Index.tsx)</li>
                  <li>✓ Budget Mensile (Budget.tsx)</li>
                  <li>✓ Spese (Spese.tsx)</li>
                  <li>✓ Work Plan Timeline (WorkPlanTimeline.tsx)</li>
                  <li>✓ AI Insights (AIInsights.tsx)</li>
                  <li>✓ Debug Page (Debug.tsx)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Definizioni Standard:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li><strong>Spese Fisse:</strong> Rate + Abbonamenti (no trasferimenti)</li>
                  <li><strong>Variabili:</strong> Cibo, svago, varie, trasporti, salute</li>
                  <li><strong>Bollette:</strong> Utenze con billType definito</li>
                  <li><strong>Trasferimenti:</strong> Movimenti interni famiglia</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                <strong>Nota:</strong> Se vedi numeri diversi in altre pagine, significa che quella pagina non è ancora migrata a useMonthlySnapshot().
                Tutti i totali devono provenire da questa fonte unica per garantire coerenza.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Raw Data Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Dati Grezzi Store</CardTitle>
            <CardDescription>
              Conteggi totali dal budgetStore
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{formatCount(expenses.length)}</p>
                <p className="text-xs text-muted-foreground">Spese Totali</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{formatCount(invoices.length)}</p>
                <p className="text-xs text-muted-foreground">Fatture Totali</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{formatCurrency(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}</p>
                <p className="text-xs text-muted-foreground">Somma Spese</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{formatCurrency(invoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0))}</p>
                <p className="text-xs text-muted-foreground">Somma Fatture</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
