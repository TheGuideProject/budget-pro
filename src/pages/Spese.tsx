import { useState, useMemo, useCallback } from 'react';
import { format, isSameMonth, parse, isToday, isYesterday, isThisWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Hash,
  Trash2, FileText, ArrowUpRight, ArrowDownRight, X, FolderEdit
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { OCRScanner } from '@/components/budget/OCRScanner';
import { ExpenseEditDialog } from '@/components/expense/ExpenseEditDialog';
import { VoiceExpenseSheet } from '@/components/expense/VoiceExpenseSheet';
import { BankStatementImport } from '@/components/expense/BankStatementImport';
import { DeleteAllExpensesDialog } from '@/components/expense/DeleteAllExpensesDialog';
import { BulkExpenseCleanup } from '@/components/expense/BulkExpenseCleanup';
import { BulkCategoryEditor } from '@/components/expense/BulkCategoryEditor';
import { AutoCategorizeButton } from '@/components/expense/AutoCategorizeButton';
import { ExpenseCard } from '@/components/expense/ExpenseCard';
import { ExpenseFilters } from '@/components/expense/ExpenseFilters';
import { ExpandableFAB } from '@/components/expense/ExpandableFAB';
import { QuickExpenseModal } from '@/components/expense/QuickExpenseModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMonthlySnapshot, getSnapshotDebugValues } from '@/hooks/useMonthlySnapshot';
import { Expense } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { formatCurrency, formatPercent } from '@/lib/formatters';

// Date grouping helper
function getDateGroup(date: Date): string {
  if (isToday(date)) return 'Oggi';
  if (isYesterday(date)) return 'Ieri';
  if (isThisWeek(date)) return 'Questa settimana';
  return 'Questo mese';
}

export default function Spese() {
  const { user } = useAuth();
  const { isSecondary } = useUserProfile();
  const { expenses, projects, addExpense, updateExpense, updateExpensesBulk, deleteExpense, deleteExpensesBulk, fetchData } = useBudgetStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize currentMonth from URL query param or default to today
  const [currentMonth, setCurrentMonth] = useState(() => {
    const monthParam = searchParams.get('month');
    if (monthParam) {
      try {
        return parse(monthParam, 'yyyy-MM', new Date());
      } catch {
        return new Date();
      }
    }
    return new Date();
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [uploadingExpenseId, setUploadingExpenseId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Modal states for FAB actions
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [showOCRSheet, setShowOCRSheet] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkCategoryEditor, setShowBulkCategoryEditor] = useState(false);

  // Filter expenses for current month
  const monthExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = exp.bookedDate ? new Date(exp.bookedDate) : new Date(exp.date);
      return isSameMonth(expDate, currentMonth);
    });
  }, [expenses, currentMonth]);

  // Get previous month expenses for comparison
  const prevMonthExpenses = useMemo(() => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    return expenses.filter(exp => {
      const expDate = exp.bookedDate ? new Date(exp.bookedDate) : new Date(exp.date);
      return isSameMonth(expDate, prevMonth);
    });
  }, [expenses, currentMonth]);

  // Apply search and category filter
  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
      // Filter by new categoryParent or legacy category
      const matchesCategory = categoryFilter === 'all' || 
        exp.categoryParent === categoryFilter || 
        exp.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthExpenses, searchQuery, categoryFilter]);

  // Group expenses by date
  const expensesByDate = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(exp => {
      const expDate = exp.bookedDate ? new Date(exp.bookedDate) : new Date(exp.date);
      const group = getDateGroup(expDate);
      if (!groups[group]) groups[group] = [];
      groups[group].push(exp);
    });
    return groups;
  }, [filteredExpenses]);

  const totalMonthExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPrevMonthExpenses = prevMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthDifference = totalPrevMonthExpenses > 0 
    ? ((totalMonthExpenses - totalPrevMonthExpenses) / totalPrevMonthExpenses) * 100 
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Selection mode handlers
  const enterSelectionMode = useCallback((initialId: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([initialId]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkCategoryApply = async (categoryParent: string, categoryChild: string | null) => {
    const ids = Array.from(selectedIds);
    const { error, updatedCount } = await updateExpensesBulk(ids, { categoryParent, categoryChild });
    
    if (error) {
      toast.error('Errore durante la modifica');
    } else {
      toast.success(`${updatedCount} spese aggiornate`);
    }
    
    setShowBulkCategoryEditor(false);
    exitSelectionMode();
  };

  const handleQuickAdd = async (expense: {
    amount: number;
    description: string;
    categoryParent: string;
    categoryChild?: string | null;
    date: Date;
    notes?: string;
  }) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    addExpense({
      id: crypto.randomUUID(),
      description: expense.description,
      amount: expense.amount,
      category: 'varie', // Legacy field - keeping for backwards compatibility
      categoryParent: expense.categoryParent,
      categoryChild: expense.categoryChild || null,
      date: expense.date,
      purchaseDate: expense.date,
      bookedDate: expense.date,
      recurring: false,
      expenseType: 'privata',
      paymentMethod: 'contanti',
      notes: expense.notes,
      isFamilyExpense: isSecondary ? true : false,
    }, user.id);

    toast.success('Spesa aggiunta');
  };

  const handleVoiceExpenseConfirmed = async (parsedExpense: {
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    await addExpense({
      id: crypto.randomUUID(),
      description: parsedExpense.description,
      amount: parsedExpense.amount,
      category: parsedExpense.category as any,
      categoryParent: parsedExpense.category,
      date: new Date(parsedExpense.date),
      purchaseDate: new Date(parsedExpense.date),
      bookedDate: new Date(parsedExpense.date),
      recurring: false,
      expenseType: 'privata',
      paymentMethod: 'contanti',
      isFamilyExpense: isSecondary,
    }, user.id);
    
    toast.success('Spesa aggiunta con successo!');
    setShowVoiceSheet(false);
  };

  const handleUploadReceipt = async (expenseId: string, file: File) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setUploadingExpenseId(expenseId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${expenseId}-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('expense-receipts')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(fileName);

      await updateExpense(expenseId, { attachmentUrl: publicUrl.publicUrl });
      toast.success('Scontrino caricato');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Errore durante il caricamento');
    } finally {
      setUploadingExpenseId(null);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
    setSearchParams({ month: format(newMonth, 'yyyy-MM') });
  };

  const handleDeleteAllMonthExpenses = async () => {
    if (monthExpenses.length === 0) return;
    
    const expenseIds = monthExpenses.map(e => e.id);
    const { error, deletedCount } = await deleteExpensesBulk(expenseIds);
    
    if (error) {
      throw new Error('Errore durante l\'eliminazione');
    } else {
      toast.success(`${deletedCount} spese eliminate`);
    }
  };

  const dateGroupOrder = ['Oggi', 'Ieri', 'Questa settimana', 'Questo mese'];

  return (
    <Layout>
      <div className="min-h-screen pb-32">
        {/* Selection Mode Header */}
        {isSelectionMode && (
          <div className="sticky top-0 z-40 bg-primary text-primary-foreground -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
                onClick={exitSelectionMode}
              >
                <X className="h-5 w-5" />
              </Button>
              <span className="font-semibold">
                {selectedIds.size} {selectedIds.size === 1 ? 'selezionata' : 'selezionate'}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBulkCategoryEditor(true)}
              disabled={selectedIds.size === 0}
              className="gap-2"
            >
              <FolderEdit className="h-4 w-4" />
              Categoria
            </Button>
          </div>
        )}

        {/* Modern Header - hide in selection mode */}
        {!isSelectionMode && (
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/50 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigateMonth('prev')}
                className="h-9 w-9 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-bold capitalize">
                  {format(currentMonth, 'MMMM', { locale: it })}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {format(currentMonth, 'yyyy')}
                </p>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigateMonth('next')}
                className="h-9 w-9 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Stats Summary - Compact on mobile */}
            <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {/* Total */}
                  <div className="text-center">
                    <p className="text-lg sm:text-2xl font-bold text-foreground tabular-nums">
                      {formatCurrency(totalMonthExpenses)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Totale mese</p>
                  </div>

                  {/* Count */}
                  <div className="text-center border-x border-border/30">
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <p className="text-lg sm:text-2xl font-bold text-foreground tabular-nums">
                        {monthExpenses.length}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Transazioni</p>
                  </div>

                  {/* Trend */}
                  <div className="text-center">
                    <div className={cn(
                      "flex items-center justify-center gap-0.5",
                      monthDifference > 0 ? "text-destructive" : "text-accent"
                    )}>
                      {monthDifference > 0 ? (
                        <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <p className="text-lg sm:text-2xl font-bold tabular-nums">
                        {Math.abs(monthDifference).toFixed(0)}%
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">vs mese prec.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Debug Panel */}
            <DebugPanel
              title="Statistiche Mese"
              hookName="useBudgetStore().expenses + useMemo filters"
              calculation={`monthExpenses = expenses.filter(isSameMonth(date, currentMonth))
totalMonthExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
monthDifference = ((totalMonth - totalPrevMonth) / totalPrevMonth) * 100`}
              values={[
                { label: 'Totale Mese', value: totalMonthExpenses },
                { label: 'Transazioni Mese', value: monthExpenses.length },
                { label: 'Mese Precedente', value: totalPrevMonthExpenses },
                { label: 'Variazione %', value: `${monthDifference.toFixed(1)}%` },
                { label: 'Filtrate (visualizzate)', value: filteredExpenses.length, isRaw: true },
                { label: 'Totale Expenses Store', value: expenses.length, isRaw: true },
              ]}
              dataSource="Supabase: expenses table via useBudgetStore()"
            />
          </div>
        )}

        {/* Filters */}
        {!isSelectionMode && (
          <div className="py-4">
            <ExpenseFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
          </div>
        )}

        {/* Quick Actions Bar */}
        {!isSelectionMode && (
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <BulkExpenseCleanup onCleanupComplete={() => fetchData()} />
              <AutoCategorizeButton 
                expenses={monthExpenses.map(e => ({
                  id: e.id,
                  description: e.description,
                  amount: e.amount,
                  date: typeof e.date === 'string' ? e.date : format(e.date, 'yyyy-MM-dd'),
                  category_parent: e.categoryParent,
                  category_child: e.categoryChild
                }))}
                onCategorized={() => fetchData()}
              />
            </div>
            
            {monthExpenses.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Elimina tutte
              </Button>
            )}
          </div>
        )}

        {/* Selection mode hint */}
        {!isSelectionMode && filteredExpenses.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            Tieni premuto su una spesa per selezionarla
          </p>
        )}

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nessuna spesa questo mese
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Inizia a tracciare le tue spese per avere il controllo completo del tuo budget
            </p>
            <Button onClick={() => setShowQuickAdd(true)} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Aggiungi Prima Spesa
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {dateGroupOrder.map(group => {
              const groupExpenses = expensesByDate[group];
              if (!groupExpenses || groupExpenses.length === 0) return null;
              
              return (
                <div key={group} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {group}
                    </h2>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(groupExpenses.reduce((sum, e) => sum + e.amount, 0))}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {groupExpenses.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onEdit={isSelectionMode ? undefined : (exp) => setEditingExpense(exp)}
                        onDelete={isSelectionMode ? undefined : (id) => {
                          deleteExpense(id);
                          toast.success('Spesa eliminata');
                        }}
                        onUploadReceipt={isSelectionMode ? undefined : (id) => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleUploadReceipt(id, file);
                          };
                          input.click();
                        }}
                        formatCurrency={formatCurrency}
                        selectable={isSelectionMode}
                        selected={selectedIds.has(expense.id)}
                        onSelect={toggleSelection}
                        onLongPress={enterSelectionMode}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expandable FAB - hide in selection mode */}
        {!isSelectionMode && (
          <ExpandableFAB
            onAddManual={() => setShowQuickAdd(true)}
            onAddVoice={() => setShowVoiceSheet(true)}
            onAddOCR={() => setShowOCRSheet(true)}
            onImport={() => setShowImportSheet(true)}
          />
        )}

        {/* Quick Add Modal */}
        <QuickExpenseModal
          open={showQuickAdd}
          onOpenChange={setShowQuickAdd}
          onSubmit={handleQuickAdd}
        />

        {/* Voice Input Sheet - New Full Screen */}
        <VoiceExpenseSheet
          open={showVoiceSheet}
          onOpenChange={setShowVoiceSheet}
          onExpenseConfirmed={handleVoiceExpenseConfirmed}
        />

        {/* OCR Sheet */}
        <Sheet open={showOCRSheet} onOpenChange={setShowOCRSheet}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Scansiona scontrino</SheetTitle>
            </SheetHeader>
            <OCRScanner />
          </SheetContent>
        </Sheet>

        {/* Import Sheet */}
        <Sheet open={showImportSheet} onOpenChange={setShowImportSheet}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Importa estratto conto</SheetTitle>
            </SheetHeader>
            <BankStatementImport />
          </SheetContent>
        </Sheet>

        {/* Delete All Expenses Dialog */}
        <DeleteAllExpensesDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          expenseCount={monthExpenses.length}
          totalAmount={totalMonthExpenses}
          monthLabel={format(currentMonth, 'MMMM yyyy', { locale: it })}
          onConfirm={handleDeleteAllMonthExpenses}
          formatCurrency={formatCurrency}
        />

        {/* Bulk Category Editor */}
        <BulkCategoryEditor
          open={showBulkCategoryEditor}
          onOpenChange={setShowBulkCategoryEditor}
          selectedCount={selectedIds.size}
          onApply={handleBulkCategoryApply}
          onCancel={exitSelectionMode}
        />

        {/* Expense Edit Dialog */}
        <ExpenseEditDialog
          expense={editingExpense}
          projects={projects}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSave={(id, updates) => {
            updateExpense(id, updates);
            setEditingExpense(null);
          }}
          onDelete={(id) => {
            deleteExpense(id);
            setEditingExpense(null);
          }}
        />
      </div>
    </Layout>
  );
}
