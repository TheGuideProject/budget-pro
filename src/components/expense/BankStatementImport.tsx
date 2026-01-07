import { useState, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, Check, X, Loader2, 
  CheckSquare, Square, ArrowRight, Building2, AlertCircle,
  History, Calendar, FileText, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/types';
import { useBudgetStore } from '@/store/budgetStore';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  suggestedCategory: ExpenseCategory;
  selected: boolean;
}

const categoryConfig: Record<ExpenseCategory, { label: string; color: string }> = {
  fissa: { label: 'Fissa', color: 'bg-blue-500/10 text-blue-600' },
  variabile: { label: 'Variabile', color: 'bg-purple-500/10 text-purple-600' },
  carta_credito: { label: 'Carta Credito', color: 'bg-orange-500/10 text-orange-600' },
  casa: { label: 'Casa', color: 'bg-emerald-500/10 text-emerald-600' },
  salute: { label: 'Salute', color: 'bg-red-500/10 text-red-600' },
  trasporti: { label: 'Trasporti', color: 'bg-sky-500/10 text-sky-600' },
  cibo: { label: 'Cibo', color: 'bg-amber-500/10 text-amber-600' },
  svago: { label: 'Svago', color: 'bg-pink-500/10 text-pink-600' },
  abbonamenti: { label: 'Abbonamenti', color: 'bg-indigo-500/10 text-indigo-600' },
  animali: { label: 'Animali', color: 'bg-lime-500/10 text-lime-600' },
  viaggi: { label: 'Viaggi', color: 'bg-cyan-500/10 text-cyan-600' },
  varie: { label: 'Varie', color: 'bg-gray-500/10 text-gray-600' },
};

