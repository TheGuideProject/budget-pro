import { useState, useRef } from 'react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  AlertCircle, Check, Upload, Loader2, Zap, Flame, Droplets, 
  Wifi, Phone, Building, Trash2, Calendar, ChevronDown, ChevronUp, Edit2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, BillType, PaidBy, BILL_TYPES, PAID_BY_OPTIONS } from '@/types';
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
  nextDueDate: Date;
  isInstallmentPlan: boolean;
  paidCount: number;
  totalCount: number;
}

interface PendingBillsProps {
  filterMode?: 'all' | 'next30';
  type?: 'utilities' | 'loans' | 'all';
}

export function PendingBills({ filterMode = 'next30', type = 'all' }: PendingBillsProps) {
  const { user } = useAuth();
  const { expenses, addExpense, updateExpense, deleteExpense } = useBudgetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [editingBill, setEditingBill] = useState<Expense | null>(null);

  // Get unpaid bills based on type filter
  const allPendingBills = expenses.filter((exp) => {
    if (exp.isPaid !== false) return false;
    
    // Filter by type
    if (type === 'utilities') {
      return isUtilityBill(exp) && !isLoanPayment(exp);
    } else if (type === 'loans') {
      return isLoanPayment(exp);
    } else {
      // 'all' - include both utilities and loans with billType/billProvider
      return (exp.billType || exp.billProvider);
    }
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Apply filter
  const pendingBills = filterMode === 'next30'
    ? allPendingBills.filter(exp => {
        const expDate = new Date(exp.date);
        const today = new Date();
        const in30Days = new Date();
        in30Days.setDate(today.getDate() + 30);
        return expDate <= in30Days;
      })
    : allPendingBills;

  // Group bills by provider
  const groupedByProvider = pendingBills.reduce<Record<string, ProviderGroup>>((acc, bill) => {
    const provider = bill.billProvider || bill.description || 'Altro';
    
    if (!acc[provider]) {
      // Count total bills for this provider (including paid ones for installment plans)
      const allProviderBills = expenses.filter(e => 
        (e.billProvider === provider || (!e.billProvider && e.description === provider)) &&
        (e.billType || e.billProvider)
      );
      const paidCount = allProviderBills.filter(e => e.isPaid).length;
      
      acc[provider] = {
        provider,
        bills: [],
        totalAmount: 0,
        nextDueDate: new Date(bill.date),
        isInstallmentPlan: allProviderBills.length > 3,
        paidCount,
        totalCount: allProviderBills.length,
      };
    }
    
    acc[provider].bills.push(bill);
    acc[provider].totalAmount += bill.amount;
    
    const billDate = new Date(bill.date);
    if (billDate < acc[provider].nextDueDate) {
      acc[provider].nextDueDate = billDate;
    }
    
    return acc;
  }, {});

  const providerGroups = Object.values(groupedByProvider).sort(
    (a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime()
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('ocr-bill', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const billType = (data.bill_type || 'altro') as BillType;
      const provider = data.provider || 'Fornitore sconosciuto';

      const expense: Expense = {
        id: crypto.randomUUID(),
        description: `${provider} - ${BILL_TYPES.find((b) => b.value === billType)?.label || billType}`,
        amount: data.amount || 0,
        category: 'fissa',
        date: data.due_date ? new Date(data.due_date) : new Date(),
        purchaseDate: data.bill_date ? new Date(data.bill_date) : new Date(),
        bookedDate: data.due_date ? new Date(data.due_date) : new Date(),
        recurring: false,
        expenseType: 'privata',
        paymentMethod: 'bonifico',
        billType: billType,
        billProvider: provider,
        billPeriodStart: data.period_start ? new Date(data.period_start) : undefined,
        billPeriodEnd: data.period_end ? new Date(data.period_end) : undefined,
        consumptionValue: data.consumption_value,
        consumptionUnit: data.consumption_unit,
        isPaid: false,
        notes: data.notes,
      };

      await addExpense(expense, user.id);
      toast.success('Bolletta da pagare aggiunta');
    } catch (error) {
      console.error('Error uploading bill:', error);
      toast.error('Errore durante il caricamento');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const markAsPaid = async (bill: Expense, paidBy: PaidBy) => {
    await updateExpense(bill.id, {
      isPaid: true,
      paidAt: new Date(),
      paidBy,
    });
    toast.success(`Bolletta segnata come pagata da ${paidBy}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getUrgencyBadge = (dueDate: Date) => {
    if (isPast(dueDate) && !isToday(dueDate)) {
      return <Badge variant="destructive" className="text-xs">Scaduta</Badge>;
    }
    if (isToday(dueDate)) {
      return <Badge variant="destructive" className="text-xs">Oggi</Badge>;
    }
    if (isPast(addDays(new Date(), -7))) {
      return <Badge variant="outline" className="text-xs text-warning border-warning">Prossima</Badge>;
    }
    return null;
  };

  const totalPending = pendingBills.reduce((sum, b) => sum + b.amount, 0);
  const VISIBLE_BILLS_LIMIT = 3;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Bollette da Pagare
            {pendingBills.length > 0 && (
              <Badge variant="secondary">{pendingBills.length}</Badge>
            )}
          </CardTitle>
          {totalPending > 0 && (
            <Badge variant="outline" className="text-lg font-bold">
              {formatCurrency(totalPending)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload New Bill */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full h-12 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Aggiungi bolletta da pagare
              </>
            )}
          </Button>
        </div>

        {/* Grouped Pending Bills */}
        {providerGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nessuna bolletta in attesa di pagamento
          </p>
        ) : (
          <div className="space-y-3">
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
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      isPast(group.nextDueDate) && !isToday(group.nextDueDate) && "bg-destructive/5"
                    )}
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
                            {getUrgencyBadge(group.nextDueDate)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{group.bills.length} rate pendenti</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Prossima: {format(group.nextDueDate, 'dd MMM', { locale: it })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{formatCurrency(group.totalAmount)}</span>
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
                          <span>Pagate {group.paidCount}/{group.totalCount}</span>
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
                    {visibleBills.map((bill, index) => (
                      <div
                        key={bill.id}
                        className="p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm text-muted-foreground w-16">
                              {group.isInstallmentPlan ? `Rata ${group.paidCount + index + 1}` : format(new Date(bill.date), 'dd/MM', { locale: it })}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                  Scad. {format(new Date(bill.date), 'dd MMM yyyy', { locale: it })}
                                </span>
                                {getUrgencyBadge(new Date(bill.date))}
                              </div>
                            </div>
                          </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">{formatCurrency(bill.amount)}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBill(bill);
                              }}
                              title="Modifica bolletta"
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            {PAID_BY_OPTIONS.map((option) => (
                              <Button
                                key={option.value}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-7 w-7",
                                  option.value === 'Luca' && 'hover:bg-blue-100 hover:text-blue-700',
                                  option.value === 'Dina' && 'hover:bg-pink-100 hover:text-pink-700',
                                  option.value === 'Jacopo' && 'hover:bg-green-100 hover:text-green-700'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsPaid(bill, option.value);
                                }}
                                title={`Segna pagata da ${option.label}`}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            ))}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteExpense(bill.id);
                                toast.success('Bolletta rimossa');
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
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
                        Mostra altre {group.bills.length - VISIBLE_BILLS_LIMIT} rate...
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      <BillEditDialog 
        bill={editingBill} 
        open={!!editingBill} 
        onOpenChange={(open) => !open && setEditingBill(null)} 
      />
    </Card>
  );
}
