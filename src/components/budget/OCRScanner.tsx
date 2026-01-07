import { useState, useRef } from 'react';
import { Camera, Loader2, Check, X, AlertCircle, FolderOpen, ArrowRightLeft, Receipt, List, Upload, Sparkles, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, ExpenseCategory, PaymentMethod, ExpenseType, EXPENSE_CATEGORIES, Project } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { addMonths, startOfMonth, setDate } from 'date-fns';

interface ExtractedItem {
  description: string;
  amount: number;
  category: ExpenseCategory;
  originalAmount?: number;
}

interface OCRResult {
  items: ExtractedItem[];
  total?: number;
  date?: string;
  error?: string;
  originalCurrency?: string;
  originalCurrencySymbol?: string;
  originalTotal?: number;
  exchangeRate?: number;
  convertedTotal?: number;
  currencyWarning?: string;
}

type ImportMode = 'total' | 'items';

export function OCRScanner() {
  const { user } = useAuth();
  const { addExpense, addProject, projects } = useBudgetStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [showModeSelection, setShowModeSelection] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('total');

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExtractedItem | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
    description: string;
    amount: number;
    category: ExpenseCategory;
    expenseType: ExpenseType;
    paymentMethod: PaymentMethod;
    projectId: string;
    notes: string;
    date: string;
    newProjectName: string;
  }>({
    description: '',
    amount: 0,
    category: 'variabile',
    expenseType: 'privata',
    paymentMethod: 'contanti',
    projectId: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    newProjectName: '',
  });

  const processImage = async (imageBase64: string) => {
    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
        body: { imageBase64 },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setResult({ items: [], error: data.error });
      } else {
        setResult(data as OCRResult);
        if (data.items?.length > 0 || data.total) {
          setShowModeSelection(true);
          toast.success('Scontrino analizzato!');
        } else {
          toast.info('Nessuna spesa rilevata');
        }
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Errore durante l\'analisi dell\'immagine');
      setResult({ items: [], error: 'Errore di elaborazione' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const openExpenseForm = (item: ExtractedItem) => {
    setSelectedItem(item);
    setExpenseForm({
      description: item.description,
      amount: item.amount,
      category: item.category,
      expenseType: 'privata',
      paymentMethod: 'contanti',
      projectId: '',
      notes: item.originalAmount && result?.originalCurrency 
        ? `Importo originale: ${result.originalCurrencySymbol || result.originalCurrency}${item.originalAmount.toFixed(2)}`
        : '',
      date: result?.date || new Date().toISOString().split('T')[0],
      newProjectName: '',
    });
    setShowExpenseForm(true);
  };

  const openTotalExpenseForm = () => {
    if (!result?.total && !result?.convertedTotal) return;
    
    const totalAmount = result.convertedTotal || result.total || 0;
    
    setSelectedItem({
      description: 'Scontrino',
      amount: totalAmount,
      category: 'variabile',
      originalAmount: result.originalTotal,
    });
    
    setExpenseForm({
      description: 'Scontrino',
      amount: totalAmount,
      category: 'variabile',
      expenseType: 'privata',
      paymentMethod: 'contanti',
      projectId: '',
      notes: buildTotalNotes(),
      date: result?.date || new Date().toISOString().split('T')[0],
      newProjectName: '',
    });
    setShowExpenseForm(true);
    setShowModeSelection(false);
  };

  const buildTotalNotes = (): string => {
    const notes: string[] = ['Importato da scontrino OCR'];
    
    if (result?.originalCurrency && result.originalCurrency !== 'EUR') {
      notes.push(`Valuta originale: ${result.originalCurrencySymbol || result.originalCurrency}`);
      if (result.originalTotal) {
        notes.push(`Importo originale: ${result.originalCurrencySymbol}${result.originalTotal.toFixed(2)}`);
      }
      if (result.exchangeRate) {
        notes.push(`Tasso di cambio: ${result.exchangeRate.toFixed(4)}`);
      }
    }
    
    if (result?.items?.length) {
      notes.push(`Voci: ${result.items.map(i => i.description).join(', ')}`);
    }
    
    return notes.join('\n');
  };

  const calculateBookedDate = (purchaseDate: Date, paymentMethod: PaymentMethod): Date => {
    if (paymentMethod === 'carta_credito') {
      const nextMonth = addMonths(startOfMonth(purchaseDate), 1);
      return setDate(nextMonth, 10);
    }
    return purchaseDate;
  };

  const handleSaveExpense = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    if (!expenseForm.description || expenseForm.amount <= 0) {
      toast.error('Inserisci descrizione e importo validi');
      return;
    }

    let projectId = expenseForm.projectId;
    if (expenseForm.expenseType === 'aziendale' && !projectId) {
      if (expenseForm.newProjectName) {
        const newProject: Project = {
          id: crypto.randomUUID(),
          name: expenseForm.newProjectName,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await addProject(newProject, user.id);
        projectId = newProject.id;
        toast.success(`Progetto "${expenseForm.newProjectName}" creato`);
      } else {
        toast.error('Per spese aziendali, seleziona o crea un progetto');
        return;
      }
    }

    const purchaseDate = new Date(expenseForm.date);
    const bookedDate = calculateBookedDate(purchaseDate, expenseForm.paymentMethod);

    let attachmentUrl: string | undefined = undefined;
    if (expenseForm.expenseType === 'aziendale' && previewImage && projectId) {
      try {
        const base64Data = previewImage.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        const expenseId = crypto.randomUUID();
        const fileName = `${user.id}/${projectId}/${expenseId}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('expense-receipts')
          .upload(fileName, blob);

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage
            .from('expense-receipts')
            .getPublicUrl(fileName);
          attachmentUrl = publicUrl.publicUrl;
          toast.success('Scontrino salvato nel progetto!');
        }
      } catch (err) {
        console.error('Receipt upload error:', err);
      }
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      description: expenseForm.description,
      amount: expenseForm.amount,
      category: expenseForm.category,
      date: purchaseDate,
      purchaseDate,
      bookedDate,
      recurring: false,
      expenseType: expenseForm.expenseType,
      projectId: projectId || undefined,
      paymentMethod: expenseForm.paymentMethod,
      notes: expenseForm.notes || undefined,
      attachmentUrl: attachmentUrl || undefined,
    };

    await addExpense(expense, user.id);
    toast.success('Spesa aggiunta!');

    if (result && selectedItem && importMode === 'items') {
      setResult({
        ...result,
        items: result.items.filter((i) => i !== selectedItem),
      });
    } else {
      reset();
    }

    setShowExpenseForm(false);
    setSelectedItem(null);
  };

  const handleAddAll = async () => {
    if (!result?.items.length || !user) {
      if (!user) toast.error('Devi essere autenticato');
      return;
    }

    for (const item of result.items) {
      const purchaseDate = result.date ? new Date(result.date) : new Date();
      const expense: Expense = {
        id: crypto.randomUUID(),
        description: item.description,
        amount: item.amount,
        category: item.category,
        date: purchaseDate,
        purchaseDate,
        bookedDate: purchaseDate,
        recurring: false,
        expenseType: 'privata',
        paymentMethod: 'contanti',
        notes: item.originalAmount && result.originalCurrency
          ? `Importo originale: ${result.originalCurrencySymbol || result.originalCurrency}${item.originalAmount.toFixed(2)}`
          : undefined,
      };
      await addExpense(expense, user.id);
    }

    toast.success(`${result.items.length} spese aggiunte!`);
    reset();
  };

  const reset = () => {
    setPreviewImage(null);
    setResult(null);
    setShowModeSelection(false);
    setImportMode('total');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const categoryLabels: Record<ExpenseCategory, string> = {
    fissa: 'Fissa',
    variabile: 'Variabile',
    carta_credito: 'Carta Credito',
    casa: 'Casa',
    salute: 'Salute',
    trasporti: 'Trasporti',
    cibo: 'Cibo',
    svago: 'Svago',
    abbonamenti: 'Abbonamenti',
    animali: 'Animali',
    viaggi: 'Viaggi',
    varie: 'Varie',
  };

  const handleModeConfirm = () => {
    setShowModeSelection(false);
    if (importMode === 'total') {
      openTotalExpenseForm();
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="p-4 space-y-4">
        {!previewImage ? (
          /* Upload Area - Modern Design */
          <div 
            className={cn(
              "relative group cursor-pointer",
              "border-2 border-dashed border-border/60 rounded-2xl",
              "transition-all duration-300",
              "hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-base font-medium mb-1">Carica uno scontrino</p>
              <p className="text-sm text-muted-foreground mb-6">
                Scatta una foto o seleziona un'immagine
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
                <Button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 h-12 gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                >
                  <Camera className="h-5 w-5" />
                  Fotocamera
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-12 gap-2 rounded-xl"
                >
                  <Image className="h-5 w-5" />
                  Galleria
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Preview & Results */
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
              <img
                src={previewImage}
                alt="Scontrino"
                className="max-h-[200px] w-full object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <span className="text-sm font-medium">Analisi AI in corso...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Currency Conversion Info */}
            {result?.originalCurrency && result.originalCurrency !== 'EUR' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <ArrowRightLeft className="h-5 w-5 text-primary shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Valuta convertita: </span>
                  {result.originalCurrencySymbol}{result.originalTotal?.toFixed(2)} → €{result.convertedTotal?.toFixed(2)}
                </div>
              </div>
            )}

            {result?.currencyWarning && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="text-sm">{result.currencyWarning}</span>
              </div>
            )}

            {/* Results - Items mode */}
            {result && importMode === 'items' && !showModeSelection && (
              <div className="space-y-3">
                {result.error ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    <span className="text-sm">{result.error}</span>
                  </div>
                ) : result.items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    Nessuna spesa rilevata nell'immagine
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        {result.items.length} spese trovate
                      </Badge>
                      <Button size="sm" onClick={handleAddAll} className="gap-1 rounded-lg">
                        <Check className="h-4 w-4" />
                        Aggiungi Tutte
                      </Button>
                    </div>

                    {result.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {categoryLabels[item.category]}
                          </Badge>
                          <span className="font-medium truncate">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-lg">{formatCurrency(item.amount)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openExpenseForm(item)}
                            className="rounded-lg"
                          >
                            Modifica
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1 h-12 rounded-xl gap-2">
                <X className="h-5 w-5" />
                Annulla
              </Button>
              <Button
                onClick={() => {
                  reset();
                  setTimeout(() => cameraInputRef.current?.click(), 100);
                }}
                variant="secondary"
                className="flex-1 h-12 rounded-xl gap-2"
                disabled={isProcessing}
              >
                <Camera className="h-5 w-5" />
                Nuova
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Import Mode Selection Dialog */}
      <Dialog open={showModeSelection} onOpenChange={setShowModeSelection}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Come vuoi importare?</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {(result?.total || result?.convertedTotal) && (
              <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Totale scontrino</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(result.convertedTotal || result.total || 0)}
                </p>
                {result.originalCurrency && result.originalCurrency !== 'EUR' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    (originale: {result.originalCurrencySymbol}{result.originalTotal?.toFixed(2)})
                  </p>
                )}
              </div>
            )}

            <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
              <div 
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  importMode === 'total' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )} 
                onClick={() => setImportMode('total')}
              >
                <RadioGroupItem value="total" id="total" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="total" className="flex items-center gap-2 cursor-pointer text-base font-medium">
                    <Receipt className="h-5 w-5 text-primary" />
                    Totale unico
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importa come singola spesa (consigliato)
                  </p>
                </div>
              </div>

              {result?.items && result.items.length > 0 && (
                <div 
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    importMode === 'items' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )} 
                  onClick={() => setImportMode('items')}
                >
                  <RadioGroupItem value="items" id="items" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="items" className="flex items-center gap-2 cursor-pointer text-base font-medium">
                      <List className="h-5 w-5 text-primary" />
                      Singole voci ({result.items.length})
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Importa ogni voce come spesa separata
                    </p>
                  </div>
                </div>
              )}
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowModeSelection(false)} className="rounded-xl">
              Annulla
            </Button>
            <Button onClick={handleModeConfirm} className="rounded-xl gap-2">
              <Check className="h-4 w-4" />
              Continua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Detail Form Dialog */}
      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {importMode === 'total' ? 'Dettagli Spesa Totale' : 'Dettagli Spesa'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Descrizione</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Importo (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount || ''}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={expenseForm.expenseType}
                  onValueChange={(value: ExpenseType) =>
                    setExpenseForm((prev) => ({ ...prev, expenseType: value }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privata">Privata</SelectItem>
                    <SelectItem value="aziendale">Aziendale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(value: ExpenseCategory) =>
                    setExpenseForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Metodo Pagamento</Label>
              <Select
                value={expenseForm.paymentMethod}
                onValueChange={(value: PaymentMethod) =>
                  setExpenseForm((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contanti">Contanti</SelectItem>
                  <SelectItem value="bancomat">Bancomat</SelectItem>
                  <SelectItem value="carta_credito">Carta di Credito</SelectItem>
                  <SelectItem value="bonifico">Bonifico</SelectItem>
                </SelectContent>
              </Select>
              {expenseForm.paymentMethod === 'carta_credito' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Verrà contabilizzata il 10 del mese prossimo
                </p>
              )}
            </div>

            {expenseForm.expenseType === 'aziendale' && (
              <div className="space-y-3 p-4 rounded-xl bg-muted/50 border">
                <Label>Progetto *</Label>
                <Select
                  value={expenseForm.projectId}
                  onValueChange={(value) =>
                    setExpenseForm((prev) => ({ ...prev, projectId: value, newProjectName: '' }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleziona progetto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-center text-xs text-muted-foreground">oppure</div>
                <Input
                  placeholder="Crea nuovo progetto..."
                  value={expenseForm.newProjectName}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({ ...prev, newProjectName: e.target.value, projectId: '' }))
                  }
                  className="rounded-xl"
                />
              </div>
            )}

            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="Note opzionali..."
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExpenseForm(false)} className="rounded-xl">
              Annulla
            </Button>
            <Button onClick={handleSaveExpense} className="rounded-xl gap-2">
              <Check className="h-4 w-4" />
              Salva Spesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
