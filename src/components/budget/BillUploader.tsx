import { useState, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Upload, Loader2, FileText, User, Zap, Flame, Droplets, Wifi, Phone, Trash2, Building, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  address?: string;
  contract_number?: string;
  notes?: string;
  error?: string;
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
  const days = differenceInDays(end, start);
  
  if (days <= 35) return 'Mensile';
  if (days <= 65) return 'Bimestrale';
  if (days <= 95) return 'Trimestrale';
  if (days <= 190) return 'Semestrale';
  return 'Annuale';
}

export function BillUploader() {
  const { user } = useAuth();
  const { addExpense } = useBudgetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [selectedPaidBy, setSelectedPaidBy] = useState<PaidBy>('Luca');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Editable fields
  const [editedAmount, setEditedAmount] = useState<number | null>(null);
  const [editedDueDate, setEditedDueDate] = useState<string>('');
  const [editedPeriodStart, setEditedPeriodStart] = useState<string>('');
  const [editedPeriodEnd, setEditedPeriodEnd] = useState<string>('');
  const [editedConsumption, setEditedConsumption] = useState<number | null>(null);
  const [editedConsumptionUnit, setEditedConsumptionUnit] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze with AI
    setIsAnalyzing(true);
    setBillData(null);

    try {
      const base64Reader = new FileReader();
      base64Reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const { data, error } = await supabase.functions.invoke('ocr-bill', {
          body: { imageBase64: base64 },
        });

        if (error) throw error;
        
        if (data.error) {
          toast.error(data.error);
        } else {
          setBillData(data);
          // Pre-fill editable fields
          setEditedAmount(data.amount || null);
          setEditedDueDate(data.due_date || '');
          setEditedPeriodStart(data.period_start || '');
          setEditedPeriodEnd(data.period_end || '');
          setEditedConsumption(data.consumption_value || null);
          setEditedConsumptionUnit(data.consumption_unit || '');
          toast.success('Bolletta analizzata con successo');
        }
      };
      base64Reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error analyzing bill:', error);
      toast.error('Errore durante l\'analisi della bolletta');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveBill = async () => {
    if (!billData || !editedAmount || !user) {
      toast.error('Dati bolletta incompleti');
      return;
    }

    const billType = (billData.bill_type || 'altro') as BillType;
    const provider = billData.provider || 'Fornitore sconosciuto';

    const expense: Expense = {
      id: crypto.randomUUID(),
      description: `${provider} - ${BILL_TYPES.find(b => b.value === billType)?.label || billType}`,
      amount: editedAmount,
      category: 'fissa',
      date: editedDueDate ? new Date(editedDueDate) : new Date(),
      purchaseDate: billData.bill_date ? new Date(billData.bill_date) : new Date(),
      bookedDate: editedDueDate ? new Date(editedDueDate) : new Date(),
      recurring: true,
      expenseType: 'privata',
      paymentMethod: 'bonifico',
      paidBy: selectedPaidBy,
      billType: billType,
      billProvider: provider,
      billPeriodStart: editedPeriodStart ? new Date(editedPeriodStart) : undefined,
      billPeriodEnd: editedPeriodEnd ? new Date(editedPeriodEnd) : undefined,
      consumptionValue: editedConsumption || billData.consumption_value,
      consumptionUnit: editedConsumptionUnit || billData.consumption_unit,
      notes: billData.notes,
    };

    await addExpense(expense, user.id);
    toast.success(`Bolletta salvata - Pagata da ${selectedPaidBy}`);
    
    // Reset
    handleClear();
  };

  const handleClear = () => {
    setBillData(null);
    setImagePreview(null);
    setEditedAmount(null);
    setEditedDueDate('');
    setEditedPeriodStart('');
    setEditedPeriodEnd('');
    setEditedConsumption(null);
    setEditedConsumptionUnit('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const billingFrequency = getBillingFrequencyLabel(editedPeriodStart, editedPeriodEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Carica Bolletta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full h-20 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Carica foto bolletta
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        {imagePreview && (
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Anteprima bolletta" 
              className="w-full h-32 object-cover rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Bill Data */}
        {billData && !billData.error && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 flex-wrap">
              {billData.bill_type && billTypeIcons[billData.bill_type]}
              <span className="font-semibold">{billData.provider}</span>
              {billData.bill_type && (
                <Badge variant="outline">
                  {BILL_TYPES.find(b => b.value === billData.bill_type)?.label || billData.bill_type}
                </Badge>
              )}
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Importo (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editedAmount || ''}
                  onChange={(e) => setEditedAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-xs">Scadenza</Label>
                <Input
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Periodo dal</Label>
                <Input
                  type="date"
                  value={editedPeriodStart}
                  onChange={(e) => setEditedPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Periodo al</Label>
                <Input
                  type="date"
                  value={editedPeriodEnd}
                  onChange={(e) => setEditedPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Billing Frequency Badge */}
            {(editedPeriodStart && editedPeriodEnd) && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Frequenza: {billingFrequency}
              </Badge>
            )}

            {/* Consumption Fields - Prominent for utilities */}
            {(billData.bill_type === 'luce' || billData.bill_type === 'gas' || billData.bill_type === 'acqua') && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <BarChart3 className="h-4 w-4" />
                  Dati Consumo (per previsionale)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Consumo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedConsumption || ''}
                      onChange={(e) => setEditedConsumption(parseFloat(e.target.value) || 0)}
                      placeholder="es. 150"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unità</Label>
                    <Select
                      value={editedConsumptionUnit}
                      onValueChange={setEditedConsumptionUnit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unità" />
                      </SelectTrigger>
                      <SelectContent>
                        {billData.bill_type === 'luce' && <SelectItem value="kWh">kWh</SelectItem>}
                        {billData.bill_type === 'gas' && <SelectItem value="Smc">Smc</SelectItem>}
                        {billData.bill_type === 'acqua' && <SelectItem value="m³">m³</SelectItem>}
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Consumption info for other bill types */}
            {billData.consumption_value && billData.bill_type !== 'luce' && billData.bill_type !== 'gas' && billData.bill_type !== 'acqua' && (
              <div className="text-sm text-muted-foreground">
                Consumo: {billData.consumption_value} {billData.consumption_unit}
              </div>
            )}

            {/* Paid By Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Chi ha pagato?
              </Label>
              <div className="flex gap-2">
                {PAID_BY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedPaidBy === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPaidBy(option.value)}
                    className="flex-1"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={handleSaveBill}>
              Salva Bolletta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}