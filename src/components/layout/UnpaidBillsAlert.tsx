import { Link } from 'react-router-dom';
import { AlertTriangle, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBudgetStore } from '@/store/budgetStore';
import { isPast, isToday } from 'date-fns';
import { useState } from 'react';

export function UnpaidBillsAlert() {
  const { expenses } = useBudgetStore();
  const [dismissed, setDismissed] = useState(false);

  // Get unpaid bills that are overdue
  const overdueBills = expenses.filter(
    (exp) => exp.billType && exp.isPaid === false && isPast(new Date(exp.date)) && !isToday(new Date(exp.date))
  );

  // Get bills due today
  const dueTodayBills = expenses.filter(
    (exp) => exp.billType && exp.isPaid === false && isToday(new Date(exp.date))
  );

  const totalOverdue = overdueBills.reduce((sum, b) => sum + b.amount, 0);
  const totalDueToday = dueTodayBills.reduce((sum, b) => sum + b.amount, 0);

  if (dismissed || (overdueBills.length === 0 && dueTodayBills.length === 0)) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            {overdueBills.length > 0 && (
              <span className="font-medium">
                {overdueBills.length} bollette scadute ({formatCurrency(totalOverdue)})
              </span>
            )}
            {overdueBills.length > 0 && dueTodayBills.length > 0 && ' • '}
            {dueTodayBills.length > 0 && (
              <span>
                {dueTodayBills.length} in scadenza oggi ({formatCurrency(totalDueToday)})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="h-7"
          >
            <Link to="/bollette">
              <Zap className="h-3 w-3 mr-1" />
              Vai alle bollette
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive-foreground/20"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}