import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Zap, Flame, Droplets, Wifi, Phone, Building, 
  Trash2, Edit2, X, User, Receipt, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBudgetStore } from '@/store/budgetStore';
import { Expense } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BillEditDialog } from './BillEditDialog';
import { isUtilityBill, isLoanPayment } from '@/utils/expenseClassification';

const billTypeIcons: Record<string, React.ReactNode> = {
  luce: <Zap className="h-4 w-4 text-yellow-500" />,
  gas: <Flame className="h-4 w-4 text-orange-500" />,
  acqua: <Droplets className="h-4 w-4 text-blue-500" />,
  internet: <Wifi className="h-4 w-4 text-purple-500" />,
  telefono: <Phone className="h-4 w-4 text-green-500" />,
  condominio: <Building className="h-4 w-4 text-gray-500" />,
  rifiuti: <Building className="h-4 w-4 text-amber-500" />,
  altro: <Building className="h-4 w-4 text-gray-400" />,
};

interface ProviderGroup {
  provider: string;
  bills: Expense[];
  totalAmount: number;
  isInstallmentPlan: boolean;
  paidCount: number;
  totalCount: number;
}

interface BillHistoryProps {
  filterMode?: 'all' | 'next30';
  type?: 'utilities' | 'loans' | 'all';
}

export function BillHistory({ filterMode = 'all', type = 'all' }: BillHistoryProps) {
  const { expenses, updateExpense, deleteExpense } = useBudgetStore();
  const [editingBill, setEditingBill] = useState<Expense | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

  // Get all paid bill expenses based on type filter
  const allPaidBills = expenses
    .filter(exp => {
      if (exp.isPaid !== true) return false;
      
      // Filter by type
      if (type === 'utilities') {
        return isUtilityBill(exp) && !isLoanPayment(exp);
      } else if (type === 'loans') {
        return isLoanPayment(exp);
      } else {
        // 'all' - include both utilities and loans with billType/billProvider
        return (exp.billType || exp.billProvider);
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply filter (for history, "next30" means last 30 days)
  const paidBills = filterMode === 'next30'
    ? allPaidBills.filter(exp => {
        const expDate = new Date(exp.date);
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return expDate >= thirtyDaysAgo;
      })
    : allPaidBills;

  // Group by provider
  const groupedByProvider = paidBills.reduce<Record<string, ProviderGroup>>((acc, bill) => {
    const provider = bill.billProvider || bill.description || 'Altro';
    
    if (!acc[provider]) {
      const allProviderBills = expenses.filter(e => 
        (e.billProvider === provider || (!e.billProvider && e.description === provider)) &&
        (e.billType || e.billProvider)
      );
      
      acc[provider] = {
        provider,
        bills: [],
        totalAmount: 0,
        isInstallmentPlan: allProviderBills.length > 3,
        paidCount: allProviderBills.filter(e => e.isPaid).length,
        totalCount: allProviderBills.length,
      };
    }
    
    acc[provider].bills.push(bill);
    acc[provider].totalAmount += bill.amount;
    
    return acc;
  }, {});

  const providerGroups = Object.values(groupedByProvider).sort(
    (a, b) => new Date(b.bills[0]?.date || 0).getTime() - new Date(a.bills[0]?.date || 0).getTime()
  );

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const markAsUnpaid = async (bill: Expense) => {
    await updateExpense(bill.id, {
      isPaid: false,
      paidAt: undefined,
      paidBy: undefined,
    });
    toast.success('Bolletta spostata in "da pagare"');
  };

  const handleDelete = (billId: string) => {
    deleteExpense(billId);
    toast.success('Bolletta eliminata');
  };

  const VISIBLE_BILLS_LIMIT = 5;

  if (paidBills.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Storico Bollette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-4">
              Nessuna bolletta nello storico. Carica delle bollette con l'upload bulk.
            </p>
          </CardContent>
        </Card>
        <BillEditDialog 
          bill={editingBill} 
          open={!!editingBill} 
          onOpenChange={(open) => !open && setEditingBill(null)} 
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Storico Bollette
              <Badge variant="secondary">{paidBills.length}</Badge>
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              Totale: {formatCurrency(paidBills.reduce((sum, b) => sum + b.amount, 0))}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerGroups.map((group) => {
            const isExpanded = expandedProviders.has(group.provider);
            const visibleBills = isExpanded ? group.bills : group.bills.slice(0, VISIBLE_BILLS_LIMIT);
            const hasMoreBills = group.bills.length > VISIBLE_BILLS_LIMIT;
            const firstBillType = group.bills[0]?.billType;

            return (
              <div
                key={group.provider}
                className="rounded-lg border bg-card overflow-hidden"
              >
                {/* Provider Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => hasMoreBills && toggleProvider(group.provider)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {firstBillType && billTypeIcons[firstBillType]}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{group.provider}</span>
                          {group.isInstallmentPlan && (
                            <Badge variant="secondary" className="text-xs">
                              Piano Rate
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {group.bills.length} bollette pagate
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatCurrency(group.totalAmount)}</span>
                      {hasMoreBills && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for installment plans */}
                  {group.isInstallmentPlan && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progresso: {group.paidCount}/{group.totalCount}</span>
                        <span>{Math.round((group.paidCount / group.totalCount) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(group.paidCount / group.totalCount) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                </div>

                {/* Bills List */}
                <div className="border-t divide-y">
                  {visibleBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm text-muted-foreground w-20">
                            {format(new Date(bill.date), 'dd/MM/yy', { locale: it })}
                          </span>
                          <div className="min-w-0">
                            {bill.paidBy && (
                              <span className={cn(
                                'flex items-center gap-1 text-sm',
                                bill.paidBy === 'Luca' && 'text-blue-500',
                                bill.paidBy === 'Dina' && 'text-pink-500',
                                bill.paidBy === 'Jacopo' && 'text-green-500'
                              )}>
                                <User className="h-3 w-3" />
                                {bill.paidBy}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">{formatCurrency(bill.amount)}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingBill(bill)}>
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markAsUnpaid(bill)}>
                            <X className="h-3 w-3 text-warning" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(bill.id)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Show more button */}
                  {hasMoreBills && !isExpanded && (
                    <button
                      className="w-full p-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                      onClick={() => toggleProvider(group.provider)}
                    >
                      Mostra altre {group.bills.length - VISIBLE_BILLS_LIMIT} bollette...
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      <BillEditDialog 
        bill={editingBill} 
        open={!!editingBill} 
        onOpenChange={(open) => !open && setEditingBill(null)} 
      />
    </>
  );
}
