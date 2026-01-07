import { useState, useRef } from 'react';
import { Landmark, Camera, Upload, Loader2, Check, X, AlertCircle, ArrowDownCircle, ArrowUpCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  suggestedCategory: string;
  merchant?: string;
  selected: boolean;
  category: ExpenseCategory;
}

interface BankOCRDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BankOCRDialog({ trigger, open: controlledOpen, onOpenChange }: BankOCRDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankName, setBankName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addExpense } = useBudgetStore();
  const { user } = useAuth();
  const { isSecondary } = useUserProfile();

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const resetState = () => {
    setTransactions([]);
    setBankName(null);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setTransactions([]);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Errore lettura file'));
        reader.readAsDataURL(file);
      });

      toast.info('Analisi screenshot in corso...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-bank-statement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64: base64 }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'analisi');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.transactions || data.transactions.length === 0) {
        setError('Nessuna transazione trovata. Assicurati che lo screenshot mostri chiaramente le transazioni.');
        return;
      }

      // Map transactions with selection state and proper category
      const validCategories = EXPENSE_CATEGORIES.map(c => c.value);
      const mappedTransactions: Transaction[] = data.transactions.map((t: any, index: number) => {
        const suggestedCat = t.suggestedCategory;
        const validCategory = validCategories.includes(suggestedCat) ? suggestedCat : 'varie';
        return {
          id: `tx-${index}-${Date.now()}`,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          suggestedCategory: t.suggestedCategory,
          merchant: t.merchant,
          selected: t.type === 'expense',
          category: validCategory as ExpenseCategory,
        };
      });

      setTransactions(mappedTransactions);
      setBankName(data.bankName);
      toast.success(`Trovate ${mappedTransactions.length} transazioni`);
    } catch (err) {
      console.error('Bank OCR error:', err);
      const message = err instanceof Error ? err.message : 'Errore durante l\'analisi';
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
    e.target.value = '';
  };

  const toggleTransaction = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };

  const updateCategory = (id: string, category: ExpenseCategory) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, category } : t
    ));
  };

  const selectAll = () => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: false })));
  };

  const importSelected = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const selectedTx = transactions.filter(t => t.selected && t.type === 'expense');
    
    if (selectedTx.length === 0) {
      toast.error('Seleziona almeno una spesa da importare');
      return;
    }

    let imported = 0;
    for (const tx of selectedTx) {
      const expense: Expense = {
        id: crypto.randomUUID(),
        description: tx.merchant || tx.description,
        amount: tx.amount,
        category: tx.category,
        date: new Date(tx.date),
        purchaseDate: new Date(tx.date),
        bookedDate: new Date(tx.date),
        recurring: false,
        expenseType: 'privata',
        paymentMethod: 'contanti',
        isFamilyExpense: isSecondary,
        notes: `Importato da ${bankName || 'app bancaria'}`,
      };

      await addExpense(expense, user.id);
      imported++;
    }

    toast.success(`Importate ${imported} spese`);
    handleOpenChange(false);
  };

  const selectedCount = transactions.filter(t => t.selected && t.type === 'expense').length;
  const expenseCount = transactions.filter(t => t.type === 'expense').length;

  const dialogContent = (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <Landmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-semibold">Import Banca</span>
            <p className="text-xs text-muted-foreground font-normal">Scansiona screenshot bancario</p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {transactions.length === 0 ? (
        <div className="space-y-4 py-6">
          {/* Upload buttons - Premium 2026 design */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              disabled={isProcessing}
              className="h-32 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
                <Upload className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium">Carica File</span>
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }
              }}
              disabled={isProcessing}
              className="h-32 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Camera className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium">Scatta Foto</span>
            </button>
          </div>

          {isProcessing && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analisi in corso...</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Scatta uno screenshot dell'app della tua banca</p>
            <p className="text-xs mt-1">Supportate: Intesa, UniCredit, N26, Revolut, e altre</p>
          </div>
        </div>
      ) : (
        <>
          {/* Transaction list */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {bankName && (
                <Badge variant="secondary">{bankName}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {selectedCount} di {expenseCount} spese selezionate
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>Tutte</Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>Nessuna</Button>
            </div>
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 pb-4">
              {transactions.map((tx) => (
                <Card 
                  key={tx.id} 
                  className={cn(
                    "cursor-pointer transition-all",
                    tx.selected && "border-primary bg-primary/5",
                    tx.type === 'income' && "opacity-60"
                  )}
                  onClick={() => toggleTransaction(tx.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={tx.selected} 
                        onCheckedChange={() => toggleTransaction(tx.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {tx.type === 'expense' ? (
                            <ArrowDownCircle className="h-4 w-4 text-destructive shrink-0" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-success shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {tx.merchant || tx.description}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{tx.date}</span>
                          <span className={cn(
                            "font-semibold",
                            tx.type === 'expense' ? "text-destructive" : "text-success"
                          )}>
                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                        {tx.type === 'expense' && tx.selected && (
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <Select 
                              value={tx.category} 
                              onValueChange={(v) => updateCategory(tx.id, v as ExpenseCategory)}
                            >
                              <SelectTrigger className="h-8 text-xs">
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
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={resetState}
            >
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              className="flex-1"
              onClick={importSelected}
              disabled={selectedCount === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Importa ({selectedCount})
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  );

  // If controlled, render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode with trigger
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start">
            <Landmark className="h-4 w-4 mr-2 text-accent" />
            Import Banca
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
