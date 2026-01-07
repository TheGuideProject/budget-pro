import { useState, useMemo } from 'react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { getCreditCardBookedDate } from '@/utils/expenseClassification';
import { Link } from 'react-router-dom';
import { 
  CreditCard, Trash2, Upload, Download, ShoppingBag, Home, 
  Car, Utensils, Gamepad2, Repeat, PawPrint, Plane, Package,
  Heart, Zap, LayoutGrid, Calendar as CalendarIcon, ChevronDown, ChevronUp, Edit,
  Sparkles, Loader2, TrendingUp, Shirt, GraduationCap, Briefcase, Gift, Baby,
  Stethoscope, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Expense, ExpenseCategory } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CATEGORY_PARENTS, CategoryParent, getCategoryParent } from '@/types/categories';

interface MonthExpensesListProps {
  expenses: Expense[];
  onUploadReceipt: (expenseId: string, file: File) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onUpdateCategory?: (expenseId: string, newCategory: ExpenseCategory) => void;
  uploadingExpenseId: string | null;
  formatCurrency: (value: number) => string;
  showManageLink?: boolean;
  viewMode?: 'compact' | 'full';
  currentMonthParam?: string;
}

// Mappa icone per le categorie unificate (by id string)
const unifiedCategoryIcons: Record<string, React.ElementType> = {
  casa_utenze: Home,
  alimentari: ShoppingBag,
  ristorazione: Utensils,
  trasporti: Car,
  auto_veicoli: Car,
  animali: PawPrint,
  persona_cura: Heart,
  salute: Stethoscope,
  tempo_libero: Gamepad2,
  sport_benessere: Gamepad2,
  viaggi: Plane,
  tecnologia: Zap,
  lavoro_formazione: Briefcase,
  finanza_obblighi: Wallet,
  abbonamenti_servizi: Repeat,
  regali_donazioni: Gift,
  extra_imprevisti: Package,
  altro: Package,
};

// Mappa colori per le categorie unificate
const unifiedCategoryColors: Record<string, string> = {
  casa_utenze: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  alimentari: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  ristorazione: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  trasporti: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  auto_veicoli: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
  animali: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  persona_cura: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/30',
  salute: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  tempo_libero: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  sport_benessere: 'bg-green-500/10 text-green-500 border-green-500/30',
  viaggi: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  tecnologia: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  lavoro_formazione: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  finanza_obblighi: 'bg-red-500/10 text-red-500 border-red-500/30',
  abbonamenti_servizi: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
  regali_donazioni: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  extra_imprevisti: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  altro: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
};

// Helper per ottenere config categoria unificata
function getUnifiedCategoryConfig(expense: Expense) {
  const categoryParentId = expense.categoryParent || 'altro';
  const parentInfo = getCategoryParent(categoryParentId);
  const IconComponent = unifiedCategoryIcons[categoryParentId] || Package;
  const colorClass = unifiedCategoryColors[categoryParentId] || unifiedCategoryColors.altro;
  
  return {
    icon: IconComponent,
    color: colorClass,
    label: parentInfo?.label || 'Altro',
    categoryParentId
  };
}

function getDateGroup(date: Date): string {
  if (isToday(date)) return 'Oggi';
  if (isYesterday(date)) return 'Ieri';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'Questa settimana';
  return 'Questo mese';
}

