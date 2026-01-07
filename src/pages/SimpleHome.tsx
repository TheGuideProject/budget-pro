import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleLayout } from '@/components/simple/SimpleLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Camera, Landmark, ChevronRight, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useBudgetStore } from '@/store/budgetStore';
import { VoiceOrb } from '@/components/simple/VoiceOrb';
import { QuickExpenseDialog } from '@/components/expense/QuickExpenseDialog';
import { OCRScannerDialog } from '@/components/expense/OCRScannerDialog';
import { BankOCRDialog } from '@/components/expense/BankOCRDialog';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { toast } from 'sonner';
import { Expense } from '@/types';

export default function SimpleHome() {
  const navigate = useNavigate();
  const { expenses, addExpense } = useBudgetStore();
  const { profile } = useUserProfile();
  const { settings } = useFinancialSettings();

  const monthlyBudget = settings?.monthly_salary || 3000;

  const stats = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const monthExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start, end });
    });

    const totalSpent = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const remaining = monthlyBudget - totalSpent;
    const percentUsed = Math.min((totalSpent / monthlyBudget) * 100, 100);

    return { totalSpent, remaining, percentUsed };
  }, [expenses, monthlyBudget]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleVoiceExpense = async (parsedExpense: { amount: number; description: string; category: string; date: string }) => {
    try {
      const newExpense = {
        amount: parsedExpense.amount,
        description: parsedExpense.description,
        category: (parsedExpense.category as Expense['category']) || 'varie',
        date: new Date(parsedExpense.date || new Date()),
        recurring: false,
      };
      
      await addExpense(newExpense as any, null);
      toast.success('Spesa aggiunta!', {
        description: `${parsedExpense.description}: ${formatCurrency(parsedExpense.amount)}`
      });
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  return (
    <SimpleLayout title="">
      <div className="flex flex-col min-h-[calc(100vh-8rem)]">
        {/* Hero Section */}
        <div className="gradient-mesh-bg px-4 pt-6 pb-8">
          <div className="relative z-10">
            <p className="text-muted-foreground text-sm">
              {greeting()}, <span className="font-medium text-foreground">{profile?.displayName || 'Utente'}</span> 👋
            </p>
            <h1 className="text-2xl font-bold mt-1 capitalize">
              {format(new Date(), 'MMMM yyyy', { locale: it })}
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 -mt-4 relative z-10">
          <div className="grid grid-cols-3 gap-3">
            <Card className="neo-glass">
              <CardContent className="p-3 text-center">
                <TrendingDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Speso</p>
                <p className="text-sm font-bold mt-0.5">{formatCurrency(stats.totalSpent)}</p>
              </CardContent>
            </Card>

            <Card className="neo-glass">
              <CardContent className="p-3 text-center">
                <Wallet className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Budget</p>
                <p className="text-sm font-bold mt-0.5">{formatCurrency(monthlyBudget)}</p>
              </CardContent>
            </Card>

            <Card className="neo-glass">
              <CardContent className="p-3 text-center">
                <PiggyBank className="h-4 w-4 mx-auto mb-1 text-success" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rimasto</p>
                <p className="text-sm font-bold mt-0.5">{formatCurrency(stats.remaining)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Voice Orb - Main CTA */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <VoiceOrb onExpenseConfirmed={handleVoiceExpense} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 pb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">
            Altri modi per aggiungere
          </p>
          <div className="grid grid-cols-3 gap-3">
            <QuickExpenseDialog 
              trigger={
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2 neo-glass border-border/50 hover:border-primary/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                    <Edit className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium">Manuale</span>
                </Button>
              }
            />

            <OCRScannerDialog 
              trigger={
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2 neo-glass border-border/50 hover:border-primary/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium">Scontrino</span>
                </Button>
              }
            />

            <BankOCRDialog 
              trigger={
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2 neo-glass border-border/50 hover:border-primary/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium">Banca</span>
                </Button>
              }
            />
          </div>
        </div>

        {/* View All Expenses */}
        <div className="px-4 pb-20">
          <Button 
            variant="ghost" 
            className="w-full justify-between h-12 text-sm neo-glass hover:bg-muted/50"
            onClick={() => navigate('/simple-expenses')}
          >
            <span>Vedi tutte le spese</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </SimpleLayout>
  );
}
