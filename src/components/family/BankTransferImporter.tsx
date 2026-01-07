import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';

interface ParsedTransfer {
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  amount: number;
  type: 'revolut' | 'mamy' | 'other';
  description: string;
  bankRowKey: string; // Unique key from CSV row to prevent re-import
  isDuplicate: boolean;
  selected: boolean;
}

export function BankTransferImporter() {
  const [open, setOpen] = useState(false);
  const [parsedTransfers, setParsedTransfers] = useState<ParsedTransfer[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const { transfers, createTransfersBulk } = useBudgetTransfers();
  const { linkedProfile, profile } = useUserProfile();

  const parseCSV = useCallback((content: string) => {
    const lines = content.split('\n');
    const parsed: ParsedTransfer[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Split by semicolon (bank format)
      const parts = line.split(';');
      if (parts.length < 5) continue;
      
      const [dataValuta, , concetto, movimento, importoStr, disponibileStr, osservazioni] = parts;
      
      // Only "Bonifico ricevuto" are incoming transfers
      if (concetto?.trim() !== 'Bonifico ricevuto') continue;
      
      // Determine type from movimento field
      const movimentoLower = movimento?.toLowerCase().trim() || '';
      let type: 'revolut' | 'mamy' | 'other' = 'other';
      
      if (movimentoLower.includes('revolut')) {
        type = 'revolut';
      } else if (movimentoLower.includes('mamy')) {
        type = 'mamy';
      } else {
        // Skip other types of "Bonifico ricevuto" that aren't from primary
        continue;
      }
      
      // Parse date (DD/MM/YYYY format)
      const dateParts = dataValuta?.trim().split('/');
      if (!dateParts || dateParts.length !== 3) continue;
      
      const [day, month, year] = dateParts;
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const monthKey = `${year}-${month.padStart(2, '0')}`;
      
      // Parse amount (Italian format: 123,45)
      const amount = parseFloat(importoStr?.replace(',', '.') || '0');
      if (amount <= 0) continue;
      
      // Generate unique bank_row_key from CSV row data
      const amountFixed = amount.toFixed(2);
      const disponibile = disponibileStr?.replace(',', '.').trim() || '';
      const obs = (osservazioni || '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 50);
      const bankRowKey = `${dateStr}|${type}|${amountFixed}|${disponibile}|${obs}`;
      
      // Check for duplicates using bankRowKey
      const isDuplicate = transfers.some(t => 
        (t as any).bankRowKey === bankRowKey
      );
      
      parsed.push({
        date: dateStr,
        month: monthKey,
        amount,
        type,
        description: type === 'revolut' ? 'Trasferimento Revolut' : 'Trasferimento Mamy',
        bankRowKey,
        isDuplicate,
        selected: true, // Always select, we'll handle duplicates via upsert
      });
    }
    
    // Sort by date descending
    parsed.sort((a, b) => b.date.localeCompare(a.date));
    
    return parsed;
  }, [transfers]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      setParsedTransfers(parsed);
      
      if (parsed.length === 0) {
        toast({
          title: "Nessun trasferimento trovato",
          description: "Il file non contiene bonifici 'Revolut' o 'Mamy'",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file, 'utf-8');
  }, [parseCSV]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const toggleTransfer = (index: number) => {
    setParsedTransfers(prev => prev.map((t, i) => 
      i === index ? { ...t, selected: !t.selected } : t
    ));
  };

  const toggleAll = (selected: boolean) => {
    setParsedTransfers(prev => prev.map(t => ({ ...t, selected })));
  };

  const handleImport = async () => {
    if (!linkedProfile || !profile) {
      toast({ title: "Errore", description: "Profilo non trovato", variant: "destructive" });
      return;
    }
    
    const toImport = parsedTransfers.filter(t => t.selected);
    if (toImport.length === 0) {
      toast({ title: "Nessun trasferimento selezionato", variant: "destructive" });
      return;
    }
    
    setImporting(true);
    
    try {
      const { error, importedCount, skippedCount } = await createTransfersBulk(
        toImport.map(t => ({
          fromUserId: profile.userId,
          toUserId: linkedProfile.userId,
          amount: t.amount,
          month: t.month,
          description: t.description,
          transferDate: t.date,
          bankRowKey: t.bankRowKey,
        }))
      );
      
      if (error) throw error;
      
      toast({
        title: "Import completato",
        description: `Importati ${importedCount} trasferimenti${skippedCount > 0 ? `, ${skippedCount} già presenti` : ''}`,
      });
      
      setOpen(false);
      setParsedTransfers([]);
    } catch (err) {
      toast({
        title: "Errore durante l'import",
        description: err instanceof Error ? err.message : "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = parsedTransfers.filter(t => t.selected && !t.isDuplicate).length;
  const duplicateCount = parsedTransfers.filter(t => t.isDuplicate).length;
  const newCount = parsedTransfers.filter(t => !t.isDuplicate).length;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importa da estratto conto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importa Trasferimenti da CSV Bancario
          </DialogTitle>
          <DialogDescription>
            Carica l'estratto conto CSV per importare automaticamente i bonifici ricevuti
          </DialogDescription>
        </DialogHeader>

        {parsedTransfers.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Trascina qui il file CSV</p>
            <p className="text-sm text-muted-foreground mb-4">oppure</p>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
                Seleziona file
              </label>
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supportati: file CSV con formato banca (Data valuta;Data;Concetto;Movimento;Importo...)
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-1">
                  <Check className="h-3 w-3 text-success" />
                  {newCount} nuovi
                </Badge>
                {duplicateCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {duplicateCount} già importati
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>
                  Seleziona tutti
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>
                  Deseleziona
                </Button>
              </div>
            </div>

            {duplicateCount > 0 && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {duplicateCount} trasferimenti sono già presenti nel database e verranno saltati
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransfers.map((transfer, index) => (
                    <TableRow 
                      key={index} 
                      className={transfer.isDuplicate ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={transfer.selected}
                          disabled={transfer.isDuplicate}
                          onCheckedChange={() => toggleTransfer(index)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(transfer.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transfer.type === 'revolut' ? 'default' : 'secondary'}>
                          {transfer.type === 'revolut' ? 'Revolut' : 'Mamy'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transfer.amount)}
                      </TableCell>
                      <TableCell>
                        {transfer.isDuplicate ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            <X className="h-3 w-3 mr-1" /> Già importato
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-success">
                            <Check className="h-3 w-3 mr-1" /> Nuovo
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter className="flex items-center justify-between gap-4 mt-4">
              <Button 
                variant="ghost" 
                onClick={() => setParsedTransfers([])}
              >
                Cambia file
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} selezionati
                </span>
                <Button 
                  onClick={handleImport} 
                  disabled={selectedCount === 0 || importing}
                  className="gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importazione...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Importa {selectedCount} trasferimenti
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
