import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, FileText, AlertCircle, Building2, User, FileDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { useUserClients } from '@/hooks/useUserClients';

type ImportMode = 'full' | 'company' | 'client';

interface ExtractedData {
  // Sender data
  senderName?: string;
  senderAddress?: string;
  senderVat?: string;
  senderIban?: string;
  senderBic?: string;
  senderBankAddress?: string;
  senderEmail?: string;
  // Client data
  clientName?: string;
  clientAddress?: string;
  clientVat?: string;
  clientEmail?: string;
  // Invoice data
  invoiceNumber?: string;
  projectName?: string;
  invoiceDate?: string;
  dueDate?: string;
  workStartDate?: string;
  workEndDate?: string;
  paymentDays?: number;
  items?: Array<{
    quantity: number;
    description: string;
    unitPrice: number;
    amount: number;
  }>;
  totalAmount?: number;
  paidAmount?: number;
  error?: string;
}

interface InvoiceImportScannerProps {
  onInvoiceExtracted?: (data: ExtractedData) => void;
  onCompanyDataSaved?: () => void;
  defaultMode?: ImportMode;
  showModeSelector?: boolean;
}

export function InvoiceImportScanner({ 
  onInvoiceExtracted, 
  onCompanyDataSaved,
  defaultMode = 'full',
  showModeSelector = true 
}: InvoiceImportScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>(defaultMode);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'confirm'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { updateSettings } = useInvoiceSettings();
  const { addClient } = useUserClients();

  const modeConfig = {
    full: {
      icon: FileDown,
      title: 'Importa Fattura Completa',
      description: 'Estrae tutti i dati e pre-compila il form',
      color: 'text-primary',
    },
    company: {
      icon: Building2,
      title: 'Importa Dati Contabili',
      description: 'Salva IBAN, ragione sociale, etc. nelle impostazioni',
      color: 'text-accent',
    },
    client: {
      icon: User,
      title: 'Importa Cliente',
      description: 'Crea un nuovo cliente dai dati estratti',
      color: 'text-warning',
    },
  };

  const resetState = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    setExtractedData(null);
    setStep('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const isPDF = file.type === 'application/pdf';
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      if (!isPDF) {
        setPreview(base64);
      } else {
        setPreview(null);
      }

      // Call OCR function
      const { data, error: fnError } = await supabase.functions.invoke('ocr-invoice', {
        body: { 
          imageBase64: base64, 
          fileType: isPDF ? 'pdf' : 'image',
          extractMode: mode 
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setExtractedData(data);
      setStep('confirm');
      
    } catch (err) {
      console.error('OCR error:', err);
      setError(err instanceof Error ? err.message : 'Errore durante elaborazione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirm = async () => {
    if (!extractedData) return;

    setIsLoading(true);
    try {
      if (mode === 'company') {
        // Save sender data to invoice settings
        const success = await updateSettings({
          company_name: extractedData.senderName || '',
          company_address: extractedData.senderAddress || '',
          company_vat: extractedData.senderVat || '',
          company_iban: extractedData.senderIban || '',
          company_bic: extractedData.senderBic || '',
          company_bank_address: extractedData.senderBankAddress || '',
          company_email: extractedData.senderEmail || '',
        });
        
        if (success) {
          toast.success('Dati contabili salvati nelle impostazioni!');
          onCompanyDataSaved?.();
          setIsOpen(false);
          resetState();
        }
      } else if (mode === 'client') {
        // Add client to user_clients
        if (extractedData.clientName) {
          await addClient({
            name: extractedData.clientName,
            address: extractedData.clientAddress,
            vat: extractedData.clientVat,
            email: extractedData.clientEmail,
          });
          toast.success(`Cliente "${extractedData.clientName}" salvato!`);
          setIsOpen(false);
          resetState();
        } else {
          setError('Nome cliente non trovato nella fattura');
        }
      } else {
        // Full mode - pass data to parent
        if (onInvoiceExtracted) {
          onInvoiceExtracted(extractedData);
        }
        toast.success('Dati fattura estratti con successo!');
        setIsOpen(false);
        resetState();
      }
    } catch (err) {
      console.error('Error saving data:', err);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreviewData = () => {
    if (!extractedData) return null;

    if (mode === 'company') {
      return (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Dati Mittente Estratti:</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {extractedData.senderName && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Ragione Sociale</span>
                <span className="font-medium">{extractedData.senderName}</span>
              </div>
            )}
            {extractedData.senderAddress && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Indirizzo</span>
                <span className="font-medium">{extractedData.senderAddress}</span>
              </div>
            )}
            {extractedData.senderVat && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">P.IVA</span>
                <span className="font-medium font-mono">{extractedData.senderVat}</span>
              </div>
            )}
            {extractedData.senderIban && (
              <div className="flex justify-between p-2 bg-accent/10 rounded border border-accent/30">
                <span className="text-muted-foreground">IBAN</span>
                <span className="font-medium font-mono text-xs">{extractedData.senderIban}</span>
              </div>
            )}
            {extractedData.senderBic && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">BIC</span>
                <span className="font-medium font-mono">{extractedData.senderBic}</span>
              </div>
            )}
            {extractedData.senderBankAddress && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Banca</span>
                <span className="font-medium">{extractedData.senderBankAddress}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (mode === 'client') {
      return (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Dati Cliente Estratti:</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {extractedData.clientName && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{extractedData.clientName}</span>
              </div>
            )}
            {extractedData.clientAddress && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Indirizzo</span>
                <span className="font-medium">{extractedData.clientAddress}</span>
              </div>
            )}
            {extractedData.clientVat && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">P.IVA</span>
                <span className="font-medium font-mono">{extractedData.clientVat}</span>
              </div>
            )}
            {extractedData.clientEmail && (
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{extractedData.clientEmail}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Full mode
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Dati Fattura Estratti:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {extractedData.invoiceNumber && (
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground block text-xs">N° Fattura</span>
              <span className="font-medium">{extractedData.invoiceNumber}</span>
            </div>
          )}
          {extractedData.clientName && (
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground block text-xs">Cliente</span>
              <span className="font-medium">{extractedData.clientName}</span>
            </div>
          )}
          {extractedData.totalAmount && (
            <div className="p-2 bg-primary/10 rounded border border-primary/30">
              <span className="text-muted-foreground block text-xs">Totale</span>
              <span className="font-bold text-primary">€ {extractedData.totalAmount.toLocaleString('it-IT')}</span>
            </div>
          )}
          {extractedData.dueDate && (
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground block text-xs">Scadenza</span>
              <span className="font-medium">{new Date(extractedData.dueDate).toLocaleDateString('it-IT')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ModeIcon = modeConfig[mode].icon;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="topbar-button">
          <Camera className="h-4 w-4 mr-2" />
          Importa
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Importa da Fattura (OCR)
          </SheetTitle>
          <SheetDescription>
            Carica un PDF o immagine di una fattura esistente
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Mode Selector */}
          {showModeSelector && step === 'select' && (
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)} className="space-y-3">
              {Object.entries(modeConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Label
                    key={key}
                    htmlFor={`mode-${key}`}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      mode === key 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={key} id={`mode-${key}`} />
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{config.title}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          )}

          {step === 'select' && <Separator />}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Preview */}
          {preview && (
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview fattura" 
                className="w-full h-40 object-contain rounded-lg bg-muted"
              />
            </div>
          )}

          {fileName && !preview && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm truncate">{fileName}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Extracted Data Preview */}
          {step === 'confirm' && extractedData && (
            <div className="neo-glass-static p-4 rounded-xl">
              {renderPreviewData()}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {step === 'select' && (
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full gradient-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Elaborazione OCR...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Carica PDF o Immagine
                  </>
                )}
              </Button>
            )}

            {step === 'confirm' && (
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={resetState}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button 
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 gradient-button"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Conferma
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
