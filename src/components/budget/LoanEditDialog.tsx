import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Expense, PAID_BY_OPTIONS, PaidBy } from '@/types';
import { CATEGORY_PARENTS } from '@/types/categories';
import { useBudgetStore } from '@/store/budgetStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LoanEditDialogProps {
  loan: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoanEditDialog({ loan, open, onOpenChange }: LoanEditDialogProps) {
  const { updateExpense } = useBudgetStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    date: new Date(),
    categoryParent: 'finanza_obblighi',
    paidBy: '' as PaidBy | '',
    isPaid: false,
    notes: '',
  });

  useEffect(() => {
    if (loan) {
      setFormData({
        description: loan.description || '',
        amount: loan.amount,
        date: new Date(loan.date),
        categoryParent: loan.categoryParent || 'finanza_obblighi',
        paidBy: (loan.paidBy as PaidBy) || '',
        isPaid: loan.isPaid || false,
        notes: loan.notes || '',
      });
    }
  }, [loan]);

  const handleSubmit = async () => {
    if (!loan) return;

    setIsSubmitting(true);
    try {
      await updateExpense(loan.id, {
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        categoryParent: formData.categoryParent,
        paidBy: formData.paidBy || undefined,
        isPaid: formData.isPaid,
        paidAt: formData.isPaid ? new Date() : undefined,
        notes: formData.notes || undefined,
        // Clear bill-related fields when converting to a different category
        billType: undefined,
        billProvider: undefined,
      });
      toast.success('Rata aggiornata');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating loan:', error);
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Rata/Prestito</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Es: Rata 5/24 Younited"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Importo (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={formData.categoryParent}
              onValueChange={(v) => setFormData(prev => ({ ...prev, categoryParent: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_PARENTS.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Data Scadenza</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, 'dd/MM/yyyy', { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(d) => d && setFormData(prev => ({ ...prev, date: d }))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Label>Chi ha pagato (opzionale)</Label>
            <Select
              value={formData.paidBy}
              onValueChange={(v) => setFormData(prev => ({ ...prev, paidBy: v as PaidBy }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {PAID_BY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Is Paid Switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isPaid">Pagata</Label>
            <Switch
              id="isPaid"
              checked={formData.isPaid}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: checked }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Note aggiuntive..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
