import { useState } from 'react';
import { Plus, Mic, Camera, Receipt, CalendarPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { VoiceExpenseSheet } from '@/components/expense/VoiceExpenseSheet';
import { QuickExpenseDialog } from '@/components/expense/QuickExpenseDialog';
import { OCRScannerDialog } from '@/components/expense/OCRScannerDialog';
import { QuickEventDialog } from '@/components/calendar/QuickEventDialog';
import { BankOCRDialog } from '@/components/expense/BankOCRDialog';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Expense } from '@/types';
import { toast } from 'sonner';

interface FABAction {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  gradient: string;
}

const actions: FABAction[] = [
  { id: 'voice', icon: Mic, label: 'Input Vocale', description: 'Parla per aggiungere', gradient: 'from-purple-500 to-violet-600' },
  { id: 'expense', icon: Receipt, label: 'Nuova Spesa', description: 'Inserisci manualmente', gradient: 'from-emerald-500 to-green-600' },
  { id: 'ocr', icon: Camera, label: 'Scansiona OCR', description: 'Fotografa scontrino', gradient: 'from-amber-500 to-orange-600' },
  { id: 'event', icon: CalendarPlus, label: 'Nuovo Evento', description: 'Aggiungi promemoria', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'bank', icon: Upload, label: 'Import Banca', description: 'Screenshot bancario', gradient: 'from-teal-500 to-cyan-600' },
];

// Haptic feedback utility
const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: [10, 50, 10]
    };
    navigator.vibrate(patterns[intensity]);
  }
};

export function MobileQuickActions() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  
  const isMobile = useIsMobile();
  const { addExpense } = useBudgetStore();
  const { user } = useAuth();
  const { isSecondary } = useUserProfile();

  if (!isMobile) return null;

  const handleOpenSheet = () => {
    triggerHaptic('light');
    setSheetOpen(true);
  };

  const handleActionClick = (actionId: string) => {
    triggerHaptic('medium');
    setSheetOpen(false);
    // Small delay to allow sheet to close smoothly
    setTimeout(() => {
      switch (actionId) {
        case 'voice':
          setVoiceOpen(true);
          break;
        case 'expense':
          setExpenseOpen(true);
          break;
        case 'ocr':
          setOcrOpen(true);
          break;
        case 'event':
          setEventOpen(true);
          break;
        case 'bank':
          setBankOpen(true);
          break;
      }
    }, 150);
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
    setVoiceOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-background via-background to-transparent pb-safe">
        <Button
          onClick={handleOpenSheet}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-xl hover:opacity-90 transition-all"
        >
          <Plus className="h-5 w-5 mr-2" />
          <span className="font-semibold">Azione Rapida</span>
        </Button>
      </div>

      {/* Actions Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg">Cosa vuoi fare?</SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-3 pb-4">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl",
                  "bg-card border border-border/50",
                  "hover:shadow-lg active:scale-[0.98] transition-all duration-200"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br text-white shadow-lg",
                  action.gradient
                )}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog Components - Controlled */}
      <VoiceExpenseSheet
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        onExpenseConfirmed={handleVoiceExpenseConfirmed}
      />

      <QuickExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
      />

      <OCRScannerDialog
        open={ocrOpen}
        onOpenChange={setOcrOpen}
      />

      <QuickEventDialog
        open={eventOpen}
        onOpenChange={setEventOpen}
      />

      <BankOCRDialog
        open={bankOpen}
        onOpenChange={setBankOpen}
      />
    </>
  );
}
