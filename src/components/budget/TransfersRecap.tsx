/**
 * Recap dei trasferimenti mensili al profilo secondario.
 * I trasferimenti sono classificati come spese VARIABILI nel nuovo sistema.
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowRight, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBudgetStore } from '@/store/budgetStore';
import { isFamilyTransfer } from '@/utils/expenseClassification';

interface MonthlyTransfer {
  month: string;
  monthDate: Date;
  recipient: string;
  amount: number;
  count: number;
}

export function TransfersRecap() {
  const { expenses } = useBudgetStore();

  const { transfersByMonth, totalAmount, averageMonthly } = useMemo(() => {
    // Filtra solo i trasferimenti familiari
    const familyTransfers = expenses.filter(isFamilyTransfer);
    
    // Raggruppa per mese
    const byMonth = new Map<string, { recipient: string; amount: number; count: number }>();
    
    familyTransfers.forEach(transfer => {
      const monthKey = format(new Date(transfer.date), 'yyyy-MM');
      const desc = (transfer.description || '').toLowerCase();
      
      // Estrai recipient
      let recipient = 'Famiglia';
      if (desc.includes('mam') || desc.includes('mamy') || desc.includes('mamma')) {
        recipient = 'Mamy';
      } else if (desc.includes('moglie')) {
        recipient = 'Moglie';
      }
      
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, { recipient, amount: 0, count: 0 });
      }
      
      const entry = byMonth.get(monthKey)!;
      entry.amount += transfer.amount;
      entry.count += 1;
    });
    
    const transfers: MonthlyTransfer[] = Array.from(byMonth.entries())
      .map(([month, data]) => ({
        month,
        monthDate: new Date(month + '-01'),
        recipient: data.recipient,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12); // Ultimi 12 mesi
    
    const total = transfers.reduce((sum, t) => sum + t.amount, 0);
    const average = transfers.length > 0 ? total / transfers.length : 0;
    
    return {
      transfersByMonth: transfers,
      totalAmount: total,
      averageMonthly: average,
    };
  }, [expenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (transfersByMonth.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trasferimenti al Secondario
          </CardTitle>
          <CardDescription>
            Nessun trasferimento trovato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            I trasferimenti al profilo secondario appariranno qui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Trasferimenti al Secondario
            </CardTitle>
            <CardDescription className="mt-1">
              Storico mensile - conteggiati come spese variabili
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Media mensile
            </div>
            <div className="font-bold text-lg">{formatCurrency(averageMonthly)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Mese</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead className="text-center">Trasferimenti</TableHead>
                <TableHead className="text-right">Importo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfersByMonth.map((transfer) => (
                <TableRow key={transfer.month}>
                  <TableCell className="font-medium">
                    {format(transfer.monthDate, 'MMMM yyyy', { locale: it })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>{transfer.recipient}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {transfer.count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(transfer.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">
            Totale ultimi {transfersByMonth.length} mesi
          </span>
          <span className="font-bold">{formatCurrency(totalAmount)}</span>
        </div>
        
        <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> I trasferimenti al profilo secondario sono ora classificati come 
            <Badge variant="outline" className="ml-1 mr-1 text-xs">Spese Variabili</Badge>
            e inclusi nella media mensile delle spese variabili.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
