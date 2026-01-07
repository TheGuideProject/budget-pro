import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleLayout } from '@/components/simple/SimpleLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Home, Trash2, Receipt, CircleEllipsis } from 'lucide-react';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { VoiceExpenseDialog } from '@/components/expense/VoiceExpenseDialog';
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, isToday, isYesterday, isThisWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { Expense } from '@/types';
import { toast } from 'sonner';
import { CATEGORY_PARENTS, getCategoryParent, mapLegacyCategory } from '@/types/categories';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Get category display info from expense
function getCategoryDisplay(expense: Expense) {
  // Try new system first (categoryParent)
  if (expense.categoryParent) {
    const parent = getCategoryParent(expense.categoryParent);
    if (parent) {
      return {
        Icon: parent.icon,
        color: parent.color,
        bgColor: parent.bgColor,
        label: parent.label,
      };
    }
  }
  
  // Fallback to legacy category mapping
  const mappedParent = mapLegacyCategory(expense.category);
  const parent = getCategoryParent(mappedParent);
  
  if (parent) {
    return {
      Icon: parent.icon,
      color: parent.color,
      bgColor: parent.bgColor,
      label: parent.label,
    };
  }
  
  // Default fallback
  const defaultParent = getCategoryParent('altro')!;
  return {
    Icon: defaultParent.icon,
    color: defaultParent.color,
    bgColor: defaultParent.bgColor,
    label: defaultParent.label,
  };
}

function getDateGroup(date: Date): string {
  if (isToday(date)) return 'Oggi';
  if (isYesterday(date)) return 'Ieri';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'Questa settimana';
  return 'Questo mese';
}

export default function SimpleExpenses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { expenses, deleteExpense } = useBudgetStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const monthExpenses = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return isWithinInterval(expenseDate, { start, end });
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, currentMonth]);

  const expensesByDate = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    monthExpenses.forEach((expense) => {
      const group = getDateGroup(new Date(expense.date));
      if (!groups[group]) groups[group] = [];
      groups[group].push(expense);
    });
    return groups;
  }, [monthExpenses]);

  const totalMonthExpenses = useMemo(() => {
    return monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [monthExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    
    try {
      await deleteExpense(expenseToDelete.id);
      toast.success('Spesa eliminata');
      setExpenseToDelete(null);
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  return (
    <SimpleLayout title="Le mie spese">
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Month Navigation */}
        <div className="p-4 border-b bg-background sticky top-14 z-40">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <p className="font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </p>
              <p className="text-sm text-muted-foreground">
                Totale: {formatCurrency(totalMonthExpenses)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {monthExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna spesa registrata</p>
              <p className="text-sm">Aggiungi la tua prima spesa!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(expensesByDate).map(([group, groupExpenses]) => (
                <div key={group}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{group}</h3>
                  <div className="space-y-2">
                    {groupExpenses.map((expense) => {
                      const { Icon, color, bgColor, label } = getCategoryDisplay(expense);
                      
                      return (
                        <Card key={expense.id} className="overflow-hidden neo-glass">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`h-5 w-5 ${color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{expense.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {label} • {format(new Date(expense.date), 'd MMM', { locale: it })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold whitespace-nowrap">
                                {formatCurrency(expense.amount)}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setExpenseToDelete(expense)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-4 flex flex-col gap-3">
          <VoiceExpenseDialog 
            trigger={
              <Button size="lg" className="rounded-full h-14 w-14 shadow-lg">
                <Plus className="h-6 w-6" />
              </Button>
            }
          />
        </div>

        {/* Home Button */}
        <div className="fixed bottom-6 left-4">
          <Button 
            variant="outline" 
            size="lg" 
            className="rounded-full h-14 w-14 shadow-lg bg-background"
            onClick={() => navigate('/simple-home')}
          >
            <Home className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa spesa?</AlertDialogTitle>
            <AlertDialogDescription>
              {expenseToDelete && (
                <>
                  Stai per eliminare "{expenseToDelete.description}" di {formatCurrency(expenseToDelete.amount)}.
                  Questa azione non può essere annullata.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SimpleLayout>
  );
}
