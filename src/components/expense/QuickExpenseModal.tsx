import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Calendar,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CategoryPicker } from './CategoryPicker';
import { CATEGORY_PARENTS } from '@/types/categories';

interface QuickExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expense: {
    amount: number;
    description: string;
    categoryParent: string;
    categoryChild?: string | null;
    date: Date;
    notes?: string;
  }) => Promise<void>;
}

export function QuickExpenseModal({
  open,
  onOpenChange,
  onSubmit
}: QuickExpenseModalProps) {
  const { user } = useAuth();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryParent, setCategoryParent] = useState<string | null>(null);
  const [categoryChild, setCategoryChild] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [suggestedByAI, setSuggestedByAI] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSuggestedByAI(false);
      setCategoryTouched(false);
      setIsSuggestingCategory(false);
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    } else {
      // Reset form when closed
      setAmount('');
      setDescription('');
      setCategoryParent(null);
      setCategoryChild(null);
      setDate(new Date());
      setNotes('');
      setSuggestedByAI(false);
      setCategoryTouched(false);
      setIsSuggestingCategory(false);
    }
  }, [open]);

  const handleCategoryChange = (parentId: string, childId?: string | null) => {
    setCategoryTouched(true);
    setSuggestedByAI(false);
    setCategoryParent(parentId);
    setCategoryChild(childId || null);
  };

  // AI suggest category based on description (debounced)
  useEffect(() => {
    if (!open) return;
    if (!user) return;
    if (categoryTouched) return;

    const text = description.trim();
    if (text.length < 3) {
      setSuggestedByAI(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSuggestingCategory(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-parse-expense', {
          body: { text },
        });

        if (error) {
          const status = (error as any)?.context?.status ?? (error as any)?.status;
          if (status === 429) toast.error('AI: troppe richieste, riprova tra poco');
          if (status === 402) toast.error('AI: crediti esauriti, ricarica per continuare');
          console.error('ai-parse-expense error:', error);
          return;
        }

        const category = data?.expense?.category as string | undefined;
        if (!category) return;

        // AI now returns modern categories directly - validate it exists
        const validCategory = CATEGORY_PARENTS.find(c => c.id === category);
        if (validCategory) {
          setCategoryParent(category);
          setCategoryChild(null);
          setSuggestedByAI(true);
        }
      } catch (e) {
        console.error('AI suggest category error:', e);
      } finally {
        setIsSuggestingCategory(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [open, user, description, categoryTouched]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!description.trim()) return;
    if (!categoryParent) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        description: description.trim(),
        categoryParent,
        categoryChild,
        date,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = amount && parseFloat(amount.replace(',', '.')) > 0 && description.trim() && categoryParent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold">Nuova Spesa</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Amount Input - Large and prominent */}
          <div className="text-center">
            <div className="inline-flex items-baseline gap-2">
              <span className="text-3xl font-bold text-muted-foreground">€</span>
              <Input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(
                  "text-4xl font-bold text-center border-none shadow-none focus-visible:ring-0",
                  "w-40 h-auto py-2 px-0",
                  "placeholder:text-muted-foreground/30"
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Input
              placeholder="Descrizione spesa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Category Picker - New hierarchical system */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-medium text-muted-foreground">Categoria *</p>
              {isSuggestingCategory && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              {suggestedByAI && !categoryTouched && !isSuggestingCategory && (
                <Badge variant="secondary" className="h-5 px-2 text-[11px] gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
            </div>
            <CategoryPicker
              value={categoryParent}
              childValue={categoryChild}
              onChange={handleCategoryChange}
            />
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-12"
              >
                <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-base">
                  {format(date, "EEEE d MMMM yyyy", { locale: it })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                locale={it}
              />
            </PopoverContent>
          </Popover>

          {/* Notes (collapsible) */}
          <Textarea
            placeholder="Note aggiuntive (opzionale)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
          />
        </div>

        {/* Submit Button */}
        <div className="p-6 pt-0">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full h-12 text-base font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Check className="w-5 h-5 mr-2" />
            )}
            Aggiungi Spesa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
