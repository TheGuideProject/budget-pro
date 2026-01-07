import { useState, useEffect } from 'react';
import { Receipt, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Expense } from '@/types';
import { CATEGORY_PARENTS } from '@/types/categories';
import { CategoryPicker } from '@/components/expense/CategoryPicker';
import { toast } from 'sonner';

interface QuickExpenseDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickExpenseDialog({ trigger, open: controlledOpen, onOpenChange }: QuickExpenseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedByAI, setSuggestedByAI] = useState(false);
  const { addExpense } = useBudgetStore();
  const { user } = useAuth();
  const { isSecondary } = useUserProfile();

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'varie', // Default to modern category
    date: new Date().toISOString().split('T')[0],
  });

  // AI category suggestion with debounce
  useEffect(() => {
    if (!form.description.trim() || form.description.length < 3) {
      setSuggestedByAI(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-parse-expense', {
          body: { text: form.description }
        });

        if (!error && data?.expense?.category) {
          const suggestedCat = data.expense.category;
          // Validate against CATEGORY_PARENTS (modern categories)
          if (CATEGORY_PARENTS.some(c => c.id === suggestedCat)) {
            setForm(prev => ({ ...prev, category: suggestedCat }));
            setSuggestedByAI(true);
          }
        }
      } catch (err) {
        console.error('Category suggestion error:', err);
      } finally {
        setIsSuggesting(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.description]);

  // Reset suggestedByAI when user manually changes category
  const handleCategoryChange = (parentId: string) => {
    setForm(prev => ({ ...prev, category: parentId }));
    setSuggestedByAI(false);
  };

  const resetForm = () => {
    setForm({
      description: '',
      amount: '',
      category: 'varie',
      date: new Date().toISOString().split('T')[0],
    });
    setSuggestedByAI(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    if (!form.description.trim()) {
      toast.error('Inserisci una descrizione');
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    setIsSubmitting(true);

    try {
      const expense: Expense = {
        id: crypto.randomUUID(),
        description: form.description.trim(),
        amount,
        category: form.category as any,
        categoryParent: form.category,
        date: new Date(form.date),
        purchaseDate: new Date(form.date),
        bookedDate: new Date(form.date),
        recurring: false,
        expenseType: 'privata',
        paymentMethod: 'contanti',
        isFamilyExpense: isSecondary,
      };

      await addExpense(expense, user.id);
      toast.success('Spesa aggiunta!');
      
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-semibold">Nuova Spesa</span>
            <p className="text-xs text-muted-foreground font-normal">Inserimento manuale</p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="description" className="text-xs font-medium">Descrizione</Label>
          <Input
            id="description"
            placeholder="Es: Spesa supermercato"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="h-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-medium">Importo (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="h-11 text-lg font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date" className="text-xs font-medium">Data</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">Categoria</Label>
            {isSuggesting && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {suggestedByAI && !isSuggesting && (
              <span className="text-xs text-primary inline-flex items-center bg-primary/10 px-2 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </span>
            )}
          </div>
          <CategoryPicker
            value={form.category}
            onChange={handleCategoryChange}
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
          Annulla
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting} 
          className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90"
        >
          {isSubmitting ? 'Salvataggio...' : 'Aggiungi'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  // If controlled, render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start">
            <Receipt className="h-4 w-4 mr-2 text-success" />
            Aggiungi Spesa
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
