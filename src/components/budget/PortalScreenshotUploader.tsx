import { useState, useRef } from 'react';
import { Upload, Loader2, FileText, Check, X, Zap, Flame, Droplets, Wifi, Phone, Building, User, Calendar, Monitor, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, BillType, PaidBy, BILL_TYPES, PAID_BY_OPTIONS } from '@/types';
import { toast } from 'sonner';

interface ExtractedBill {
  provider?: string;
  bill_type?: string;
  amount?: number;
  due_date?: string;
  period_start?: string;
  period_end?: string;
  consumption_value?: number;
  consumption_unit?: string;
  status?: 'pagata' | 'da_pagare';
}

interface ScreenshotResult {
  id: string;
  preview: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  bills: ExtractedBill[];
  error?: string;
}

interface EditableBill extends ExtractedBill {
  id: string;
  screenshotId: string;
  selected: boolean;
  paidBy: PaidBy;
  editedAmount?: number;
  editedDueDate?: string;
  editedPeriodStart?: string;
  editedPeriodEnd?: string;
  editedConsumption?: number;
  editedConsumptionUnit?: string;
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

function getBillingFrequencyLabel(periodStart?: string, periodEnd?: string): string {
  if (!periodStart || !periodEnd) return '';
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 35) return 'Mensile';
  if (days <= 65) return 'Bimestrale';
  if (days <= 95) return 'Trimestrale';
  if (days <= 190) return 'Semestrale';
  return 'Annuale';
}

