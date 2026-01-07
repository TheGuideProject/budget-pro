import { useState } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Pencil,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBudgetStore } from '@/store/budgetStore';
import { Expense } from '@/types';
import { LoanEditDialog } from './LoanEditDialog';
import { toast } from 'sonner';

interface ProviderGroup {
  provider: string;
  bills: Expense[];
  totalAmount: number;
  nextDueDate: Date;
  installmentInfo: { current: number; total: number } | null;
}

interface PendingLoansProps {
  filterMode?: 'all' | 'next30';
}

// Utility to check if an expense is a loan payment
function isLoanPayment(expense: Expense): boolean {
  const desc = (expense.description || '').toLowerCase();
  return !!(desc.match(/rata\s+\d+\/\d+|prestito|mutuo|finanziamento|younited|findomestic|agos|compass/i));
}

// Extract installment info from description (e.g., "Rata 5/24" -> { current: 5, total: 24 })
function extractInstallmentInfo(description: string): { current: number; total: number } | null {
  const match = description.match(/rata\s+(\d+)\/(\d+)/i);
  if (match) {
    return { current: parseInt(match[1]), total: parseInt(match[2]) };
  }
  return null;
}

export function PendingLoans({ filterMode = 'all' }: PendingLoansProps) {
  const { expenses, updateExpense, deleteExpense } = useBudgetStore();
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [editingLoan, setEditingLoan] = useState<Expense | null>(null);

  // Filter only unpaid loan payments
  const pendingLoans = expenses.filter(exp => {
    if (exp.isPaid) return false;
    if (!isLoanPayment(exp)) return false;
    
    if (filterMode === 'next30') {
      const expDate = new Date(exp.date);
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);
      return expDate >= today && expDate <= in30Days;
    }
    return true;
  });

  // Group by provider/description pattern
  const providerGroups: ProviderGroup[] = [];
  const providerMap = new Map<string, Expense[]>();

  pendingLoans.forEach(exp => {
    // Extract provider from description (before the "Rata" part or use first word)
    const desc = exp.description || '';
    const providerMatch = desc.match(/^(.+?)\s*(?:rata|$)/i);
    const provider = providerMatch ? providerMatch[1].trim() : desc.split(' ')[0] || 'Prestito';
    
    if (!providerMap.has(provider)) {
      providerMap.set(provider, []);
    }
    providerMap.get(provider)!.push(exp);
  });

  providerMap.forEach((bills, provider) => {
    const sortedBills = bills.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
    const nextDueDate = new Date(sortedBills[0].date);
    
    // Get installment info from the first bill
    const installmentInfo = extractInstallmentInfo(sortedBills[0].description);
    
    providerGroups.push({
      provider,
      bills: sortedBills,
      totalAmount,
      nextDueDate,
      installmentInfo,
    });
  });

  // Sort by next due date
  providerGroups.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());

  const toggleProvider = (provider: string) => {
    setExpandedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(provider)) {
        newSet.delete(provider);
      } else {
        newSet.add(provider);
      }
      return newSet;
    });
  };

  const markAsPaid = async (expense: Expense) => {
    try {
      await updateExpense(expense.id, { isPaid: true, paidAt: new Date() });
      toast.success('Rata segnata come pagata');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleDelete = async (expense: Expense) => {
    try {
      await deleteExpense(expense.id);
      toast.success('Rata eliminata');
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getUrgencyBadge = (dueDate: Date) => {
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    
    if (isPast(dueDate) && daysUntilDue < 0) {
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Scaduta</Badge>;
    }
    if (daysUntilDue <= 7) {
      return <Badge variant="destructive" className="text-xs"><Clock className="h-3 w-3 mr-1" />{daysUntilDue}g</Badge>;
    }
    if (daysUntilDue <= 14) {
      return <Badge variant="secondary" className="text-xs bg-warning/20 text-warning-foreground"><Clock className="h-3 w-3 mr-1" />{daysUntilDue}g</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{daysUntilDue}g</Badge>;
  };

  if (pendingLoans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Rate in Scadenza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nessuna rata da pagare
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Rate in Scadenza
            </CardTitle>
            <Badge variant="outline">{pendingLoans.length} rate</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {providerGroups.map((group) => {
            const isExpanded = expandedProviders.has(group.provider);
            
            return (
              <div key={group.provider} className="border rounded-lg overflow-hidden">
                {/* Provider Header */}
                <button
                  onClick={() => toggleProvider(group.provider)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <div className="font-medium">{group.provider}</div>
                      <div className="text-sm text-muted-foreground">
                        {group.bills.length} {group.bills.length === 1 ? 'rata' : 'rate'}
                        {group.installmentInfo && (
                          <span className="ml-2">
                            (Rata {group.installmentInfo.current}/{group.installmentInfo.total})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getUrgencyBadge(group.nextDueDate)}
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(group.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(group.nextDueDate, 'dd MMM', { locale: it })}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Installment Progress */}
                {group.installmentInfo && (
                  <div className="px-3 pb-2">
                    <Progress 
                      value={(group.installmentInfo.current / group.installmentInfo.total) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                {/* Expanded Bills List */}
                {isExpanded && (
                  <div className="border-t bg-muted/30">
                    {group.bills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-3 border-b last:border-b-0"
                      >
                        <div>
                          <div className="text-sm font-medium">{bill.description}</div>
                          <div className="text-xs text-muted-foreground">
                            Scadenza: {format(new Date(bill.date), 'dd/MM/yyyy', { locale: it })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(bill.amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingLoan(bill)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success"
                            onClick={() => markAsPaid(bill)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(bill)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <LoanEditDialog
        loan={editingLoan}
        open={!!editingLoan}
        onOpenChange={(open) => !open && setEditingLoan(null)}
      />
    </>
  );
}
