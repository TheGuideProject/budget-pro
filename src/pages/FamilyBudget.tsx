import { useState, useEffect, useRef, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { it } from 'date-fns/locale';
import { Users, ChevronLeft, ChevronRight, Send, Receipt, Settings, Wallet, AlertTriangle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FamilyTransferForm } from '@/components/family/FamilyTransferForm';
import { FamilyExpensesSummary } from '@/components/family/FamilyExpensesSummary';
import { InviteCodeCard } from '@/components/family/InviteCodeCard';
import { SecondaryBudgetView } from '@/components/family/SecondaryBudgetView';
import { BankTransferImporter } from '@/components/family/BankTransferImporter';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useSecondaryExpenses } from '@/hooks/useSecondaryExpenses';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DebugPanel } from '@/components/debug/DebugPanel';

export default function FamilyBudget() {
  const { profile, linkedProfile, loading, isPrimary, isSecondary } = useUserProfile();
  const { transfers, getTotalTransferredForMonth, getAccumulatedBudget, resetCarryover } = useBudgetTransfers();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [resettingCarryover, setResettingCarryover] = useState(false);

  const monthKey = format(currentMonth, 'yyyy-MM');

  // Fetch secondary expenses for the linked user
  const { totalSpent: secondaryTotalSpent, allExpenses: secondaryAllExpenses, loading: expensesLoading, refetch: refetchExpenses } = useSecondaryExpenses({
    linkedUserId: linkedProfile?.userId || null,
    selectedMonth: currentMonth,
  });

  // Calculate expenses by month for accumulated budget - exclude transfers
  const expensesByMonth = useMemo(() => {
    const byMonth = new Map<string, number>();
    secondaryAllExpenses
      .filter(exp => {
        // Exclude expenses that are actually transfers
        const desc = (exp.description || '').toLowerCase();
        return !desc.includes('bonifico') && !desc.includes('trasferimento');
      })
      .forEach(exp => {
        const expMonthKey = format(new Date(exp.date), 'yyyy-MM');
        const current = byMonth.get(expMonthKey) || 0;
        byMonth.set(expMonthKey, current + exp.amount);
      });
    return byMonth;
  }, [secondaryAllExpenses]);

  // Use accumulated budget (includes carryover from previous months)
  const accumulatedBudget = getAccumulatedBudget(monthKey, 'sent', expensesByMonth);
  const carryover = accumulatedBudget.carryover;
  const hasNegativeHistory = accumulatedBudget.hasNegativeHistory;
  const totalTransferredThisMonth = getTotalTransferredForMonth(monthKey, 'sent');
  const availableThisMonth = carryover + totalTransferredThisMonth;

  // Handle reset carryover
  const handleResetCarryover = async () => {
    if (!linkedProfile || accumulatedBudget.remaining >= 0) return;
    
    setResettingCarryover(true);
    try {
      const { error } = await resetCarryover(
        monthKey,
        linkedProfile.userId,
        accumulatedBudget.remaining
      );
      
      if (error) {
        toast({
          title: "Errore",
          description: "Impossibile azzerare lo storico",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Storico azzerato",
          description: "Il budget ora parte da zero per questo mese",
        });
      }
    } finally {
      setResettingCarryover(false);
    }
  };

  // Ref per tracciare il budget precedente
  const prevRemainingRef = useRef<number | null>(null);

  // Subscribe to realtime changes on expenses table for the linked user
  useEffect(() => {
    if (!linkedProfile?.userId) return;

    const channel = supabase
      .channel('secondary-expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${linkedProfile.userId}`,
        },
        (payload) => {
          refetchExpenses();
          
          // Toast per nuova spesa
          if (payload.eventType === 'INSERT') {
            const newExpense = payload.new as { amount: number; description: string };
            toast({
              title: "🛒 Nuova spesa registrata",
              description: `${linkedProfile.displayName} ha speso €${newExpense.amount.toFixed(2)} per "${newExpense.description}"`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkedProfile?.userId, linkedProfile?.displayName, refetchExpenses]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Calculate secondary budget status using accumulated values
  const secondaryRemaining = accumulatedBudget.remaining;
  const spentPercentage = availableThisMonth > 0 ? (secondaryTotalSpent / availableThisMonth) * 100 : 0;
  const isLowBudget = secondaryRemaining < 50 && secondaryRemaining >= 0;
  const isOverBudget = secondaryRemaining < 0;

  // Toast quando il budget scende sotto €150
  useEffect(() => {
    if (availableThisMonth > 0 && linkedProfile) {
      const prevRemaining = prevRemainingRef.current;
      
      if (prevRemaining !== null && prevRemaining >= 150 && secondaryRemaining < 150) {
        toast({
          title: "⚠️ Budget in esaurimento!",
          description: `Il budget di ${linkedProfile.displayName} è sceso sotto €150. Rimangono ${formatCurrency(secondaryRemaining)}`,
          variant: "destructive",
        });
      }
      
      prevRemainingRef.current = secondaryRemaining;
    }
  }, [secondaryRemaining, availableThisMonth, linkedProfile]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Secondary profile view - simplified budget tracking
  if (isSecondary) {
    return (
      <Layout>
        <SecondaryBudgetView currentMonth={currentMonth} onNavigateMonth={navigateMonth} />
      </Layout>
    );
  }

  // Primary profile view - full management
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                Budget Familiare
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gestisci i trasferimenti e monitora le spese del profilo secondario
              </p>
            </div>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-card rounded-lg border min-w-[160px] text-center">
              <span className="font-semibold capitalize text-sm">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trasferito questo mese</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(getTotalTransferredForMonth(monthKey, 'sent'))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Receipt className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profilo collegato</p>
                  <p className="text-lg font-semibold">
                    {linkedProfile?.displayName || 'Nessuno'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Il tuo ruolo</p>
                  <p className="text-lg font-semibold capitalize">
                    {profile?.role === 'primary' ? 'Gestore Principale' : 'Secondario'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug Panel */}
        <DebugPanel
          title="Family Budget Stats"
          hookName="useBudgetTransfers() + useSecondaryExpenses()"
          calculation={`totalTransferredThisMonth = getTotalTransferredForMonth(monthKey, 'sent')
accumulatedBudget = getAccumulatedBudget(monthKey, 'sent', expensesByMonth)
carryover = accumulatedBudget.carryover
availableThisMonth = carryover + totalTransferredThisMonth
secondaryRemaining = accumulatedBudget.remaining`}
          values={[
            { label: 'Trasferito Mese', value: totalTransferredThisMonth },
            { label: 'Carryover', value: carryover },
            { label: 'Disponibile Totale', value: availableThisMonth },
            { label: 'Speso Secondario', value: secondaryTotalSpent },
            { label: 'Rimanente', value: secondaryRemaining },
            { label: 'Utilizzo %', value: `${spentPercentage.toFixed(1)}%` },
            { label: 'N. Trasferimenti', value: transfers.length, isRaw: true },
          ]}
          dataSource="Supabase: budget_transfers + expenses via useBudgetTransfers()"
        />

        {/* Secondary Budget Status Card */}
        {linkedProfile && (
          <Card className={cn(
            "border-2",
            availableThisMonth === 0 ? "border-muted" :
            isOverBudget ? "border-destructive/50 bg-destructive/5" :
            isLowBudget ? "border-warning/50 bg-warning/5" :
            "border-success/50 bg-success/5"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5" />
                Situazione Budget di {linkedProfile.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableThisMonth === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Nessun trasferimento per questo mese</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crea un trasferimento per assegnare un budget
                  </p>
                </div>
              ) : (
                <>
                  {/* Show carryover if present */}
                  {carryover > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Residuo mesi precedenti</span>
                        <span className="font-medium text-success">+{formatCurrency(carryover)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {carryover > 0 ? 'Disponibile' : 'Trasferito'}
                      </p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(availableThisMonth)}</p>
                      {carryover > 0 && totalTransferredThisMonth > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ({formatCurrency(totalTransferredThisMonth)} questo mese)
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Speso</p>
                      <p className="text-xl font-bold text-destructive">{formatCurrency(secondaryTotalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rimanente</p>
                      <p className={cn(
                        "text-xl font-bold",
                        isOverBudget ? "text-destructive" :
                        isLowBudget ? "text-warning" :
                        "text-success"
                      )}>
                        {formatCurrency(secondaryRemaining)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilizzo budget</span>
                      <span className={cn(
                        'font-medium',
                        spentPercentage > 100 ? 'text-destructive' :
                        spentPercentage > 80 ? 'text-warning' : 'text-success'
                      )}>
                        {spentPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(spentPercentage, 100)} 
                      className={cn(
                        'h-3',
                        spentPercentage > 100 ? '[&>div]:bg-destructive' :
                        spentPercentage > 80 ? '[&>div]:bg-warning' : '[&>div]:bg-success'
                      )}
                    />
                  </div>

                  {(isLowBudget || isOverBudget) && (
                    <Alert variant={isOverBudget ? "destructive" : "default"} className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex flex-col gap-2">
                        <span>
                          {isOverBudget 
                            ? `Il budget è stato superato di ${formatCurrency(Math.abs(secondaryRemaining))}. Considera un nuovo trasferimento.`
                            : `Budget in esaurimento! Rimangono solo ${formatCurrency(secondaryRemaining)}. Considera un trasferimento.`
                          }
                        </span>
                        {isOverBudget && hasNegativeHistory && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleResetCarryover}
                            disabled={resettingCarryover}
                            className="w-fit"
                          >
                            {resettingCarryover ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Azzera storico pregresso
                          </Button>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="transfers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transfers">Trasferimenti</TabsTrigger>
            <TabsTrigger value="expenses">Spese Secondario</TabsTrigger>
            <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="space-y-4">
            <div className="flex justify-end mb-2">
              <BankTransferImporter />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FamilyTransferForm />
              
              {/* Transfer History */}
              <Card>
                <CardHeader>
                  <CardTitle>Storico Trasferimenti</CardTitle>
                  <CardDescription>Ultimi trasferimenti effettuati</CardDescription>
                </CardHeader>
                <CardContent>
                  {transfers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nessun trasferimento effettuato
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {transfers.slice(0, 5).map((transfer) => (
                        <div 
                          key={transfer.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium text-sm">{transfer.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {transfer.month}
                            </p>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(transfer.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <FamilyExpensesSummary selectedMonth={currentMonth} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-md">
              <InviteCodeCard />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}