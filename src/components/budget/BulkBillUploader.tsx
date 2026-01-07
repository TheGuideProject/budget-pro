import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Upload, Loader2, FileText, Check, X, Zap, Flame, Droplets, Wifi, Phone, Building, User, Calendar, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, BillType, PaidBy, BILL_TYPES, PAID_BY_OPTIONS } from '@/types';
import { toast } from 'sonner';

interface BillData {
  provider?: string;
  bill_type?: string;
  amount?: number;
  due_date?: string;
  bill_date?: string;
  period_start?: string;
  period_end?: string;
  consumption_value?: number;
  consumption_unit?: string;
  error?: string;
}

interface AnalyzedBill {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  data?: BillData;
  paidBy: PaidBy;
  selected: boolean;
  // Editable fields
  editedPeriodStart?: string;
  editedPeriodEnd?: string;
  editedDueDate?: string;
  editedAmount?: number;
}

const billTypeIcons: Record<string, React.ReactNode> = {
  luce: <Zap className="h-4 w-4 text-yellow-500" />,
  gas: <Flame className="h-4 w-4 text-orange-500" />,
  acqua: <Droplets className="h-4 w-4 text-blue-500" />,
  internet: <Wifi className="h-4 w-4 text-purple-500" />,
  telefono: <Phone className="h-4 w-4 text-green-500" />,
  condominio: <Building className="h-4 w-4 text-gray-500" />,
  rifiuti: <Building className="h-4 w-4 text-amber-500" />,
  altro: <Building className="h-4 w-4 text-gray-400" />,
};

// Calculate billing frequency description
function getBillingFrequencyLabel(periodStart?: string, periodEnd?: string): string {
  if (!periodStart || !periodEnd) return 'Non specificato';
  
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days <= 35) return 'Mensile';
  if (days <= 65) return 'Bimestrale';
  if (days <= 95) return 'Trimestrale';
  if (days <= 190) return 'Semestrale';
  return 'Annuale';
}

