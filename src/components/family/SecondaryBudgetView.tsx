import { useState, useMemo } from 'react';
import { format, isSameMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Wallet, ChevronLeft, ChevronRight, Receipt, Plus, ArrowDownCircle, Trash2, Calendar, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LinkFamilyMember } from '@/components/family/LinkFamilyMember';
import { DeleteExpenseDialog } from '@/components/family/DeleteExpenseDialog';
import { DeleteTransferDialog } from '@/components/family/DeleteTransferDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Expense } from '@/types';
import type { BudgetTransfer } from '@/types/family';

interface SecondaryBudgetViewProps {
  currentMonth: Date;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
}

export function SecondaryBudgetView({ currentMonth, onNavigateMonth }: SecondaryBudgetViewProps) {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch } = useUserProfile();
  const { transfers, getTotalTransferredForMonth, getAccumulatedBudget, deleteTransfer, createTransferAsSecondary, resetCarryoverAsSecondary, refetch: refetchTransfers } = useBudgetTransfers();
  const { expenses, addExpense, deleteExpense } = useBudgetStore();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPastTransfer, setShowAddPastTransfer] = useState(false);
  const [showResetCarryoverDialog, setShowResetCarryoverDialog] = useState(false);
  const [resetMonth, setResetMonth] = useState(format(currentMonth, 'yyyy-MM'));
  const [isResetting, setIsResetting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [transferToDelete, setTransferToDelete] = useState<BudgetTransfer | null>(null);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
  });
  const [pastTransfer, setPastTransfer] = useState({
    amount: '',
    month: format(currentMonth, 'yyyy-MM'),
    description: '',
  });

  const monthKey = format(currentMonth, 'yyyy-MM');

  // Generate last 12 months for the selector
  const last12Months = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: it }),
      });
    }
    return months;
  }, []);

  // Get transfers received for current month
  const monthTransfers = useMemo(() => {
    if (!user) return [];
    return transfers.filter(t => t.month === monthKey && t.toUserId === user.id);
  }, [transfers, monthKey, user]);

  // Get expenses for current month
  const monthExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      // Mostra tutte le spese dell'utente per il mese corrente
      return isSameMonth(expDate, currentMonth);
    });
  }, [expenses, currentMonth]);

  // Calculate expenses by month for accumulated budget
  const expensesByMonth = useMemo(() => {
    const byMonth = new Map<string, number>();
    expenses.forEach(exp => {
      const expMonthKey = format(new Date(exp.date), 'yyyy-MM');
      const current = byMonth.get(expMonthKey) || 0;
      byMonth.set(expMonthKey, current + exp.amount);
    });
    return byMonth;
  }, [expenses]);

  // Use accumulated budget (includes carryover from previous months)
  const accumulatedBudget = getAccumulatedBudget(monthKey, 'received', expensesByMonth);
  
  // Budget received this month (only regular transfers, excluding resets)
  const budgetReceivedThisMonth = useMemo(() => {
    if (!user) return 0;
    return transfers
      .filter(t => 
        t.month === monthKey && 
        t.toUserId === user.id && 
        !t.description?.includes('Azzeramento')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transfers, monthKey, user]);
  
  // Carryover from previous months (already calculated by hook including all resets)
  const carryover = accumulatedBudget.carryover;
  
  // Total spent this month
  const totalSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Remaining = carryover + budget received this month - spent this month
  const remaining = carryover + budgetReceivedThisMonth - totalSpent;
  
  // Available this month = carryover + this month's regular budget
  const availableThisMonth = carryover + budgetReceivedThisMonth;
  const spentPercentage = availableThisMonth > 0 ? (totalSpent / availableThisMonth) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleAddExpense = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (!newExpense.description || isNaN(amount) || amount <= 0) {
      toast.error('Inserisci descrizione e importo validi');
      return;
    }

    await addExpense({
      id: crypto.randomUUID(),
      description: newExpense.description,
      amount,
      category: 'variabile',
      date: currentMonth,
      recurring: false,
      expenseType: 'privata',
      paymentMethod: 'contanti',
      isFamilyExpense: true,
      paidBy: 'Dina',
    }, user.id);

    setNewExpense({ description: '', amount: '' });
    setShowAddExpense(false);
    toast.success('Spesa aggiunta');
  };

  const handleAddPastTransfer = async () => {
    if (!user || !profile?.linkedToUserId) {
      toast.error('Devi essere collegato a un profilo principale');
      return;
    }

    const amount = parseFloat(pastTransfer.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    const { error } = await createTransferAsSecondary(
      profile.linkedToUserId,
      amount,
      pastTransfer.month,
      pastTransfer.description || 'Trasferimento passato'
    );

    if (error) {
      toast.error('Errore durante la creazione del trasferimento');
      console.error(error);
      return;
    }

    setPastTransfer({ amount: '', month: format(currentMonth, 'yyyy-MM'), description: '' });
    setShowAddPastTransfer(false);
    refetchTransfers();
    toast.success('Entrata passata aggiunta');
  };

  const handleOCRResult = (data: { description: string; amount: number }) => {
    setNewExpense({
      description: data.description || 'Spesa da scontrino',
      amount: data.amount.toString(),
    });
    setShowAddExpense(true);
  };

  // Calculate carryover for the selected reset month (used in dialog)
  const carryoverForResetMonth = useMemo(() => {
    if (!user) return 0;
    
    // Get accumulated budget up to the selected reset month
    const accBudgetForMonth = getAccumulatedBudget(resetMonth, 'received', expensesByMonth);
    
    // Carryover is the running balance before that month
    return accBudgetForMonth.carryover;
  }, [user, resetMonth, expensesByMonth, getAccumulatedBudget]);

  const handleResetCarryover = async () => {
    if (!user || !profile?.linkedToUserId) {
      toast.error('Devi essere collegato a un profilo principale');
      return;
    }

    // Use the carryover calculated for the selected month, not the current month
    if (carryoverForResetMonth === 0) {
      toast.error('Nessun pregresso da azzerare per il mese selezionato');
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await resetCarryoverAsSecondary(
        profile.linkedToUserId,
        resetMonth,
        carryoverForResetMonth
      );

      if (error) {
        toast.error('Errore durante l\'azzeramento del pregresso');
        console.error(error);
        return;
      }

      setShowResetCarryoverDialog(false);
      refetchTransfers();
      toast.success('Pregresso azzerato con successo');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        {profileLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento profilo...</p>
        ) : profile ? (
          <LinkFamilyMember
            currentUserRole={profile.role}
            linkedToUserId={profile.linkedToUserId}
            currentDisplayName={profile.displayName}
            currentInviteCode={profile.inviteCode}
            onLinked={() => refetch?.()}
          />
        ) : null}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            Il Tuo Budget
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestisci le spese dal budget ricevuto
          </p>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onNavigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-card rounded-lg border min-w-[160px] text-center">
            <span className="font-semibold capitalize text-sm">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={() => onNavigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show carryover if present with reset button */}
          {carryover !== 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Residuo mesi precedenti</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium",
                    carryover > 0 ? "text-success" : "text-destructive"
                  )}>
                    {carryover > 0 ? '+' : ''}{formatCurrency(carryover)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setResetMonth(monthKey);
                      setShowResetCarryoverDialog(true);
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Azzera
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-primary/10">
              <p className="text-sm text-muted-foreground">
                {carryover > 0 ? 'Disponibile' : 'Ricevuto'}
              </p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(availableThisMonth)}</p>
              {carryover > 0 && budgetReceivedThisMonth > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ({formatCurrency(budgetReceivedThisMonth)} questo mese)
                </p>
              )}
            </div>
            <div className="p-4 rounded-lg bg-destructive/10">
              <p className="text-sm text-muted-foreground">Speso</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalSpent)}</p>
            </div>
            <div className={cn(
              "p-4 rounded-lg",
              remaining >= 0 ? "bg-success/10" : "bg-warning/10"
            )}>
              <p className="text-sm text-muted-foreground">Rimanente</p>
              <p className={cn(
                "text-2xl font-bold",
                remaining >= 0 ? "text-success" : "text-warning"
              )}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Utilizzo budget</span>
              <span className={cn(
                'font-medium',
                spentPercentage > 90 ? 'text-destructive' : 
                spentPercentage > 70 ? 'text-warning' : 'text-success'
              )}>
                {spentPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(spentPercentage, 100)} 
              className={cn(
                'h-3',
                spentPercentage > 90 ? '[&>div]:bg-destructive' : 
                spentPercentage > 70 ? '[&>div]:bg-warning' : '[&>div]:bg-success'
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Income and Expenses */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            Entrate ({monthTransfers.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Spese ({monthExpenses.length})
          </TabsTrigger>
        </TabsList>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          {/* Add Past Transfer Form */}
          {profile?.linkedToUserId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-success" />
                    Aggiungi Entrata Passata
                  </CardTitle>
                  <CardDescription>
                    Registra bonifici ricevuti prima della creazione del sistema
                  </CardDescription>
                </div>
                <Button
                  variant={showAddPastTransfer ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowAddPastTransfer(!showAddPastTransfer)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {showAddPastTransfer ? 'Chiudi' : 'Aggiungi'}
                </Button>
              </CardHeader>
              {showAddPastTransfer && (
                <CardContent>
                  <div className="space-y-4 p-4 rounded-lg bg-success/5 border border-success/20">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="past-amount">Importo (€)</Label>
                        <Input
                          id="past-amount"
                          type="number"
                          step="0.01"
                          value={pastTransfer.amount}
                          onChange={(e) => setPastTransfer(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="past-month">Mese</Label>
                        <Select
                          value={pastTransfer.month}
                          onValueChange={(v) => setPastTransfer(prev => ({ ...prev, month: v }))}
                        >
                          <SelectTrigger id="past-month">
                            <SelectValue placeholder="Seleziona mese" />
                          </SelectTrigger>
                          <SelectContent>
                            {last12Months.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="past-desc">Descrizione (opzionale)</Label>
                      <Input
                        id="past-desc"
                        value={pastTransfer.description}
                        onChange={(e) => setPastTransfer(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Es: Bonifico mensile"
                      />
                    </div>
                    <Button onClick={handleAddPastTransfer} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Entrata
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Transfers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-success" />
                Entrate del Mese
              </CardTitle>
              <CardDescription>
                Trasferimenti ricevuti dal gestore principale
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthTransfers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nessuna entrata registrata questo mese
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {monthTransfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-success/10 hover:bg-success/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transfer.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transfer.createdAt), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-success">
                            + {formatCurrency(transfer.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setTransferToDelete(transfer)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          {/* Add Expense */}
          <Card className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Registra Spesa
                </CardTitle>
                <CardDescription>Aggiungi una spesa manualmente</CardDescription>
              </div>
              <Button
                variant={showAddExpense ? 'secondary' : 'default'}
                size="sm"
                onClick={() => setShowAddExpense(!showAddExpense)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {showAddExpense ? 'Chiudi' : 'Nuova'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddExpense && (
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exp-desc">Descrizione</Label>
                      <Input
                        id="exp-desc"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Es: Spesa supermercato"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp-amount">Importo (€)</Label>
                      <Input
                        id="exp-amount"
                        type="number"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddExpense} className="w-full">
                    Aggiungi Spesa
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense History */}
          <Card>
            <CardHeader>
              <CardTitle>Spese del Mese</CardTitle>
            </CardHeader>
            <CardContent>
              {monthExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nessuna spesa registrata questo mese
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {monthExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(expense.date), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-destructive">
                            - {formatCurrency(expense.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setExpenseToDelete(expense)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteExpenseDialog
        open={expenseToDelete !== null}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
        expenseDescription={expenseToDelete?.description || ''}
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(expenseToDelete.id);
          }
        }}
      />

      <DeleteTransferDialog
        open={transferToDelete !== null}
        onOpenChange={(open) => !open && setTransferToDelete(null)}
        transferDescription={transferToDelete?.description || ''}
        transferAmount={transferToDelete?.amount || 0}
        onConfirm={async () => {
          if (transferToDelete) {
            await deleteTransfer(transferToDelete.id);
            refetchTransfers();
          }
        }}
      />

      {/* Reset Carryover Dialog */}
      <Dialog open={showResetCarryoverDialog} onOpenChange={setShowResetCarryoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Azzera Pregresso
            </DialogTitle>
            <DialogDescription>
              Azzera il residuo accumulato dai mesi precedenti. Il budget ripartirà da zero dal mese selezionato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Azzera a partire da</Label>
              <Select value={resetMonth} onValueChange={setResetMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona mese" />
                </SelectTrigger>
                <SelectContent>
                  {last12Months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pregresso per {format(new Date(resetMonth + '-01'), 'MMMM yyyy', { locale: it })}</span>
                <span className={cn(
                  "font-bold text-lg",
                  carryoverForResetMonth > 0 ? "text-success" : carryoverForResetMonth < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {carryoverForResetMonth > 0 ? '+' : ''}{formatCurrency(carryoverForResetMonth)}
                </span>
              </div>
            </div>

            {carryoverForResetMonth !== 0 ? (
              <div className={cn(
                "p-3 rounded-lg text-sm",
                carryoverForResetMonth > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
              )}>
                {carryoverForResetMonth > 0 ? (
                  <p>⚠️ Perderai <strong>{formatCurrency(carryoverForResetMonth)}</strong> di credito accumulato.</p>
                ) : (
                  <p>✓ Azzererai <strong>{formatCurrency(Math.abs(carryoverForResetMonth))}</strong> di debito accumulato.</p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg text-sm bg-muted/50 text-muted-foreground">
                <p>Nessun pregresso da azzerare per questo mese.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetCarryoverDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleResetCarryover}
              disabled={isResetting || carryoverForResetMonth === 0}
              variant={carryoverForResetMonth > 0 ? "destructive" : "default"}
            >
              {isResetting ? 'Azzerando...' : 'Conferma Azzeramento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}