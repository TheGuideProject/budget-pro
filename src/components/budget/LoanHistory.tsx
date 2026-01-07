import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  Pencil,
  CheckCircle2,
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
  installmentInfo: { current: number; total: number } | null;
  paidCount: number;
}

interface LoanHistoryProps {
  filterMode?: 'all' | 'next30';
}

// Utility to check if an expense is a loan payment
function isLoanPayment(expense: Expense): boolean {
  const desc = (expense.description || '').toLowerCase();
  return !!(desc.match(/rata\s+\d+\/\d+|prestito|mutuo|finanziamento|younited|findomestic|agos|compass/i));
}

// Extract installment info from description
function extractInstallmentInfo(description: string): { current: number; total: number } | null {
  const match = description.match(/rata\s+(\d+)\/(\d+)/i);
  if (match) {
    return { current: parseInt(match[1]), total: parseInt(match[2]) };
  }
  return null;
}

export function LoanHistory({ filterMode = 'all' }: LoanHistoryProps) {
  const { expenses, updateExpense, deleteExpense } = useBudgetStore();
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [editingLoan, setEditingLoan] = useState<Expense | null>(null);

  // Filter only paid loan payments
  const paidLoans = expenses.filter(exp => {
    if (!exp.isPaid) return false;
    if (!isLoanPayment(exp)) return false;
    
    if (filterMode === 'next30') {
      const expDate = new Date(exp.date);
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return expDate >= thirtyDaysAgo && expDate <= today;
    }
    return true;
  });

  // Group by provider
  const providerGroups: ProviderGroup[] = [];
  const providerMap = new Map<string, Expense[]>();

  paidLoans.forEach(exp => {
    const desc = exp.description || '';
    const providerMatch = desc.match(/^(.+?)\s*(?:rata|$)/i);
    const provider = providerMatch ? providerMatch[1].trim() : desc.split(' ')[0] || 'Prestito';
    
    if (!providerMap.has(provider)) {
      providerMap.set(provider, []);
    }
    providerMap.get(provider)!.push(exp);
  });

  providerMap.forEach((bills, provider) => {
    const sortedBills = bills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
    
    // Get highest installment info
    let maxInstallment: { current: number; total: number } | null = null;
    bills.forEach(b => {
      const info = extractInstallmentInfo(b.description);
      if (info && (!maxInstallment || info.current > maxInstallment.current)) {
        maxInstallment = info;
      }
    });
    
    providerGroups.push({
      provider,
      bills: sortedBills,
      totalAmount,
      installmentInfo: maxInstallment,
      paidCount: bills.length,
    });
  });

  // Sort by total amount (descending)
  providerGroups.sort((a, b) => b.totalAmount - a.totalAmount);

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

  const markAsUnpaid = async (expense: Expense) => {
    try {
      await updateExpense(expense.id, { isPaid: false, paidAt: undefined });
      toast.success('Rata segnata come non pagata');
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

  if (paidLoans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Storico Rate Pagate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nessuna rata pagata
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
              <CheckCircle2 className="h-5 w-5 text-success" />
              Storico Rate Pagate
            </CardTitle>
            <Badge variant="secondary" className="bg-success/20 text-success">
              {paidLoans.length} pagate
            </Badge>
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
                        {group.paidCount} {group.paidCount === 1 ? 'rata pagata' : 'rate pagate'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-success">{formatCurrency(group.totalAmount)}</div>
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
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {group.installmentInfo.current}/{group.installmentInfo.total} rate completate
                    </div>
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
                            Pagata: {bill.paidAt 
                              ? format(new Date(bill.paidAt), 'dd/MM/yyyy', { locale: it })
                              : format(new Date(bill.date), 'dd/MM/yyyy', { locale: it })
                            }
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
                            className="h-8 w-8 text-warning hover:text-warning"
                            onClick={() => markAsUnpaid(bill)}
                            title="Segna come non pagata"
                          >
                            <RotateCcw className="h-4 w-4" />
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