export function BulkBillUploader() {
  const { user } = useAuth();
  const { addExpense } = useBudgetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [bills, setBills] = useState<AnalyzedBill[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newBills: AnalyzedBill[] = await Promise.all(
      files.map(async (file) => {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        return {
          id: crypto.randomUUID(),
          file,
          preview,
          status: 'pending' as const,
          paidBy: 'Luca' as PaidBy,
          selected: true,
        };
      })
    );

    setBills((prev) => [...prev, ...newBills]);
  };

  const analyzeBills = async () => {
    const pendingBills = bills.filter((b) => b.status === 'pending');
    if (pendingBills.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < pendingBills.length; i++) {
      const bill = pendingBills[i];
      
      setBills((prev) =>
        prev.map((b) =>
          b.id === bill.id ? { ...b, status: 'analyzing' as const } : b
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke('ocr-bill', {
          body: { imageBase64: bill.preview },
        });

        if (error) throw error;

        setBills((prev) =>
          prev.map((b) =>
            b.id === bill.id
              ? { 
                  ...b, 
                  status: data.error ? 'error' : 'done', 
                  data,
                  // Pre-fill editable fields from OCR
                  editedPeriodStart: data.period_start,
                  editedPeriodEnd: data.period_end,
                  editedDueDate: data.due_date,
                  editedAmount: data.amount,
                }
              : b
          )
        );
      } catch (error) {
        console.error('Error analyzing bill:', error);
        setBills((prev) =>
          prev.map((b) =>
            b.id === bill.id
              ? { ...b, status: 'error', data: { error: 'Errore analisi' } }
              : b
          )
        );
      }

      setProgress(((i + 1) / pendingBills.length) * 100);
    }

    setIsProcessing(false);
    toast.success(`${pendingBills.length} bollette analizzate`);
  };

  const updateBillField = (id: string, field: keyof AnalyzedBill, value: any) => {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const saveSelectedBills = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const selectedBills = bills.filter(
      (b) => b.selected && b.status === 'done' && (b.editedAmount || b.data?.amount)
    );

    if (selectedBills.length === 0) {
      toast.error('Nessuna bolletta selezionata');
      return;
    }

    for (const bill of selectedBills) {
      const billType = (bill.data?.bill_type || 'altro') as BillType;
      const provider = bill.data?.provider || 'Fornitore sconosciuto';
      const amount = bill.editedAmount || bill.data?.amount || 0;
      const dueDate = bill.editedDueDate || bill.data?.due_date;
      const periodStart = bill.editedPeriodStart || bill.data?.period_start;
      const periodEnd = bill.editedPeriodEnd || bill.data?.period_end;

      const expense: Expense = {
        id: crypto.randomUUID(),
        description: `${provider} - ${BILL_TYPES.find((b) => b.value === billType)?.label || billType}`,
        amount: amount,
        category: 'fissa',
        date: dueDate ? new Date(dueDate) : new Date(),
        purchaseDate: bill.data?.bill_date ? new Date(bill.data.bill_date) : new Date(),
        bookedDate: dueDate ? new Date(dueDate) : new Date(),
        recurring: false,
        expenseType: 'privata',
        paymentMethod: 'bonifico',
        paidBy: bill.paidBy,
        billType: billType,
        billProvider: provider,
        billPeriodStart: periodStart ? new Date(periodStart) : undefined,
        billPeriodEnd: periodEnd ? new Date(periodEnd) : undefined,
        consumptionValue: bill.data?.consumption_value,
        consumptionUnit: bill.data?.consumption_unit,
        isPaid: true,
        paidAt: new Date(),
      };

      await addExpense(expense, user.id);
    }

    toast.success(`${selectedBills.length} bollette salvate nello storico`);
    setBills([]);
  };

  const toggleBillSelection = (id: string) => {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, selected: !b.selected } : b))
    );
  };

  const updatePaidBy = (id: string, paidBy: PaidBy) => {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, paidBy } : b))
    );
  };

  const removeBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const analyzedCount = bills.filter((b) => b.status === 'done').length;
  const selectedCount = bills.filter((b) => b.selected && b.status === 'done').length;
  const totalSelected = bills
    .filter((b) => b.selected && b.status === 'done')
    .reduce((sum, b) => sum + (b.editedAmount || b.data?.amount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Bulk Bollette (Storico)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFilesSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full h-16 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload className="h-5 w-5 mr-2" />
            Carica più bollette
          </Button>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Analisi in corso...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Bills List */}
        {bills.length > 0 && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className={`p-3 rounded-lg border ${
                  bill.selected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={bill.selected}
                    onChange={() => toggleBillSelection(bill.id)}
                    className="mt-1"
                    disabled={bill.status !== 'done'}
                  />

                  {/* Preview */}
                  <img
                    src={bill.preview}
                    alt="Anteprima"
                    className="w-12 h-12 object-cover rounded"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {bill.status === 'pending' && (
                      <p className="text-sm text-muted-foreground">In attesa di analisi</p>
                    )}
                    {bill.status === 'analyzing' && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Analisi...</span>
                      </div>
                    )}
                    {bill.status === 'error' && (
                      <p className="text-sm text-destructive">{bill.data?.error}</p>
                    )}
                    {bill.status === 'done' && bill.data && (
                      <div className="space-y-2">
                        {/* Provider & Type */}
                        <div className="flex items-center gap-2">
                          {bill.data.bill_type && billTypeIcons[bill.data.bill_type]}
                          <span className="font-medium truncate">
                            {bill.data.provider}
                          </span>
                          {bill.data.bill_type && (
                            <Badge variant="outline" className="text-xs">
                              {BILL_TYPES.find((b) => b.value === bill.data?.bill_type)?.label}
                            </Badge>
                          )}
                        </div>

                        {/* Editable Fields */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Amount */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Importo</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bill.editedAmount || ''}
                              onChange={(e) => updateBillField(bill.id, 'editedAmount', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Due Date */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Scadenza</Label>
                            <Input
                              type="date"
                              value={bill.editedDueDate || ''}
                              onChange={(e) => updateBillField(bill.id, 'editedDueDate', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>

                          {/* Period Start */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Periodo dal</Label>
                            <Input
                              type="date"
                              value={bill.editedPeriodStart || ''}
                              onChange={(e) => updateBillField(bill.id, 'editedPeriodStart', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>

                          {/* Period End */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Periodo al</Label>
                            <Input
                              type="date"
                              value={bill.editedPeriodEnd || ''}
                              onChange={(e) => updateBillField(bill.id, 'editedPeriodEnd', e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Billing Frequency Badge */}
                        {(bill.editedPeriodStart || bill.editedPeriodEnd) && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {getBillingFrequencyLabel(bill.editedPeriodStart, bill.editedPeriodEnd)}
                          </Badge>
                        )}

                        {/* Paid By Selector */}
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <Select
                            value={bill.paidBy}
                            onValueChange={(v: PaidBy) => updatePaidBy(bill.id, v)}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAID_BY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeBill(bill.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {bills.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            {/* Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {analyzedCount}/{bills.length} analizzate, {selectedCount} selezionate
              </span>
              <span className="font-bold">{formatCurrency(totalSelected)}</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {bills.some((b) => b.status === 'pending') && (
                <Button
                  onClick={analyzeBills}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisi...
                    </>
                  ) : (
                    <>Analizza ({bills.filter((b) => b.status === 'pending').length})</>
                  )}
                </Button>
              )}
              {selectedCount > 0 && (
                <Button onClick={saveSelectedBills} variant="default" className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Salva ({selectedCount})
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
