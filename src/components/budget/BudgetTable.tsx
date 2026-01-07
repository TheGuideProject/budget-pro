import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowUp, ArrowDown, AlertCircle, PiggyBank } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BudgetMonthSummary } from '@/types';
import { cn } from '@/lib/utils';

interface BudgetTableProps {
  summaries: BudgetMonthSummary[];
  formatCurrency: (amount: number) => string;
}

export function BudgetTable({ summaries, formatCurrency }: BudgetTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="min-w-[700px] px-4 md:px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Mese</TableHead>
              <TableHead className="text-right whitespace-nowrap">Entrate</TableHead>
              <TableHead className="text-right whitespace-nowrap">Spese (F/V)</TableHead>
              <TableHead className="text-right whitespace-nowrap">Bollette</TableHead>
              <TableHead className="text-right whitespace-nowrap">Carta Credito</TableHead>
              <TableHead className="text-right whitespace-nowrap">Risparmio</TableHead>
              <TableHead className="text-right whitespace-nowrap">Carryover</TableHead>
              <TableHead className="text-right whitespace-nowrap">Spendibile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((summary, idx) => (
              <TableRow 
                key={summary.monthKey}
                className={cn(idx === 0 && 'bg-primary/5')}
              >
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="capitalize">
                      {format(summary.month, 'MMM yy', { locale: it })}
                    </span>
                    {idx === 0 && (
                      <Badge variant="outline" className="text-xs">Corrente</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <span className="flex items-center justify-end gap-1 text-success">
                    <ArrowUp className="h-3 w-3" />
                    {formatCurrency(summary.totalIncome)}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <span className="flex items-center justify-end gap-1 text-destructive">
                    <ArrowDown className="h-3 w-3" />
                    {formatCurrency(summary.fixedExpenses + summary.variableExpenses)}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {(summary.billExpenses ?? 0) > 0 ? (
                    <span className={cn(
                      'inline-flex items-center justify-end gap-1',
                      summary.isEstimatedBills ? 'text-warning' : 'text-foreground'
                    )}>
                      {summary.isEstimatedBills && <AlertCircle className="h-3 w-3" />}
                      {formatCurrency(summary.billExpenses ?? 0)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {summary.creditCardExpenses > 0 ? (
                    <span className="text-warning">
                      {formatCurrency(summary.creditCardExpenses)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {summary.savingsMonthly > 0 ? (
                    <div className="text-right">
                      <span className="flex items-center justify-end gap-1 text-primary">
                        <PiggyBank className="h-3 w-3" />
                        {formatCurrency(summary.savingsMonthly)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Tot: {formatCurrency(summary.savingsAccumulated)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {summary.carryover > 0 ? (
                    <span className="text-success">
                      +{formatCurrency(summary.carryover)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <span className={cn(
                    'font-bold',
                    summary.spendable >= 0 ? 'text-primary' : 'text-destructive'
                  )}>
                    {formatCurrency(summary.spendable)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