export function PortalScreenshotUploader() {
  const { user } = useAuth();
  const { addExpense } = useBudgetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [screenshots, setScreenshots] = useState<ScreenshotResult[]>([]);
  const [extractedBills, setExtractedBills] = useState<EditableBill[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // AI Model selection
  const [useOpenAI, setUseOpenAI] = useState(() => {
    const saved = localStorage.getItem('billOcrModel');
    return saved === 'openai';
  });

  const handleModelChange = (checked: boolean) => {
    setUseOpenAI(checked);
    localStorage.setItem('billOcrModel', checked ? 'openai' : 'lovable');
  };

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newScreenshots: ScreenshotResult[] = await Promise.all(
      files.map(async (file) => {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        return {
          id: crypto.randomUUID(),
          preview,
          status: 'pending' as const,
          bills: [],
        };
      })
    );

    setScreenshots((prev) => [...prev, ...newScreenshots]);
  };

  const analyzeScreenshots = async () => {
    const pending = screenshots.filter((s) => s.status === 'pending');
    if (pending.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < pending.length; i++) {
      const screenshot = pending[i];
      
      setScreenshots((prev) =>
        prev.map((s) => s.id === screenshot.id ? { ...s, status: 'analyzing' as const } : s)
      );

      try {
        const { data, error } = await supabase.functions.invoke('ocr-bill', {
          body: { 
            imageBase64: screenshot.preview,
            source: 'screenshot',
            useOpenAI: useOpenAI,
          },
        });

        if (error) throw error;

        if (data.error) {
          setScreenshots((prev) =>
            prev.map((s) => s.id === screenshot.id ? { ...s, status: 'error' as const, error: data.error } : s)
          );
        } else {
          const bills: ExtractedBill[] = data.bills || [data];
          
          setScreenshots((prev) =>
            prev.map((s) => s.id === screenshot.id ? { ...s, status: 'done' as const, bills } : s)
          );

          // Add bills to editable list
          const newEditableBills: EditableBill[] = bills.map((bill) => ({
            ...bill,
            id: crypto.randomUUID(),
            screenshotId: screenshot.id,
            selected: true,
            paidBy: (bill.status === 'pagata' ? 'Luca' : 'Luca') as PaidBy,
            editedAmount: bill.amount,
            editedDueDate: bill.due_date,
            editedPeriodStart: bill.period_start,
            editedPeriodEnd: bill.period_end,
            editedConsumption: bill.consumption_value,
            editedConsumptionUnit: bill.consumption_unit,
          }));

          setExtractedBills((prev) => [...prev, ...newEditableBills]);
        }
      } catch (error) {
        console.error('Error analyzing screenshot:', error);
        setScreenshots((prev) =>
          prev.map((s) => s.id === screenshot.id ? { ...s, status: 'error' as const, error: 'Errore analisi' } : s)
        );
      }

      setProgress(((i + 1) / pending.length) * 100);
    }

    setIsProcessing(false);
    toast.success(`${pending.length} screenshot analizzati`);
  };

  const updateBillField = (id: string, field: keyof EditableBill, value: any) => {
    setExtractedBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const toggleBillSelection = (id: string) => {
    setExtractedBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, selected: !b.selected } : b))
    );
  };

  const removeBill = (id: string) => {
    setExtractedBills((prev) => prev.filter((b) => b.id !== id));
  };

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
    setExtractedBills((prev) => prev.filter((b) => b.screenshotId !== id));
  };

  const saveSelectedBills = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const selected = extractedBills.filter((b) => b.selected && b.editedAmount);
    if (selected.length === 0) {
      toast.error('Nessuna bolletta selezionata');
      return;
    }

    for (const bill of selected) {
      const billType = (bill.bill_type || 'altro') as BillType;
      const provider = bill.provider || 'Fornitore sconosciuto';
      const isPaid = bill.status === 'pagata';

      const expense: Expense = {
        id: crypto.randomUUID(),
        description: `${provider} - ${BILL_TYPES.find((b) => b.value === billType)?.label || billType}`,
        amount: bill.editedAmount || 0,
        category: 'fissa',
        date: bill.editedDueDate ? new Date(bill.editedDueDate) : new Date(),
        purchaseDate: new Date(),
        bookedDate: bill.editedDueDate ? new Date(bill.editedDueDate) : new Date(),
        recurring: false,
        expenseType: 'privata',
        paymentMethod: 'bonifico',
        paidBy: bill.paidBy,
        billType: billType,
        billProvider: provider,
        billPeriodStart: bill.editedPeriodStart ? new Date(bill.editedPeriodStart) : undefined,
        billPeriodEnd: bill.editedPeriodEnd ? new Date(bill.editedPeriodEnd) : undefined,
        consumptionValue: bill.editedConsumption,
        consumptionUnit: bill.editedConsumptionUnit,
        isPaid: isPaid,
        paidAt: isPaid ? new Date() : undefined,
      };

      await addExpense(expense, user.id);
    }

    toast.success(`${selected.length} bollette salvate`);
    setExtractedBills([]);
    setScreenshots([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const selectedCount = extractedBills.filter((b) => b.selected).length;
  const totalSelected = extractedBills.filter((b) => b.selected).reduce((sum, b) => sum + (b.editedAmount || 0), 0);
  const analyzedCount = screenshots.filter((s) => s.status === 'done').length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Screenshot Portale Fornitore
        </CardTitle>
        <CardDescription>
          Carica screenshot delle pagine "Storico Bollette" dai portali web (Enel, Eni, A2A...)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Model Selector */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Modello AI</p>
              <p className="text-xs text-muted-foreground">
                {useOpenAI ? 'OpenAI GPT-4o (a consumo)' : 'Lovable AI (incluso nel piano)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Lovable</span>
            <Switch checked={useOpenAI} onCheckedChange={handleModelChange} />
            <span className="text-xs text-muted-foreground">OpenAI</span>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full h-20 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-5 w-5" />
              <span>Carica screenshot portale</span>
              <span className="text-xs text-muted-foreground">Supporta più immagini</span>
            </div>
          </Button>
        </div>

        {/* Screenshots Preview */}
        {screenshots.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {screenshots.map((screenshot) => (
              <div key={screenshot.id} className="relative shrink-0">
                <img
                  src={screenshot.preview}
                  alt="Screenshot"
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                {screenshot.status === 'analyzing' && (
                  <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {screenshot.status === 'done' && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                    {screenshot.bills.length}
                  </Badge>
                )}
                {screenshot.status === 'error' && (
                  <div className="absolute inset-0 bg-destructive/20 rounded-lg flex items-center justify-center">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5"
                  onClick={() => removeScreenshot(screenshot.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Analisi screenshot in corso...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Analyze Button */}
        {screenshots.some((s) => s.status === 'pending') && (
          <Button onClick={analyzeScreenshots} disabled={isProcessing} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analizza ({screenshots.filter((s) => s.status === 'pending').length} screenshot)
              </>
            )}
          </Button>
        )}

        {/* Extracted Bills */}
        {extractedBills.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bollette Estratte ({extractedBills.length})
            </h4>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {extractedBills.map((bill) => (
                <div
                  key={bill.id}
                  className={`p-3 rounded-lg border ${bill.selected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={bill.selected}
                      onChange={() => toggleBillSelection(bill.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {bill.bill_type && billTypeIcons[bill.bill_type]}
                        <span className="font-medium">{bill.provider}</span>
                        {bill.bill_type && (
                          <Badge variant="outline" className="text-xs">
                            {BILL_TYPES.find((b) => b.value === bill.bill_type)?.label}
                          </Badge>
                        )}
                        {bill.status && (
                          <Badge variant={bill.status === 'pagata' ? 'default' : 'secondary'} className="text-xs">
                            {bill.status === 'pagata' ? 'Pagata' : 'Da pagare'}
                          </Badge>
                        )}
                      </div>

                      {/* Editable Fields */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Importo €</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={bill.editedAmount || ''}
                            onChange={(e) => updateBillField(bill.id, 'editedAmount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Scadenza</Label>
                          <Input
                            type="date"
                            value={bill.editedDueDate || ''}
                            onChange={(e) => updateBillField(bill.id, 'editedDueDate', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Dal</Label>
                          <Input
                            type="date"
                            value={bill.editedPeriodStart || ''}
                            onChange={(e) => updateBillField(bill.id, 'editedPeriodStart', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Al</Label>
                          <Input
                            type="date"
                            value={bill.editedPeriodEnd || ''}
                            onChange={(e) => updateBillField(bill.id, 'editedPeriodEnd', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Consumption for utilities */}
                      {(bill.bill_type === 'luce' || bill.bill_type === 'gas' || bill.bill_type === 'acqua') && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Consumo</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={bill.editedConsumption || ''}
                              onChange={(e) => updateBillField(bill.id, 'editedConsumption', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                              placeholder="es. 150"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Unità</Label>
                            <Select
                              value={bill.editedConsumptionUnit || ''}
                              onValueChange={(v) => updateBillField(bill.id, 'editedConsumptionUnit', v)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Unità" />
                              </SelectTrigger>
                              <SelectContent>
                                {bill.bill_type === 'luce' && <SelectItem value="kWh">kWh</SelectItem>}
                                {bill.bill_type === 'gas' && <SelectItem value="Smc">Smc</SelectItem>}
                                {bill.bill_type === 'acqua' && <SelectItem value="m³">m³</SelectItem>}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Frequency & Paid By */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {(bill.editedPeriodStart && bill.editedPeriodEnd) && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {getBillingFrequencyLabel(bill.editedPeriodStart, bill.editedPeriodEnd)}
                          </Badge>
                        )}
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <Select
                            value={bill.paidBy}
                            onValueChange={(v: PaidBy) => updateBillField(bill.id, 'paidBy', v)}
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
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => removeBill(bill.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary & Save */}
            <div className="pt-3 border-t space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedCount} bollette selezionate
                </span>
                <span className="font-bold">{formatCurrency(totalSelected)}</span>
              </div>
              <Button onClick={saveSelectedBills} className="w-full" disabled={selectedCount === 0}>
                <Check className="h-4 w-4 mr-2" />
                Salva {selectedCount} bollette
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
