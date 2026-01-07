import { useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Receipt, TrendingDown, Wallet, Eye, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSecondaryExpenses } from '@/hooks/useSecondaryExpenses';
import { cn } from '@/lib/utils';

interface FamilyExpensesSummaryProps {
  selectedMonth: Date;
}

export function FamilyExpensesSummary({ selectedMonth }: FamilyExpensesSummaryProps) {
  const { linkedProfile } = useUserProfile();
  const { transfers } = useBudgetTransfers();

  const monthKey = format(selectedMonth, 'yyyy-MM');

  // Use dedicated hook for secondary expenses - does NOT affect primary budget
  const { expenses: familyExpenses, totalSpent, loading: expensesLoading } = useSecondaryExpenses({
    linkedUserId: linkedProfile?.userId ?? null,
    selectedMonth,
  });

  // Get transfers for this month to the linked profile
  const monthTransfers = useMemo(() => {
    if (!linkedProfile) return [];
    return transfers.filter(t => 
      t.month === monthKey && 
      t.toUserId === linkedProfile.userId
    );
  }, [transfers, monthKey, linkedProfile]);

  const totalBudget = monthTransfers.reduce((sum, t) => sum + t.amount, 0);
  const remaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (!linkedProfile) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Spese di {linkedProfile.displayName}
        </CardTitle>
        <CardDescription>
          {format(selectedMonth, 'MMMM yyyy', { locale: it })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert - This is display only */}
        <Alert className="bg-muted/50 border-muted-foreground/20">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Solo riepilogo informativo - già contato come trasferimento nel tuo budget
          </AlertDescription>
        </Alert>

        {/* Budget Overview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Budget trasferito</span>
            <span className="font-semibold">{formatCurrency(totalBudget)}</span>
          </div>
          
          <Progress 
            value={Math.min(spentPercentage, 100)} 
            className={cn(
              'h-3',
              spentPercentage > 90 ? '[&>div]:bg-destructive' : 
              spentPercentage > 70 ? '[&>div]:bg-warning' : '[&>div]:bg-success'
            )}
          />
          
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              Speso: {formatCurrency(totalSpent)}
            </span>
            <span className={cn(
              'flex items-center gap-1 font-medium',
              remaining >= 0 ? 'text-success' : 'text-destructive'
            )}>
              <Wallet className="h-4 w-4" />
              Rimanente: {formatCurrency(remaining)}
            </span>
          </div>
        </div>

        {/* Expense List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Ultimi Scontrini
          </h4>
          
          {familyExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna spesa registrata questo mese
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {familyExpenses.slice(0, 10).map((expense) => (
                  <div 
                    key={expense.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(expense.date), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {formatCurrency(expense.amount)}
                      </span>
                      {expense.attachmentUrl && (
                        <Badge variant="outline" className="text-xs">
                          📎
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