export function BankStatementImport() {
  const { user } = useAuth();
  const { profile, isSecondary } = useUserProfile();
  const { addExpensesBulk } = useBudgetStore();
  const { createTransfersBulk } = useBudgetTransfers();
  
  const [importMode, setImportMode] = useState<'current' | 'historical'>('current');
  const [historicalYear, setHistoricalYear] = useState<string>(String(new Date().getFullYear() - 1));
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [bankName, setBankName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<{
    current: number;
    total: number;
    transactionsFound: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (base64: string): Promise<string> => {
    if (base64.length <= 400000) return base64;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1400;
        let { width, height } = img;
        
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        const compressed = canvas.toDataURL('image/jpeg', 0.65).split(',')[1];
        console.log(`Image compressed: ${base64.length} -> ${compressed.length} bytes`);
        resolve(compressed);
      };
      img.onerror = () => resolve(base64);
      img.src = `data:image/jpeg;base64,${base64}`;
    });
  };

  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    cibo: ['supermercato', 'carrefour', 'conad', 'coop', 'esselunga', 'lidl', 'eurospin', 'ristorante', 'pizzeria', 'bar', 'caffè', 'mcdonald', 'burger', 'deliveroo', 'glovo', 'just eat', 'uber eats'],
    trasporti: ['benzina', 'eni', 'q8', 'ip', 'tamoil', 'autostrada', 'telepass', 'trenitalia', 'italo', 'atm', 'metro', 'autobus', 'taxi', 'uber', 'bolt', 'parking', 'parcheggio'],
    casa: ['affitto', 'mutuo', 'condominio', 'ikea', 'leroy merlin', 'bricofer', 'enel', 'eni gas', 'a2a', 'hera', 'acquedotto'],
    abbonamenti: ['netflix', 'spotify', 'amazon prime', 'disney', 'dazn', 'tim', 'vodafone', 'wind', 'iliad', 'fastweb', 'sky', 'now tv', 'apple', 'google', 'microsoft'],
    salute: ['farmacia', 'parafarmacia', 'medico', 'dentista', 'ospedale', 'clinica', 'analisi', 'visita'],
    svago: ['cinema', 'teatro', 'concerto', 'palestra', 'sport', 'amazon', 'zalando', 'shein', 'aliexpress'],
    viaggi: ['hotel', 'booking', 'airbnb', 'ryanair', 'easyjet', 'alitalia', 'aeroporto', 'volo'],
    animali: ['veterinario', 'pet', 'arcaplanet', 'zooplus'],
  };

  const suggestCategory = (description: string): ExpenseCategory => {
    const lowerDesc = description.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => lowerDesc.includes(kw))) {
        return category as ExpenseCategory;
      }
    }
    return 'varie';
  };

  const extractTextFromPdf = async (file: File): Promise<{ text: string; numPages: number }> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return { text: fullText, numPages: pdf.numPages };
  };

  const parseTransactionsFromText = (text: string): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];
    
    const bbvaPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*(?:,\d{2}))\s*EUR/g;
    
    let match;
    while ((match = bbvaPattern.exec(text)) !== null) {
      const [, dataValuta, dataOperazione, descPart, importoStr] = match;
      
      const [day, month, year] = dataOperazione.split('/');
      const date = `${year}-${month}-${day}`;
      
      const cleanedAmount = importoStr.replace(/\./g, '').replace(',', '.');
      const amount = Math.abs(parseFloat(cleanedAmount));
      
      const isNegative = importoStr.startsWith('-');
      const type: 'expense' | 'income' = isNegative ? 'expense' : 'income';
      
      const description = descPart.trim().substring(0, 200);
      
      if (amount > 0.01 && description.length > 2) {
        transactions.push({
          id: `txn-bbva-${transactions.length}-${Date.now()}`,
          date,
          description,
          amount,
          type,
          suggestedCategory: suggestCategory(description),
          selected: type === 'expense',
        });
      }
    }
    
    if (transactions.length >= 10) {
      console.log(`BBVA pattern found ${transactions.length} transactions`);
      return transactions;
    }
    
    const lines = text.split('\n');
    const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
    const amountPattern = /([-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(?:EUR|€)?/;
    
    let currentDate = '';
    let lineBuffer: string[] = [];
    
    const processBuffer = () => {
      if (lineBuffer.length === 0 || !currentDate) return;
      
      const combinedText = lineBuffer.join(' ');
      const amountMatch = combinedText.match(amountPattern);
      
      if (amountMatch) {
        const amountStr = amountMatch[1]
          .replace(/\s/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        const amount = Math.abs(parseFloat(amountStr));
        
        if (amount > 0.01) {
          const isNegative = amountMatch[1].startsWith('-') || combinedText.includes(' - ');
          const type: 'expense' | 'income' = isNegative ? 'expense' : 'income';
          
          let description = combinedText
            .replace(amountPattern, '')
            .replace(datePattern, '')
            .replace(/[-+€EUR]/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200);
          
          if (description.length < 3) description = 'Transazione';
          
          transactions.push({
            id: `txn-text-${transactions.length}-${Date.now()}`,
            date: currentDate,
            description,
            amount,
            type,
            suggestedCategory: suggestCategory(description),
            selected: type === 'expense',
          });
        }
      }
      lineBuffer = [];
    };
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 5) continue;
      
      const dateMatch = trimmedLine.match(datePattern);
      
      if (dateMatch) {
        processBuffer();
        
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3];
        if (year.length === 2) {
          year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        currentDate = `${year}-${month}-${day}`;
        lineBuffer.push(trimmedLine);
      } else if (currentDate) {
        lineBuffer.push(trimmedLine);
      }
    }
    
    processBuffer();
    
    return transactions;
  };

  const convertPdfToImages = async (file: File, maxPages: number = 10): Promise<string[]> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    
    const pagesToProcess = Math.min(pdf.numPages, maxPages);
    
    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      
      const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      images.push(base64);
    }
    
    return images;
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (isPdf) {
        setProcessingProgress({ current: 0, total: 1, transactionsFound: 0 });
        
        const { text, numPages } = await extractTextFromPdf(file);
        console.log(`PDF text extracted: ${text.length} chars from ${numPages} pages`);
        
        let allTransactions = parseTransactionsFromText(text);
        console.log(`Text parsing found ${allTransactions.length} transactions`);
        
        setProcessingProgress({ current: 1, total: 1, transactionsFound: allTransactions.length });
        
        if (allTransactions.length >= 5) {
          setProcessingProgress(null);
          setTransactions(allTransactions);
          setBankName('PDF Estratto Conto');
          setStep('preview');
          toast.success(`Trovate ${allTransactions.length} transazioni in ${numPages} pagine`);
        } else {
          console.log('Text parsing insufficient, falling back to OCR...');
          const images = await convertPdfToImages(file, 10);
          allTransactions = [];
          let detectedBankName = '';
          
          setProcessingProgress({ current: 0, total: images.length, transactionsFound: 0 });
          
          for (let i = 0; i < images.length; i++) {
            setProcessingProgress({ current: i + 1, total: images.length, transactionsFound: allTransactions.length });
            
            const { data, error: fnError } = await supabase.functions.invoke('ocr-bank-statement', {
              body: { imageBase64: images[i] },
            });
            
            if (fnError) throw fnError;
            
            if (data?.transactions) {
              const parsed: ParsedTransaction[] = data.transactions.map((t: any, idx: number) => ({
                id: `txn-pdf${i}-${idx}-${Date.now()}`,
                date: t.date || new Date().toISOString().split('T')[0],
                description: t.description || 'Transazione',
                amount: Math.abs(t.amount || 0),
                type: t.type === 'expense' ? 'expense' : 'income',
                suggestedCategory: t.suggestedCategory || 'varie',
                selected: t.type === 'expense',
              }));
              allTransactions.push(...parsed);
              if (!detectedBankName && data.bankName) {
                detectedBankName = data.bankName;
              }
            }
          }
          
          setProcessingProgress(null);
          
          if (allTransactions.length === 0) {
            throw new Error('Nessuna transazione trovata nel PDF');
          }
          
          setTransactions(allTransactions);
          setBankName(detectedBankName || 'PDF Estratto Conto');
          setStep('preview');
        }
        
      } else if (isImage) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        const rawBase64 = btoa(binary);
        
        const fileContent = await compressImage(rawBase64);
        
        const { data, error: fnError } = await supabase.functions.invoke('ocr-bank-statement', {
          body: { imageBase64: fileContent },
        });
        
        if (fnError) throw fnError;
        
        if (data?.transactions) {
          const parsed: ParsedTransaction[] = data.transactions.map((t: any, idx: number) => ({
            id: `txn-${idx}-${Date.now()}`,
            date: t.date || new Date().toISOString().split('T')[0],
            description: t.description || 'Transazione',
            amount: Math.abs(t.amount || 0),
            type: t.type === 'expense' ? 'expense' : 'income',
            suggestedCategory: t.suggestedCategory || 'varie',
            selected: t.type === 'expense',
          }));
          
          setTransactions(parsed);
          setBankName(data.bankName || 'Banca non riconosciuta');
          setStep('preview');
        } else {
          throw new Error('Nessuna transazione trovata');
        }
      } else {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        
        let data: any;
        let fnError: any;
        
        if (isExcel) {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          bytes.forEach(b => binary += String.fromCharCode(b));
          const fileContent = btoa(binary);
          
          const result = await supabase.functions.invoke('parse-bank-excel', {
            body: { excelBase64: fileContent, fileName: file.name },
          });
          data = result.data;
          fnError = result.error;
        } else {
          const fileContent = await file.text();
          
          const result = await supabase.functions.invoke('parse-bank-csv', {
            body: { csvContent: fileContent, fileName: file.name },
          });
          data = result.data;
          fnError = result.error;
        }
        
        if (fnError) throw fnError;
        
        if (data?.transactions && data.transactions.length > 0) {
          const parsed: ParsedTransaction[] = data.transactions.map((t: any, idx: number) => ({
            id: `txn-${idx}-${Date.now()}`,
            date: t.date || new Date().toISOString().split('T')[0],
            description: t.description || 'Transazione',
            amount: Math.abs(t.amount || 0),
            type: t.type === 'expense' ? 'expense' : 'income',
            suggestedCategory: t.suggestedCategory || 'varie',
            selected: t.type === 'expense',
          }));
          
          setTransactions(parsed);
          setBankName(data.bankName || 'Formato generico');
          setStep('preview');
          toast.success(`Trovate ${parsed.length} transazioni`);
        } else {
          const errorMsg = isExcel 
            ? 'Nessuna transazione trovata nel file Excel. Verifica che il formato sia corretto o prova ad esportare come CSV.'
            : 'Nessuna transazione trovata nel file CSV.';
          throw new Error(errorMsg);
        }
      }
      
      toast.success('File elaborato con successo!');
    } catch (err: any) {
      console.error('Error processing file:', err);
      
      let errorMessage = err.message || 'Errore durante l\'elaborazione del file';
      
      if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('abort')) {
        errorMessage = 'Il file è troppo grande o complesso. Prova con meno pagine o un file più piccolo.';
      } else if (err.message?.includes('Edge Function') || err.message?.includes('Failed to fetch')) {
        errorMessage = 'Errore di connessione al server. Riprova tra qualche secondo.';
      } else if (err.message?.includes('rate limit') || err.message?.includes('429')) {
        errorMessage = 'Troppe richieste. Attendi qualche secondo e riprova.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const toggleTransaction = (id: string) => {
    setTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  const toggleTransactionType = (id: string) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { 
        ...t, 
        type: t.type === 'expense' ? 'income' : 'expense',
        selected: t.type === 'income'
      } : t)
    );
  };

  const updateCategory = (id: string, category: ExpenseCategory) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, suggestedCategory: category } : t)
    );
  };

  const selectAllExpenses = () => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: t.type === 'expense' })));
  };

  const selectAllIncome = () => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: t.type === 'income' })));
  };

  const deselectAll = () => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: false })));
  };

  const importSelected = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const selectedExpenses = transactions.filter(t => t.selected && t.type === 'expense');
    const selectedIncome = transactions.filter(t => t.selected && t.type === 'income');
    
    if (selectedExpenses.length === 0 && selectedIncome.length === 0) {
      toast.error('Seleziona almeno una transazione da importare');
      return;
    }

    if (selectedIncome.length > 0 && isSecondary && !profile?.linkedToUserId) {
      toast.error('Profilo secondario non collegato a un profilo primario');
      return;
    }

    setProcessing(true);
    
    try {
      if (selectedExpenses.length > 0) {
        const expensesToInsert = selectedExpenses.map(txn => {
          const txnDate = new Date(txn.date);
          return {
            id: crypto.randomUUID(),
            description: txn.description,
            amount: txn.amount,
            category: txn.suggestedCategory,
            date: txnDate,
            purchaseDate: txnDate,
            bookedDate: txnDate,
            recurring: false,
            expenseType: 'privata' as const,
            paymentMethod: 'bonifico' as const,
            isFamilyExpense: isSecondary,
            notes: importMode === 'historical' ? `Importato da storico ${historicalYear}` : undefined,
          };
        });
        
        const { error } = await addExpensesBulk(expensesToInsert, user.id);
        if (error) throw error;
      }

      if (isSecondary && profile?.linkedToUserId && selectedIncome.length > 0) {
        const transfersToInsert = selectedIncome.map(txn => {
          const txnDate = new Date(txn.date);
          const month = format(txnDate, 'yyyy-MM');
          return {
            fromUserId: profile.linkedToUserId!,
            amount: txn.amount,
            month,
            description: txn.description,
          };
        });
        
        const { error } = await createTransfersBulk(transfersToInsert);
        if (error) throw error;

        const primaryExpenses = selectedIncome.map(txn => {
          const txnDate = new Date(txn.date);
          return {
            description: txn.description || 'Trasferimento familiare',
            amount: txn.amount,
            category: 'fissa',
            date: txnDate.toISOString(),
            payment_method: 'bonifico',
            expense_type: 'privata',
          };
        });

        const { error: expError } = await supabase.functions.invoke('create-primary-expenses', {
          body: { 
            primaryUserId: profile.linkedToUserId,
            expenses: primaryExpenses 
          }
        });
        
        if (expError) {
          console.error('Warning: spese primario non create', expError);
        }
      }

      const parts: string[] = [];
      if (selectedExpenses.length > 0) parts.push(`${selectedExpenses.length} spese`);
      if (selectedIncome.length > 0) parts.push(`${selectedIncome.length} entrate come trasferimenti`);
      
      toast.success(`Importazione completata: ${parts.join(' e ')}!`);
      setStep('done');
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Errore durante l\'importazione');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setTransactions([]);
    setBankName('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedCount = transactions.filter(t => t.selected).length;
  const selectedExpenseCount = transactions.filter(t => t.selected && t.type === 'expense').length;
  const selectedIncomeCount = transactions.filter(t => t.selected && t.type === 'income').length;
  const expenseCount = transactions.filter(t => t.type === 'expense').length;
  const incomeCount = transactions.filter(t => t.type === 'income').length;

  const monthlyStats = transactions.reduce((acc, txn) => {
    if (txn.type === 'expense') {
      const month = txn.date.substring(0, 7);
      acc[month] = (acc[month] || 0) + txn.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  /* Step: Done */
  if (step === 'done') {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center mb-4">
            <Check className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Importazione Completata!</h3>
          <p className="text-muted-foreground mb-6">
            {importMode === 'historical' 
              ? `Le spese storiche del ${historicalYear} sono state aggiunte`
              : 'Le spese sono state aggiunte al tuo budget'}
          </p>
          <Button onClick={reset} size="lg" className="rounded-xl gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importa altro estratto conto
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* Step: Preview */
  if (step === 'preview') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{bankName}</h3>
              <p className="text-sm text-muted-foreground">
                {transactions.length} transazioni • {expenseCount} spese
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
            <X className="h-4 w-4" />
            Annulla
          </Button>
        </div>

        {importMode === 'historical' && (
          <Badge variant="secondary" className="gap-1">
            <History className="h-3 w-3" />
            Storico {historicalYear}
          </Badge>
        )}

        {/* Monthly summary for historical imports */}
        {importMode === 'historical' && Object.keys(monthlyStats).length > 1 && (
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Riepilogo per Mese
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(monthlyStats)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, total]) => (
                  <Badge key={month} variant="outline" className="text-xs">
                    {month}: €{total.toFixed(0)}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Selection controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              {selectedCount} selezionate
            </Badge>
            {selectedExpenseCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                {selectedExpenseCount} spese
              </Badge>
            )}
            {selectedIncomeCount > 0 && isSecondary && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                {selectedIncomeCount} entrate → trasferimenti
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={selectAllExpenses} className="text-xs">
              Seleziona spese
            </Button>
            {isSecondary && incomeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAllIncome} className="text-xs">
                Seleziona entrate
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs">
              Deseleziona
            </Button>
          </div>
        </div>

        {/* Transactions list */}
        <ScrollArea className="h-[350px] rounded-xl border">
          <div className="p-3 space-y-2">
            {transactions.map((txn) => (
              <div 
                key={txn.id}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  txn.selected 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-muted/20 border-border/50 hover:bg-muted/40"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={txn.selected}
                    onCheckedChange={() => toggleTransaction(txn.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{txn.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{txn.date}</span>
                      <button
                        onClick={() => toggleTransactionType(txn.id)}
                        className="focus:outline-none"
                      >
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs cursor-pointer transition-colors",
                            txn.type === 'income' 
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200' 
                              : 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200'
                          )}
                        >
                          {txn.type === 'income' ? '↑ Entrata' : '↓ Uscita'}
                        </Badge>
                      </button>
                      {txn.type === 'expense' && (
                        <Select 
                          value={txn.suggestedCategory}
                          onValueChange={(v) => updateCategory(txn.id, v as ExpenseCategory)}
                        >
                          <SelectTrigger className="h-6 text-xs w-auto rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "font-bold shrink-0 text-lg",
                    txn.type === 'income' ? 'text-emerald-600' : 'text-foreground'
                  )}>
                    {txn.type === 'income' ? '+' : '-'}€{txn.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Import button */}
        <Button 
          className="w-full h-14 rounded-xl text-base font-semibold gap-2" 
          size="lg"
          onClick={importSelected}
          disabled={selectedCount === 0 || processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Importazione...
            </>
          ) : (
            <>
              <ArrowRight className="h-5 w-5" />
              Importa {selectedExpenseCount > 0 ? `${selectedExpenseCount} spese` : ''}
              {selectedExpenseCount > 0 && selectedIncomeCount > 0 ? ' + ' : ''}
              {selectedIncomeCount > 0 && isSecondary ? `${selectedIncomeCount} trasferimenti` : ''}
              {importMode === 'historical' && ` (${historicalYear})`}
            </>
          )}
        </Button>
      </div>
    );
  }

  /* Step: Upload */
  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setImportMode('current')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
            importMode === 'current'
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="h-4 w-4" />
          Mese Corrente
        </button>
        <button
          onClick={() => setImportMode('historical')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
            importMode === 'historical'
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-4 w-4" />
          Storico
        </button>
      </div>

      {/* Historical year selection */}
      {importMode === 'historical' && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
          <p className="text-sm">
            <strong>Modalità Storico:</strong> Importa estratti conto degli anni precedenti
          </p>
          <div className="flex items-center gap-3">
            <Label className="shrink-0 text-sm">Anno:</Label>
            <Select value={historicalYear} onValueChange={setHistoricalYear}>
              <SelectTrigger className="w-[120px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - i - 1;
                  return (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx,.pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      {/* Upload Area */}
      <div 
        className={cn(
          "relative cursor-pointer group",
          "border-2 border-dashed border-border/60 rounded-2xl",
          "transition-all duration-300",
          "hover:border-primary/50 hover:bg-primary/5",
          processing && "opacity-50 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        {processing ? (
          <div className="p-10 text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
            </div>
            <p className="font-medium">Elaborazione in corso...</p>
            {processingProgress ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Analisi pagina {processingProgress.current} di {processingProgress.total}
                </p>
                <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                  />
                </div>
                {processingProgress.transactionsFound > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {processingProgress.transactionsFound} transazioni trovate
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Analisi delle transazioni...
              </p>
            )}
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            </div>
            <p className="text-base font-medium mb-1">Carica estratto conto</p>
            <p className="text-sm text-muted-foreground mb-2">
              CSV, Excel, PDF o screenshot
            </p>
            {importMode === 'historical' && (
              <p className="text-xs text-amber-600">
                Le date originali del {historicalYear} verranno mantenute
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Supported banks */}
      <div className="pt-4 border-t">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Formati supportati
        </p>
        <div className="flex flex-wrap gap-2">
          {['Intesa Sanpaolo', 'UniCredit', 'Fineco', 'N26', 'Revolut', 'BBVA', 'CSV generico'].map((bank) => (
            <Badge key={bank} variant="secondary" className="text-xs rounded-lg">
              {bank}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
