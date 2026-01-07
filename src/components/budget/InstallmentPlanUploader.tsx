import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Check, X, Calendar, Euro, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, PaidBy, PAID_BY_OPTIONS, ExpenseCategory, EXPENSE_CATEGORIES, BillType, BILL_TYPES } from '@/types';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface Installment {
  number: number;
  amount: number;
  dueDate: string;
  paidBy?: PaidBy;
}

interface ParsedPlan {
  provider: string | null;
  planNumber: string | null;
  customerName: string | null;
  description: string | null;
  totalAmount: number | null;
  installments: Installment[];
}

interface InstallmentPlanUploaderProps {
  onComplete?: () => void;
}

async function convertPdfToImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const scale = 2; // High resolution for better OCR
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d')!;
  await page.render({ canvasContext: context, viewport }).promise;
  
  // Convert to base64 (without data:image prefix)
  return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function InstallmentPlanUploader({ onComplete }: InstallmentPlanUploaderProps) {
  const { user } = useAuth();
  const { addExpense } = useBudgetStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [parsedPlan, setParsedPlan] = useState<ParsedPlan | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [defaultPaidBy, setDefaultPaidBy] = useState<PaidBy>('Luca');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Editable fields for provider, category and billType
  const [editableProvider, setEditableProvider] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('fissa');
  const [selectedBillType, setSelectedBillType] = useState<BillType>('altro');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setParsedPlan(null);

    try {
      let imageBase64: string | null = null;
      let text: string | null = null;

      // For PDFs, convert to image
      if (file.type === 'application/pdf') {
        toast.info('Conversione PDF in corso...');
        imageBase64 = await convertPdfToImage(file);
      }
      // For images, convert directly to base64
      else if (file.type.startsWith('image/')) {
        imageBase64 = await convertImageToBase64(file);
      }
      // For text files
      else {
        text = await file.text();
      }

      await parseWithAI(text, imageBase64);

    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Errore nel processamento del file');
      setIsLoading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseWithAI = async (text: string | null, imageBase64: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke('parse-installment-plan', {
        body: { text, imageBase64 }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      if (data.success && data.plan) {
        // Add default paidBy to all installments
        const planWithPaidBy: ParsedPlan = {
          ...data.plan,
          installments: data.plan.installments.map((inst: Installment) => ({
            ...inst,
            paidBy: defaultPaidBy
          }))
        };
        setParsedPlan(planWithPaidBy);
        setEditableProvider(data.plan.provider || '');
        toast.success(`Trovate ${data.plan.installments.length} rate!`);
      }
    } catch (error) {
      console.error('Error parsing with AI:', error);
      toast.error('Errore nell\'analisi AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallmentChange = (index: number, field: keyof Installment, value: any) => {
    if (!parsedPlan) return;
    
    const updatedInstallments = [...parsedPlan.installments];
    updatedInstallments[index] = { ...updatedInstallments[index], [field]: value };
    setParsedPlan({ ...parsedPlan, installments: updatedInstallments });
  };

  const handleDeleteInstallment = (index: number) => {
    if (!parsedPlan) return;
    
    const updatedInstallments = parsedPlan.installments.filter((_, i) => i !== index);
    // Renumber installments
    const renumbered = updatedInstallments.map((inst, i) => ({ ...inst, number: i + 1 }));
    setParsedPlan({ ...parsedPlan, installments: renumbered });
  };

  const handleApplyDefaultPaidBy = () => {
    if (!parsedPlan) return;
    
    const updatedInstallments = parsedPlan.installments.map(inst => ({
      ...inst,
      paidBy: defaultPaidBy
    }));
    setParsedPlan({ ...parsedPlan, installments: updatedInstallments });
    toast.success(`Assegnato "${defaultPaidBy}" a tutte le rate`);
  };

  const handleConfirmImport = async () => {
    if (!parsedPlan || !user) return;

    setShowConfirmDialog(false);
    setIsLoading(true);

    try {
      let successCount = 0;
      const providerName = editableProvider || parsedPlan.provider || 'Piano Rate';

      for (const installment of parsedPlan.installments) {
        const dueDate = parseISO(installment.dueDate);
        
        const expense: Expense = {
          id: crypto.randomUUID(),
          description: `Rata ${installment.number}/${parsedPlan.installments.length} - ${providerName}`,
          amount: installment.amount,
          category: selectedCategory,
          date: dueDate,
          purchaseDate: dueDate,
          bookedDate: dueDate,
          dueMonth: format(dueDate, 'yyyy-MM'),
          recurring: false,
          expenseType: 'privata',
          paymentMethod: 'bonifico',
          isPaid: false,
          paidBy: installment.paidBy,
          billType: selectedBillType,
          billProvider: providerName,
          notes: `Piano rate: ${parsedPlan.planNumber || 'N/A'} - ${parsedPlan.description || ''}`,
        };

        await addExpense(expense, user.id);
        successCount++;
      }

      toast.success(`Create ${successCount} rate con successo!`);
      setParsedPlan(null);
      setEditableProvider('');
      setSelectedBillType('altro');
      onComplete?.();
    } catch (error) {
      console.error('Error creating expenses:', error);
      toast.error('Errore nella creazione delle rate');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const totalAmount = parsedPlan?.installments.reduce((sum, inst) => sum + inst.amount, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importa Piano Rate
        </CardTitle>
        <CardDescription>
          Carica un documento (PDF, immagine) con un piano rate e l'AI estrarrà automaticamente tutte le scadenze
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!parsedPlan && (
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analisi in corso con AI...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Trascina o clicca per caricare</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, immagini (JPG, PNG) o file di testo
                </p>
              </>
            )}
          </div>
        )}

        {/* Parsed Plan Preview */}
        {parsedPlan && (
          <div className="space-y-4">
            {/* Provider, Category and Bill Type - Editable */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <Label htmlFor="provider">Fornitore</Label>
                <Input
                  id="provider"
                  value={editableProvider}
                  onChange={(e) => setEditableProvider(e.target.value)}
                  placeholder="Es. IRETI, Enel, A2A..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="billType">Tipo Bolletta</Label>
                <Select value={selectedBillType} onValueChange={(v: BillType) => setSelectedBillType(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILL_TYPES.map(bt => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={selectedCategory} onValueChange={(v: ExpenseCategory) => setSelectedCategory(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plan Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">N° Piano</p>
                <p className="font-medium">{parsedPlan.planNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descrizione</p>
                <p className="font-medium">{parsedPlan.description || 'Piano rate'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totale calcolato</p>
                <p className="font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">N° Rate</p>
                <p className="font-medium">{parsedPlan.installments.length}</p>
              </div>
            </div>

            {/* Default Paid By */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label>Chi paga le rate (default)</Label>
                <Select value={defaultPaidBy} onValueChange={(v: PaidBy) => setDefaultPaidBy(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAID_BY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={handleApplyDefaultPaidBy} className="mt-6">
                Applica a tutte
              </Button>
            </div>

            {/* Installments List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Rate estratte ({parsedPlan.installments.length})</Label>
                <Badge variant="secondary">{formatCurrency(totalAmount)}</Badge>
              </div>
              <ScrollArea className="h-[300px] rounded-md border p-2">
                <div className="space-y-2">
                  {parsedPlan.installments.map((inst, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                        {inst.number}
                      </div>
                      
                      {editingIndex === index ? (
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            value={inst.amount}
                            onChange={(e) => handleInstallmentChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                          <Input
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => handleInstallmentChange(index, 'dueDate', e.target.value)}
                            className="h-8"
                          />
                          <Select 
                            value={inst.paidBy} 
                            onValueChange={(v: PaidBy) => handleInstallmentChange(index, 'paidBy', v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAID_BY_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Euro className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{formatCurrency(inst.amount)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(parseISO(inst.dueDate), 'd MMM yyyy', { locale: it })}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {inst.paidBy}
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        >
                          {editingIndex === index ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDeleteInstallment(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setParsedPlan(null)}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button onClick={() => setShowConfirmDialog(true)} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Crea {parsedPlan.installments.length} Rate
              </Button>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma Importazione</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Stai per creare <strong>{parsedPlan?.installments.length} rate</strong> per un totale di <strong>{formatCurrency(totalAmount)}</strong>.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Fornitore: <strong>{editableProvider || 'N/A'}</strong> | Categoria: <strong>{EXPENSE_CATEGORIES.find(c => c.value === selectedCategory)?.label}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Le rate verranno aggiunte come spese con le rispettive date di scadenza e appariranno nel calendario e nel budget.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Annulla
              </Button>
              <Button onClick={handleConfirmImport}>
                Conferma
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
