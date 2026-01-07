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
import { Expense, BILL_TYPES, PAID_BY_OPTIONS, BillType, PaidBy } from '@/types';
import { CATEGORY_PARENTS } from '@/types/categories';
import { useBudgetStore } from '@/store/budgetStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BillEditDialogProps {
  bill: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONSUMPTION_UNITS = ['kWh', 'Smc', 'm³', 'litri'];

export function BillEditDialog({ bill, open, onOpenChange }: BillEditDialogProps) {
  const { updateExpense } = useBudgetStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    billProvider: '',
    billType: '' as BillType | '',
    amount: 0,
    date: new Date(),
    billPeriodStart: undefined as Date | undefined,
    billPeriodEnd: undefined as Date | undefined,
    consumptionValue: undefined as number | undefined,
    consumptionUnit: '' as string,
    paidBy: '' as PaidBy | '',
    isPaid: false,
    notes: '',
    categoryParent: 'casa_utenze',
  });

  useEffect(() => {
    if (bill) {
      setFormData({
        billProvider: bill.billProvider || '',
        billType: (bill.billType as BillType) || '',
        amount: bill.amount,
        date: new Date(bill.date),
        billPeriodStart: bill.billPeriodStart ? new Date(bill.billPeriodStart) : undefined,
        billPeriodEnd: bill.billPeriodEnd ? new Date(bill.billPeriodEnd) : undefined,
        consumptionValue: bill.consumptionValue,
        consumptionUnit: bill.consumptionUnit || '',
        paidBy: (bill.paidBy as PaidBy) || '',
        isPaid: bill.isPaid || false,
        notes: bill.notes || '',
        categoryParent: bill.categoryParent || 'casa_utenze',
      });
    }
  }, [bill]);

  const handleSubmit = async () => {
    if (!bill) return;

    setIsSubmitting(true);
    try {
      await updateExpense(bill.id, {
        billProvider: formData.billProvider || undefined,
        billType: formData.billType || undefined,
        amount: formData.amount,
        date: formData.date,
        billPeriodStart: formData.billPeriodStart,
        billPeriodEnd: formData.billPeriodEnd,
        consumptionValue: formData.consumptionValue,
        consumptionUnit: formData.consumptionUnit || undefined,
        paidBy: formData.paidBy || undefined,
        isPaid: formData.isPaid,
        paidAt: formData.isPaid ? new Date() : undefined,
        notes: formData.notes || undefined,
        categoryParent: formData.categoryParent,
        description: formData.billProvider 
          ? `${formData.billProvider} - ${BILL_TYPES.find(b => b.value === formData.billType)?.label || formData.billType}`
          : bill.description,
      });
      toast.success('Bolletta aggiornata');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Bolletta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="billProvider">Fornitore</Label>
            <Input
              id="billProvider"
              value={formData.billProvider}
              onChange={(e) => setFormData(prev => ({ ...prev, billProvider: e.target.value }))}
              placeholder="Es: Enel Energia"
            />
          </div>

          {/* Bill Type */}
          <div className="space-y-2">
            <Label>Tipo Bolletta</Label>
            <Select
              value={formData.billType}
              onValueChange={(v) => setFormData(prev => ({ ...prev, billType: v as BillType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {BILL_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Period Start */}
          <div className="space-y-2">
            <Label>Periodo Inizio (opzionale)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.billPeriodStart && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.billPeriodStart ? format(formData.billPeriodStart, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.billPeriodStart}
                  onSelect={(d) => setFormData(prev => ({ ...prev, billPeriodStart: d || undefined }))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Period End */}
          <div className="space-y-2">
            <Label>Periodo Fine (opzionale)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.billPeriodEnd && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.billPeriodEnd ? format(formData.billPeriodEnd, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.billPeriodEnd}
                  onSelect={(d) => setFormData(prev => ({ ...prev, billPeriodEnd: d || undefined }))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Consumption */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="consumptionValue">Consumo (opzionale)</Label>
              <Input
                id="consumptionValue"
                type="number"
                step="0.01"
                value={formData.consumptionValue ?? ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  consumptionValue: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="280"
              />
            </div>
            <div className="space-y-2">
              <Label>Unità</Label>
              <Select
                value={formData.consumptionUnit}
                onValueChange={(v) => setFormData(prev => ({ ...prev, consumptionUnit: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unità" />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMPTION_UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