export function MonthExpensesList({ 
  expenses, 
  onUploadReceipt, 
  onDeleteExpense, 
  onEditExpense,
  onUpdateCategory,
  uploadingExpenseId,
  formatCurrency,
  showManageLink = true,
  viewMode = 'compact',
  currentMonthParam
}: MonthExpensesListProps) {
  const isFullView = viewMode === 'full';
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [expandedDateGroups, setExpandedDateGroups] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleDateGroupExpansion = (group: string) => {
    setExpandedDateGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };
  const handleReanalyze = async (expense: Expense) => {
    if (!onUpdateCategory) return;
    
    setReanalyzingId(expense.id);
    try {
      const textToAnalyze = expense.notes 
        ? `${expense.description}. Dettagli prodotti: ${expense.notes}`
        : expense.description;
      
      const { data, error } = await supabase.functions.invoke('ai-parse-expense', {
        body: { text: textToAnalyze }
      });
      
      if (error) throw error;
      
      if (data.expense?.category && data.expense.category !== expense.category) {
        onUpdateCategory(expense.id, data.expense.category);
        const parentInfo = getCategoryParent(data.expense.categoryParent || 'altro');
        toast.success(`Categoria aggiornata: ${parentInfo?.label || data.expense.category}`);
      } else {
        toast.info('La categoria è già corretta');
      }
    } catch (error) {
      console.error('Reanalyze error:', error);
      toast.error('Errore durante la rianalisi');
    } finally {
      setReanalyzingId(null);
    }
  };

  const expensesByDate = useMemo(() => {
    const groups: Record<string, Expense[]> = {
      'Oggi': [],
      'Ieri': [],
      'Questa settimana': [],
      'Questo mese': [],
    };
    
    expenses.forEach(expense => {
      const date = expense.date instanceof Date ? expense.date : new Date(expense.date);
      const group = getDateGroup(date);
      groups[group].push(expense);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
    });

    return groups;
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, { total: number; count: number; expenses: Expense[]; label: string }> = {};
    let totalAmount = 0;

    expenses.forEach(expense => {
      // Usa categoryParent (unificato) invece di category (vecchio)
      const categoryParentId = expense.categoryParent || 'altro';
      const parentInfo = getCategoryParent(categoryParentId);
      
      if (!categories[categoryParentId]) {
        categories[categoryParentId] = { total: 0, count: 0, expenses: [], label: parentInfo?.label || 'Altro' };
      }
      categories[categoryParentId].total += expense.amount;
      categories[categoryParentId].count++;
      categories[categoryParentId].expenses.push(expense);
      totalAmount += expense.amount;
    });

    const sorted = Object.entries(categories)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([categoryParentId, data]) => ({
        categoryParent: categoryParentId,
        ...data,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
      }));

    return { categories: sorted, totalAmount };
  }, [expenses]);

  const renderExpenseCard = (expense: Expense) => {
    const config = getUnifiedCategoryConfig(expense);
    const IconComponent = config.icon;
    const date = expense.date instanceof Date ? expense.date : new Date(expense.date);

    return (
      <div 
        key={expense.id} 
        className="expense-glass-card group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "p-2.5 rounded-xl shrink-0 expense-category-icon",
              config.color
            )}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{expense.description}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {format(date, 'd MMM', { locale: it })}
                </span>
                <Badge variant="outline" className="text-xs h-5 bg-background/50">
                  {config.label}
                </Badge>
                {expense.paymentMethod === 'carta_credito' ? (
                  <Badge 
                    variant="outline" 
                    className="text-xs h-5 bg-warning/10 text-warning border-warning/30"
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    {format(getCreditCardBookedDate(expense.date), 'dd/MM', { locale: it })}
                  </Badge>
                ) : expense.paymentMethod && (
                  <Badge variant="secondary" className="text-xs h-5">
                    {expense.paymentMethod === 'contanti' ? '💵' : 
                      expense.paymentMethod === 'bancomat' ? '💳' : '🏦'}
                  </Badge>
                )}
                {expense.expenseType === 'aziendale' && (
                  <Badge className="text-xs h-5 bg-primary hover:bg-primary/90">
                    Aziendale
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="font-bold text-lg text-foreground">
              {formatCurrency(expense.amount)}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {expense.expenseType === 'aziendale' && (
                expense.attachmentUrl ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(expense.attachmentUrl!, '_blank', 'noopener,noreferrer')}
                  >
                    <Download className="h-4 w-4 text-success" />
                  </Button>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      id={`upload-${expense.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadReceipt(expense.id, file);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => document.getElementById(`upload-${expense.id}`)?.click()}
                      disabled={uploadingExpenseId === expense.id}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </>
                )
              )}
              {onUpdateCategory && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleReanalyze(expense)}
                  disabled={reanalyzingId === expense.id}
                  title="Rianalizza con AI"
                >
                  {reanalyzingId === expense.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-warning hover:text-warning/80" />
                  )}
                </Button>
              )}
              {onEditExpense && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEditExpense(expense)}
                >
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10"
                onClick={() => onDeleteExpense(expense.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const linkToSpese = currentMonthParam ? `/spese?month=${currentMonthParam}` : '/spese';

  if (expenses.length === 0) {
    return (
      <div className="expenses-section-glass">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold gradient-text">Spese del Mese</h3>
          </div>
          {showManageLink && !isFullView && (
            <Button asChild variant="outline" size="sm" className="glass-card border-primary/20">
              <Link to={linkToSpese}>Gestisci Spese</Link>
            </Button>
          )}
        </div>
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">Nessuna spesa registrata</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aggiungi la tua prima spesa per iniziare a tracciare il budget
            </p>
          </div>
          {!isFullView && (
            <Button asChild size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Link to={linkToSpese}>
                <Zap className="h-4 w-4 mr-2" />
                Aggiungi Spesa
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-section-glass space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold gradient-text">Spese del Mese</h3>
        </div>
        {showManageLink && !isFullView && (
          <Button asChild variant="outline" size="sm" className="glass-card border-primary/20 hover:border-primary/40">
            <Link to={linkToSpese}>Gestisci Spese</Link>
          </Button>
        )}
      </div>

      {/* Category Summary */}
      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <CollapsibleTrigger asChild>
          <button className="expense-summary-glass w-full flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <LayoutGrid className="h-4 w-4 text-accent" />
              </div>
              <span className="font-medium text-foreground">Riepilogo per Categoria</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(expensesByCategory.totalAmount)}
              </span>
              <div className="p-1 rounded-lg bg-muted/50">
                {summaryOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid gap-3">
            {expensesByCategory.categories.slice(0, 5).map(({ categoryParent, total, percentage, label }) => {
              const IconComponent = unifiedCategoryIcons[categoryParent] || Package;
              const colorClass = unifiedCategoryColors[categoryParent] || unifiedCategoryColors.altro;
              return (
                <div key={categoryParent} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className={cn("p-2 rounded-lg", colorClass)}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="font-medium truncate">{label}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {formatCurrency(total)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full expense-progress-gradient transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {percentage.toFixed(0)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Separator */}
      <div className="sidebar-fade-line" />

      {/* Tabs */}
      <Tabs defaultValue="date" className="w-full">
        <TabsList className="expense-tabs-glass grid w-full grid-cols-2 h-11">
          <TabsTrigger value="date" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Per Data
          </TabsTrigger>
          <TabsTrigger value="category" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Per Categoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="date" className="mt-6 space-y-6">
          {(['Oggi', 'Ieri', 'Questa settimana', 'Questo mese'] as const).map((group) => {
            const groupExpenses = expensesByDate[group];
            if (groupExpenses.length === 0) return null;
            
            const isGroupExpanded = expandedDateGroups.has(group);
            const defaultLimit = group === 'Oggi' || group === 'Ieri' ? 10 : 5;
            const limit = isFullView || isGroupExpanded ? Infinity : defaultLimit;
            const displayedExpenses = groupExpenses.slice(0, limit);
            const remaining = groupExpenses.length - defaultLimit;
            const hasMore = !isFullView && remaining > 0;
            
            return (
              <div key={group}>
                <div className="expense-date-divider">
                  <span className="text-sm font-medium text-muted-foreground px-3 bg-background rounded-full">
                    {group}
                  </span>
                </div>
                <div className="space-y-3 mt-3">
                  {displayedExpenses.map(renderExpenseCard)}
                  {hasMore && (
                    <button
                      onClick={() => toggleDateGroupExpansion(group)}
                      className="w-full text-xs text-center text-primary hover:text-primary/80 py-2 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                    >
                      {isGroupExpanded ? (
                        <span className="flex items-center justify-center gap-1">
                          <ChevronUp className="h-3 w-3" /> Mostra meno
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <ChevronDown className="h-3 w-3" /> +{remaining} altre spese
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="category" className="mt-6 space-y-4">
          {expensesByCategory.categories.map(({ categoryParent, expenses: catExpenses, total, label }) => {
            const IconComponent = unifiedCategoryIcons[categoryParent] || Package;
            const colorClass = unifiedCategoryColors[categoryParent] || unifiedCategoryColors.altro;
            const isCatExpanded = expandedCategories.has(categoryParent);
            const defaultLimit = 5;
            const displayedExpenses = isCatExpanded ? catExpenses : catExpenses.slice(0, defaultLimit);
            const remaining = catExpenses.length - defaultLimit;
            
            return (
              <Collapsible key={categoryParent} defaultOpen={catExpenses.length <= 3}>
                <CollapsibleTrigger asChild>
                  <button className="expense-summary-glass w-full flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", colorClass)}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{label}</span>
                      <Badge variant="secondary" className="text-xs">{catExpenses.length}</Badge>
                    </div>
                    <span className="font-semibold text-primary">{formatCurrency(total)}</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 pl-2">
                  <div className="space-y-3">
                    {displayedExpenses.map(renderExpenseCard)}
                    {remaining > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryExpansion(categoryParent);
                        }}
                        className="w-full text-xs text-center text-primary hover:text-primary/80 py-2 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                      >
                        {isCatExpanded ? (
                          <span className="flex items-center justify-center gap-1">
                            <ChevronUp className="h-3 w-3" /> Mostra meno
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <ChevronDown className="h-3 w-3" /> +{remaining} altre spese
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* View All Link */}
      {!isFullView && expenses.length > 10 && (
        <div className="text-center pt-2">
          <Button asChild variant="link" size="sm" className="text-primary hover:text-primary/80">
            <Link to={linkToSpese}>Vedi tutte le {expenses.length} spese →</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
