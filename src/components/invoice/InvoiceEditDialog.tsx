import { useState, useEffect, useRef } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus, Trash2, CalendarIcon, Save, Upload, FileText, ExternalLink, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Invoice, InvoiceItem } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InvoiceEditDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Invoice>) => void;
}

export function InvoiceEditDialog({ invoice, open, onOpenChange, onSave }: InvoiceEditDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientVat, setClientVat] = useState('');
  const [projectName, setProjectName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [paymentDays, setPaymentDays] = useState(60);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidDate, setPaidDate] = useState<Date | undefined>(undefined);
  const [excludeFromBudget, setExcludeFromBudget] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setClientName(invoice.clientName);
      setClientAddress(invoice.clientAddress);
      setClientVat(invoice.clientVat || '');
      setProjectName(invoice.projectName);
      setInvoiceDate(new Date(invoice.invoiceDate));
      setDueDate(new Date(invoice.dueDate));
      setItems([...invoice.items]);
      setPaidAmount(invoice.paidAmount || 0);
      setPaidDate(invoice.paidDate ? new Date(invoice.paidDate) : undefined);
      setExcludeFromBudget(invoice.excludeFromBudget || false);
      setPdfUrl(invoice.pdfUrl);
      
      // Calculate payment days from dates
      const diffDays = Math.round((new Date(invoice.dueDate).getTime() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) setPaymentDays(0);
      else if (diffDays <= 22) setPaymentDays(15);
      else if (diffDays <= 45) setPaymentDays(30);
      else if (diffDays <= 75) setPaymentDays(60);
      else setPaymentDays(90);
    }
  }, [invoice]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: number | string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { 
      id: crypto.randomUUID(), 
      quantity: 1, 
      description: '', 
      unitPrice: 500, 
      amount: 500 
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo file PDF sono accettati');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Il file non può superare i 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = 'pdf';
      const fileName = `${user.id}/${invoice?.id || crypto.randomUUID()}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('invoice-pdfs')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('invoice-pdfs')
        .getPublicUrl(fileName);

      setPdfUrl(publicUrl);
      toast.success('PDF caricato con successo');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Errore nel caricamento del PDF');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePdf = async () => {
    if (!pdfUrl || !user) return;
    
    try {
      // Extract file path from URL
      const urlParts = pdfUrl.split('/invoice-pdfs/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('invoice-pdfs').remove([filePath]);
      }
      setPdfUrl(undefined);
      toast.success('PDF rimosso');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Errore nella rimozione del PDF');
    }
  };

  const handleSave = () => {
    if (!invoice) return;

    const total = calculateTotal();
    const remaining = total - paidAmount;
    let status = invoice.status;
    
    // Update status based on payment
    if (paidAmount > 0 && paidAmount < total) {
      status = 'parziale';
    } else if (paidAmount >= total) {
      status = 'pagata';
    }

    const updates: Partial<Invoice> = {
      invoiceNumber,
      clientName,
      clientAddress,
      clientVat,
      projectName,
      invoiceDate,
      dueDate: addDays(invoiceDate, paymentDays),
      items,
      totalAmount: total,
      paidAmount,
      paidDate: paidAmount > 0 ? (paidDate || new Date()) : undefined,
      remainingAmount: remaining,
      status,
      paymentTerms: `Payment terms: ${paymentDays} Days`,
      excludeFromBudget,
      pdfUrl,
    };

    onSave(invoice.id, updates);
    toast.success('Fattura aggiornata');
    onOpenChange(false);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Fattura</DialogTitle>
          <DialogDescription>
            Modifica i dettagli della fattura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Invoice Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Numero Fattura</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Termini Pagamento</Label>
              <Select
                value={paymentDays.toString()}
                onValueChange={(value) => setPaymentDays(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Immediato</SelectItem>
                  <SelectItem value="15">15 giorni</SelectItem>
                  <SelectItem value="30">30 giorni</SelectItem>
                  <SelectItem value="60">60 giorni</SelectItem>
                  <SelectItem value="90">90 giorni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client Info */}
          <div className="space-y-3">
            <h4 className="font-semibold">Dati Cliente</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Cliente</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div>
                <Label>P.IVA</Label>
                <Input
                  value={clientVat}
                  onChange={(e) => setClientVat(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Indirizzo</Label>
              <Input
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <Label>Progetto</Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Fattura</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(invoiceDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={invoiceDate}
                    onSelect={(date) => date && setInvoiceDate(date)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Scadenza</Label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {format(addDays(invoiceDate, paymentDays), 'dd MMMM yyyy', { locale: it })}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Voci Fattura</h4>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/50 rounded-lg">
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                  <div className="col-span-6">
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Descrizione..."
                      className="min-h-[40px] resize-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className={cn("col-span-2 text-right font-semibold", item.amount < 0 && "text-destructive")}>
                    {formatCurrency(item.amount)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paid Amount and Date */}
          <div className="space-y-3">
            <h4 className="font-semibold">Pagamento/Anticipo</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Importo Pagato/Anticipo (€)</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Data Incasso</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !paidDate && "text-muted-foreground"
                      )}
                      disabled={paidAmount <= 0}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paidDate ? format(paidDate, 'dd/MM/yyyy') : 'Seleziona data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paidDate}
                      onSelect={setPaidDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">
                  Data in cui l'anticipo è stato accreditato
                </p>
              </div>
            </div>
          </div>

          {/* PDF Upload */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documento PDF
            </h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
            {pdfUrl ? (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">Fattura PDF</p>
                  <a 
                    href={pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Apri PDF <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemovePdf}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Carica PDF Fattura
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Budget Inclusion */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base">Includi nel Budget</Label>
              <p className="text-sm text-muted-foreground">
                Se disattivato, la fattura non sarà conteggiata nel budget previsionale
              </p>
            </div>
            <Switch
              checked={!excludeFromBudget}
              onCheckedChange={(checked) => setExcludeFromBudget(!checked)}
            />
          </div>

          {/* Total */}
          <div className="flex justify-end gap-4 p-4 bg-muted/50 rounded-lg">
            {paidAmount > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Anticipo</p>
                <p className="text-lg font-semibold text-muted-foreground">-{formatCurrency(paidAmount)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                {paidAmount > 0 ? 'Rimanente' : 'Totale'}
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(calculateTotal() - paidAmount)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salva Modifiche
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
