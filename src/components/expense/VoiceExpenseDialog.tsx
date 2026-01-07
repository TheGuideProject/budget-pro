import { useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceExpenseSheet } from './VoiceExpenseSheet';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Expense } from '@/types';
import { toast } from 'sonner';

interface VoiceExpenseDialogProps {
  trigger?: React.ReactNode;
}

export function VoiceExpenseDialog({ trigger }: VoiceExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const { addExpense } = useBudgetStore();
  const { user } = useAuth();
  const { isSecondary } = useUserProfile();

  const handleExpenseConfirmed = async (parsedExpense: {
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const expense: Expense = {
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
    };

    await addExpense(expense, user.id);
    toast.success('Spesa aggiunta con successo!');
    setOpen(false);
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start gap-3 h-14 px-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Voce</div>
              <div className="text-xs text-muted-foreground">Parla per aggiungere</div>
            </div>
          </Button>
        )}
      </div>
      <VoiceExpenseSheet
        open={open}
        onOpenChange={setOpen}
        onExpenseConfirmed={handleExpenseConfirmed}
      />
    </>
  );
}
