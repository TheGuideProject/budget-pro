import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function FamilyTransferForm() {
  const { user } = useAuth();
  const { linkedProfile } = useUserProfile();
  const { createTransfer } = useBudgetTransfers();
  const { addExpense } = useBudgetStore();

  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = addMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: it }),
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!linkedProfile || !user) {
      toast.error('Nessun profilo secondario collegato');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    setIsSubmitting(true);
    try {
      const transferDesc = description || `Bonifico a ${linkedProfile.displayName}`;

      const { error: transferError } = await createTransfer(
        linkedProfile.userId,
        amountNum,
        month,
        transferDesc
      );

      if (transferError) throw transferError;

      const [year, monthNum] = month.split('-');
      const expenseDate = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);

      await addExpense(
        {
          id: crypto.randomUUID(),
          description: transferDesc,
          amount: amountNum,
          category: 'fissa',
          date: expenseDate,
          recurring: false,
          expenseType: 'privata',
          paymentMethod: 'bonifico',
          isFamilyExpense: true,
        },
        user.id
      );

      toast.success(`Trasferimento di €${amountNum.toFixed(2)} creato`);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('Errore durante la creazione del trasferimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!linkedProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Trasferisci Budget
          </CardTitle>
          <CardDescription>
            Nessun profilo secondario collegato. Chiedi al familiare di andare in “Budget Familiare” → “Impostazioni” e collegarsi al tuo profilo dalla lista.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Trasferisci Budget
        </CardTitle>
        <CardDescription>Invia budget mensile a {linkedProfile.displayName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Mese</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione (opzionale)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Bonifico a ${linkedProfile.displayName}`}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creazione...' : 'Crea Trasferimento'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
