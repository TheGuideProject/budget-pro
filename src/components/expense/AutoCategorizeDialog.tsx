import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { 
  Sparkles, Loader2, Check, X, AlertCircle, 
  ChevronRight, Tag, Brain, Pencil, Bot, User, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CategoryPicker } from './CategoryPicker';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeDescription } from '@/utils/descriptionNormalizer';
import { normalizeAICategoryParent, normalizeAICategoryChild } from '@/utils/categoryMapping';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface CategorySuggestion {
  id: string;
  categoryParent: string;
  categoryChild: string | null;
  confidence: number;
  reason: string;
}

interface ManualOverride {
  categoryParent: string;
  categoryChild: string | null;
}

interface AutoCategorizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  onComplete: () => void;
}

type Step = 'idle' | 'analyzing' | 'review' | 'applying' | 'done';

export function AutoCategorizeDialog({ 
  open, 
  onOpenChange, 
  expenses,
  onComplete 
}: AutoCategorizeDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [similarUpdatedCount, setSimilarUpdatedCount] = useState(0);
  
  // Manual override state
  const [manualOverrides, setManualOverrides] = useState<Record<string, ManualOverride>>({});
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    if (open && step === 'idle') {
      analyzExpenses();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep('idle');
      setSuggestions([]);
      setSelectedIds(new Set());
      setProgress(0);
      setError(null);
      setManualOverrides({});
      setEditingExpenseId(null);
      setApplyToSimilar(true);
      setSimilarUpdatedCount(0);
    }
  }, [open]);

  const analyzExpenses = async () => {
    setStep('analyzing');
    setError(null);
    setProgress(10);

    try {
      const expensesToAnalyze = expenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date
      }));

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('ai-batch-categorize', {
        body: { 
          expenses: expensesToAnalyze,
          userId: user?.id // Passa userId per recuperare le regole apprese
        }
      });

      setProgress(80);

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const results: CategorySuggestion[] = data?.suggestions || [];
      setSuggestions(results);
      
      // Auto-select high confidence suggestions
      const autoSelected = new Set<string>(
        results
          .filter((s) => s.confidence >= 0.7)
          .map((s) => s.id)
      );
      setSelectedIds(autoSelected);

      setProgress(100);
      setStep('review');

    } catch (err) {
      console.error('Analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore durante l\'analisi';
      setError(errorMessage);
      toast.error(errorMessage);
      setStep('idle');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Get final category for an expense (manual override or AI suggestion)
  const getFinalCategory = (expenseId: string): ManualOverride | null => {
    if (manualOverrides[expenseId]) {
      return manualOverrides[expenseId];
    }
    const suggestion = suggestions.find(s => s.id === expenseId);
    return suggestion ? {
      categoryParent: suggestion.categoryParent,
      categoryChild: suggestion.categoryChild
    } : null;
  };

  const handleManualCategoryChange = (parentId: string, childId: string | null) => {
    if (editingExpenseId) {
      setManualOverrides(prev => ({
        ...prev,
        [editingExpenseId]: {
          categoryParent: parentId,
          categoryChild: childId
        }
      }));
      // Auto-select when manually overriding
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.add(editingExpenseId);
        return next;
      });
      setEditingExpenseId(null);
    }
  };

  const applyCategories = async () => {
    if (selectedIds.size === 0) {
      toast.error('Seleziona almeno una spesa');
      return;
    }

    setStep('applying');
    setProgress(0);

    try {
      const selectedExpenseIds = Array.from(selectedIds);
      const total = selectedExpenseIds.length;
      let completed = 0;
      let totalSimilarUpdated = 0;

      // Raggruppa per categoria per evitare chiamate duplicate a apply-similar
      const categoryGroups = new Map<string, { expense: Expense; category: ManualOverride }[]>();

      for (const expenseId of selectedExpenseIds) {
        const expense = expenses.find(e => e.id === expenseId);
        const finalCategory = getFinalCategory(expenseId);
        if (!finalCategory || !expense) continue;

        const categoryKey = `${finalCategory.categoryParent}|${finalCategory.categoryChild || ''}`;
        if (!categoryGroups.has(categoryKey)) {
          categoryGroups.set(categoryKey, []);
        }
        categoryGroups.get(categoryKey)!.push({ expense, category: finalCategory });
      }

      for (const expenseId of selectedExpenseIds) {
        const expense = expenses.find(e => e.id === expenseId);
        const finalCategory = getFinalCategory(expenseId);
        if (!finalCategory || !expense) continue;

        // 1. Aggiorna la spesa
        const { error } = await supabase
          .from('expenses')
          .update({
            category_parent: finalCategory.categoryParent,
            category_child: finalCategory.categoryChild
          })
          .eq('id', expenseId);

        if (error) {
          console.error('Update error:', error);
        }

        // 2. Salva nella tabella learned_categories
        const normalizedDesc = normalizeDescription(expense.description);
        if (user?.id && normalizedDesc) {
          const { error: learnedError } = await supabase
            .from('learned_categories')
            .upsert({
              user_id: user.id,
              description: normalizedDesc,
              category_parent: finalCategory.categoryParent,
              category_child: finalCategory.categoryChild,
              usage_count: 1,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,description',
              ignoreDuplicates: false
            });

          if (learnedError) {
            console.error('Error saving learned category:', learnedError);
          }
        }

        completed++;
        setProgress(Math.round((completed / total) * 50)); // Prima metà del progresso
      }

      // 3. Applica a spese simili (se attivo)
      if (applyToSimilar && user?.id) {
        const processedCategories = new Set<string>();
        let similarProgress = 0;
        const totalCategories = categoryGroups.size;

        for (const [categoryKey, group] of categoryGroups.entries()) {
          if (processedCategories.has(categoryKey)) continue;
          processedCategories.add(categoryKey);

          // Prendi la prima spesa del gruppo come riferimento
          const referenceExpense = group[0].expense;
          const category = group[0].category;

          try {
            const { data: similarResult, error: similarError } = await supabase.functions.invoke('apply-category-to-similar', {
              body: {
                userId: user.id,
                referenceDescription: referenceExpense.description,
                categoryParent: category.categoryParent,
                categoryChild: category.categoryChild
              }
            });

            if (!similarError && similarResult?.updatedCount > 0) {
              totalSimilarUpdated += similarResult.updatedCount;
              console.log(`Applied category to ${similarResult.updatedCount} similar expenses`);
            }
          } catch (err) {
            console.error('Error applying to similar expenses:', err);
          }

          similarProgress++;
          setProgress(50 + Math.round((similarProgress / totalCategories) * 50));
        }
      }

      setSimilarUpdatedCount(totalSimilarUpdated);
      setStep('done');
      
      if (totalSimilarUpdated > 0) {
        toast.success(`${completed} spese categorizzate + ${totalSimilarUpdated} spese simili aggiornate!`);
      } else {
        toast.success(`${completed} spese categorizzate con successo!`);
      }
      
      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (err) {
      console.error('Apply error:', err);
      toast.error('Errore durante l\'applicazione');
      setStep('review');
    }
  };

  const getSuggestionForExpense = (expenseId: string) => {
    return suggestions.find(s => s.id === expenseId);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success bg-success/10';
    if (confidence >= 0.5) return 'text-warning bg-warning/10';
    return 'text-destructive bg-destructive/10';
  };

  const isManuallyOverridden = (expenseId: string) => {
    return !!manualOverrides[expenseId];
  };

  const getDisplayCategory = (expenseId: string) => {
    const override = manualOverrides[expenseId];
    if (override) {
      return {
        parent: override.categoryParent,
        child: override.categoryChild,
        isManual: true
      };
    }
    const suggestion = getSuggestionForExpense(expenseId);
    if (suggestion) {
      return {
        parent: suggestion.categoryParent,
        child: suggestion.categoryChild,
        isManual: false
      };
    }
    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>Auto-Categorizzazione AI</span>
            </DialogTitle>
            <DialogDescription>
              {step === 'idle' || step === 'analyzing' 
                ? `Sto analizzando ${expenses.length} spese...`
                : step === 'review'
                ? `${suggestions.length} categorie suggerite. Clicca ✏️ per modificare.`
                : step === 'applying'
                ? 'Sto applicando le categorie...'
                : 'Completato!'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          {(step === 'analyzing' || step === 'applying') && (
            <div className="space-y-2 py-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {step === 'analyzing' ? 'Analisi AI in corso...' : 'Applicazione categorie...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Review State */}
          {step === 'review' && suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} di {suggestions.length} selezionate
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Seleziona tutto
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Deseleziona
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 max-h-[400px] pr-4">
                <div className="space-y-3">
                  {expenses.map(expense => {
                    const suggestion = getSuggestionForExpense(expense.id);
                    if (!suggestion) return null;

                    const isSelected = selectedIds.has(expense.id);
                    const displayCat = getDisplayCategory(expense.id);
                    const isManual = isManuallyOverridden(expense.id);

                    return (
                      <div
                        key={expense.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                              <Switch
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(expense.id)}
                              />
                              <span className="font-medium truncate">
                                {expense.description}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span>€{expense.amount.toFixed(2)}</span>
                              <ChevronRight className="h-3 w-3" />
                              
                              {/* Category Badge with AI/Manual indicator */}
                              <div className="flex items-center gap-1.5">
                                {isManual ? (
                                  <Badge variant="outline" className="gap-1 bg-accent/20 text-accent-foreground border-accent/30">
                                    <User className="h-3 w-3" />
                                    <span>Manuale</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
                                    <Bot className="h-3 w-3" />
                                    <span>AI</span>
                                  </Badge>
                                )}
                                
                                <Badge variant="secondary" className="font-medium">
                                  {displayCat?.parent}
                                  {displayCat?.child && ` > ${displayCat.child}`}
                                </Badge>
                              </div>
                              
                              {/* Edit Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingExpenseId(expense.id);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            
                            {/* AI Reason - only show if not manually overridden */}
                            {!isManual && suggestion.reason && (
                              <p className="text-xs text-muted-foreground mt-2 italic break-words whitespace-normal">
                                "{suggestion.reason}"
                              </p>
                            )}
                          </div>

                          {/* Confidence - only show if not manually overridden */}
                          {!isManual && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs font-mono shrink-0",
                                getConfidenceColor(suggestion.confidence)
                              )}
                            >
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Checkbox applica a spese simili */}
          {step === 'review' && suggestions.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
              <Checkbox 
                id="apply-similar" 
                checked={applyToSimilar} 
                onCheckedChange={(checked) => setApplyToSimilar(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="apply-similar" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Applica anche alle spese passate simili
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  L'AI troverà e aggiornerà automaticamente le spese con lo stesso esercente
                </p>
              </div>
            </div>
          )}

          {/* Done State */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-medium">Categorie applicate!</p>
            </div>
          )}

          {/* Empty State */}
          {step === 'review' && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nessun suggerimento disponibile</p>
            </div>
          )}

          <DialogFooter>
            {step === 'review' && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={applyCategories}
                  disabled={selectedIds.size === 0}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Applica {selectedIds.size} categorie
                </Button>
              </>
            )}
            
            {(step === 'idle' || step === 'analyzing') && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Picker Drawer for Manual Override */}
      <Drawer open={!!editingExpenseId} onOpenChange={(open) => !open && setEditingExpenseId(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Seleziona Categoria</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <CategoryPicker
              value={editingExpenseId ? (manualOverrides[editingExpenseId]?.categoryParent || getSuggestionForExpense(editingExpenseId)?.categoryParent || '') : ''}
              childValue={editingExpenseId ? (manualOverrides[editingExpenseId]?.categoryChild || getSuggestionForExpense(editingExpenseId)?.categoryChild || null) : null}
              onChange={handleManualCategoryChange}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
