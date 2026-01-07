import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedInvoice {
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  clientVat: string;
  projectName: string;
  invoiceDate: string;
  dueDate: string;
  isPaid?: boolean;
  status?: 'pagata' | 'inviata' | 'parziale' | 'bozza';
  items: Array<{
    quantity: number;
    description: string;
    unitPrice: number;
    amount: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  error?: string;
}

interface InvoiceOCRScannerProps {
  onInvoiceExtracted: (data: ExtractedInvoice) => void;
}

export function InvoiceOCRScanner({ onInvoiceExtracted }: InvoiceOCRScannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Call OCR function - for PDFs, send as base64 and let backend handle it
      const { data, error: fnError } = await supabase.functions.invoke('ocr-invoice', {
        body: { 
          imageBase64: base64, 
          fileType: isPDF ? 'pdf' : 'image' 
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      onInvoiceExtracted(data);
      toast.success('Fattura estratta con successo!');
      
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

  return (
    <Card className="border-dashed w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Importa Fattura (OCR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Carica un PDF o immagine di una fattura esistente
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview && (
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview fattura" 
              className="w-full h-32 object-contain rounded-lg bg-muted"
            />
          </div>
        )}

        {fileName && !preview && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm truncate">{fileName}</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Elaborazione...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Carica PDF o Immagine
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
