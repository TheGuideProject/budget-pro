import { useState } from 'react';
import { format } from 'date-fns';
import { Upload, Plus, Trash2, Check, AlertCircle, FileSpreadsheet, Camera, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Invoice, InvoiceItem } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BulkInvoiceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BulkInvoiceEntry {
  id: string;
  invoiceNumber: string;
  clientName: string;
  projectName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: Invoice['status'];
  excludeFromBudget: boolean;
}

const emptyEntry = (): BulkInvoiceEntry => ({
  id: crypto.randomUUID(),
  invoiceNumber: '',
  clientName: '',
  projectName: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date().toISOString().split('T')[0],
  totalAmount: 0,
  paidAmount: 0,
  status: 'pagata',
  excludeFromBudget: true,
});

export function BulkInvoiceUpload({ open, onOpenChange }: BulkInvoiceUploadProps) {
  const { user } = useAuth();
  const { addInvoice } = useBudgetStore();
  const [entries, setEntries] = useState<BulkInvoiceEntry[]>([emptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrQueue, setOcrQueue] = useState<File[]>([]);
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0 });

  const addEntry = () => {
    setEntries(prev => [...prev, emptyEntry()]);
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof BulkInvoiceEntry, value: any) => {
    setEntries(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const processOCRFile = async (file: File): Promise<BulkInvoiceEntry | null> => {
    try {
      const isPDF = file.type === 'application/pdf';
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const { data, error: fnError } = await supabase.functions.invoke('ocr-invoice', {
        body: { imageBase64: base64, fileType: isPDF ? 'pdf' : 'image' }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        console.error(`OCR error for ${file.name}:`, data.error);
        toast.error(`Errore per ${file.name}: ${data.error}`);
        return null;
      }

      return {
        id: crypto.randomUUID(),
        invoiceNumber: data.invoiceNumber || '',
        clientName: data.clientName || '',
        projectName: data.projectName || '',
        invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || new Date().toISOString().split('T')[0],
        totalAmount: data.totalAmount || 0,
        paidAmount: data.isPaid ? (data.totalAmount || 0) : (data.paidAmount || 0),
        status: data.isPaid ? 'pagata' : (data.status || 'inviata'),
        excludeFromBudget: true,
      };
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err);
      toast.error(`Errore per ${file.name}`);
      return null;
    }
  };

  const handleMultipleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsProcessingOCR(true);
    setOcrProgress({ current: 0, total: fileArray.length });

    const newEntries: BulkInvoiceEntry[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      setOcrProgress({ current: i + 1, total: fileArray.length });
      const entry = await processOCRFile(fileArray[i]);
      if (entry) {
        newEntries.push(entry);
      }
      // Small delay to avoid rate limiting
      if (i < fileArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (newEntries.length > 0) {
      setEntries(prev => {
        const existingValid = prev.filter(e => e.invoiceNumber || e.clientName || e.totalAmount > 0);
        return [...existingValid, ...newEntries];
      });
      toast.success(`${newEntries.length}/${fileArray.length} fatture estratte!`);
    }

    setIsProcessingOCR(false);
    setOcrProgress({ current: 0, total: 0 });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const validEntries = entries.filter(e => 
      e.invoiceNumber && e.clientName && e.totalAmount > 0
    );

    if (validEntries.length === 0) {
      toast.error('Inserisci almeno una fattura valida');
      return;
    }

    setIsSubmitting(true);

    try {
      for (const entry of validEntries) {
        const invoice: Invoice = {
          id: crypto.randomUUID(),
          invoiceNumber: entry.invoiceNumber,
          clientName: entry.clientName,
          clientAddress: '',
          projectName: entry.projectName || entry.clientName,
          invoiceDate: new Date(entry.invoiceDate),
          dueDate: new Date(entry.dueDate),
          items: [{
            id: crypto.randomUUID(),
            description: entry.projectName || 'Servizi',
            quantity: 1,
            unitPrice: entry.totalAmount,
            amount: entry.totalAmount,
          }],
          totalAmount: entry.totalAmount,
          paidAmount: entry.paidAmount,
          remainingAmount: entry.totalAmount - entry.paidAmount,
          status: entry.status,
          paymentTerms: '',
          createdAt: new Date(),
          paymentVerified: entry.status === 'pagata',
          excludeFromBudget: entry.excludeFromBudget,
        };

        await addInvoice(invoice, user.id);
      }

      toast.success(`${validEntries.length} fatture importate!`);
      setEntries([emptyEntry()]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing invoices:', error);
      toast.error('Errore durante l\'importazione');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importazione Fatture Passate
          </DialogTitle>
          <DialogDescription>
            Aggiungi fatture già emesse. Le fatture con "Escludi da budget" attivo non influenzeranno il calcolo del budget mensile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs defaultValue="ocr" className="w-full flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="ocr">
                <Camera className="h-4 w-4 mr-2" />
                OCR da PDF/Immagine
              </TabsTrigger>
              <TabsTrigger value="manual">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Inserimento Manuale
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ocr" className="mt-0">
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Carica più PDF o immagini di fatture (max 20). L'AI estrarrà automaticamente i dati da ogni file.
                    </p>
                    
                    <input
                      type="file"
                      id="ocr-file-input"
                      accept="image/*,.pdf,application/pdf"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleMultipleFiles(e.target.files);
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />

                    {isProcessingOCR && ocrProgress.total > 0 && (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Elaborazione fatture...</span>
                          <span className="font-mono">{ocrProgress.current}/{ocrProgress.total}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(ocrProgress.current / ocrProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('ocr-file-input')?.click()}
                      disabled={isProcessingOCR}
                      className="w-full"
                    >
                      {isProcessingOCR ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Elaborazione {ocrProgress.current}/{ocrProgress.total}...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Carica PDF o Immagini (multipli)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-0">
              <p className="text-sm text-muted-foreground text-center py-4">
                Usa il pulsante "Aggiungi Manualmente" in basso per inserire fatture a mano.
              </p>
            </TabsContent>
          </Tabs>

          {/* Entry list - scrollable area */}
          {entries.some(e => e.invoiceNumber || e.clientName || e.totalAmount > 0) && (
            <div className="flex-1 min-h-0 mt-4 flex flex-col">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <h4 className="font-medium text-sm">Fatture da importare</h4>
                <Badge variant="secondary">{entries.filter(e => e.invoiceNumber && e.clientName && e.totalAmount > 0).length} valide</Badge>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-4 pb-2">
                  {entries.map((entry, idx) => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          {entry.status === 'pagata' && (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Pagata</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">N. Fattura *</Label>
                          <Input
                            placeholder="INV-001"
                            value={entry.invoiceNumber}
                            onChange={(e) => updateEntry(entry.id, 'invoiceNumber', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cliente *</Label>
                          <Input
                            placeholder="Nome cliente"
                            value={entry.clientName}
                            onChange={(e) => updateEntry(entry.id, 'clientName', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Progetto</Label>
                          <Input
                            placeholder="Nome progetto"
                            value={entry.projectName}
                            onChange={(e) => updateEntry(entry.id, 'projectName', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Stato</Label>
                          <Select
                            value={entry.status}
                            onValueChange={(value: Invoice['status']) => updateEntry(entry.id, 'status', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pagata">Pagata</SelectItem>
                              <SelectItem value="parziale">Parziale</SelectItem>
                              <SelectItem value="inviata">Inviata</SelectItem>
                              <SelectItem value="bozza">Bozza</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div>
                          <Label className="text-xs">Data Fattura</Label>
                          <Input
                            type="date"
                            value={entry.invoiceDate}
                            onChange={(e) => updateEntry(entry.id, 'invoiceDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Scadenza</Label>
                          <Input
                            type="date"
                            value={entry.dueDate}
                            onChange={(e) => updateEntry(entry.id, 'dueDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Totale (€) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.totalAmount || ''}
                            onChange={(e) => updateEntry(entry.id, 'totalAmount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Già Pagato (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.paidAmount || ''}
                            onChange={(e) => updateEntry(entry.id, 'paidAmount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Checkbox
                          id={`exclude-${entry.id}`}
                          checked={entry.excludeFromBudget}
                          onCheckedChange={(checked) => updateEntry(entry.id, 'excludeFromBudget', checked)}
                        />
                        <Label htmlFor={`exclude-${entry.id}`} className="text-sm cursor-pointer">
                          Escludi da budget (fattura passata, soldi già spesi)
                        </Label>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={addEntry}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Manualmente
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || entries.filter(e => e.invoiceNumber && e.clientName && e.totalAmount > 0).length === 0}>
              <Check className="h-4 w-4 mr-2" />
              Importa {entries.filter(e => e.invoiceNumber && e.clientName && e.totalAmount > 0).length} Fatture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
