import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertTriangle, XCircle, Loader2, ImageIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Invoice } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentVerificationProps {
  invoice: Invoice;
  onVerified: (verified: boolean, screenshotUrl?: string, method?: 'ocr' | 'manual') => void;
}

export function PaymentVerification({ invoice, onVerified }: PaymentVerificationProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get signed URL for existing screenshot
  useEffect(() => {
    const existingPath = (invoice as any).paymentScreenshotUrl;
    if (existingPath && !existingPath.startsWith('data:')) {
      // Extract the path from the URL if it's a full URL
      const path = existingPath.includes('/storage/v1/object/') 
        ? existingPath.split('/payment-screenshots/')[1]
        : existingPath;
      
      if (path) {
        supabase.storage
          .from('payment-screenshots')
          .createSignedUrl(path, 3600) // 1 hour expiry
          .then(({ data }) => {
            if (data?.signedUrl) {
              setSignedUrl(data.signedUrl);
            }
          });
      }
    }
  }, [invoice]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsLoading(true);
    setOcrResult(null);

    try {
      // Convert to base64 for preview and OCR
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;
      setPreview(base64);

      // Upload to storage with user_id folder for RLS
      const fileName = `${user.id}/${invoice.id}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error('Errore durante il caricamento: ' + uploadError.message);
      }

      // Store the path (not public URL) for later signed URL generation
      const storagePath = fileName;

      // Call OCR function
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-payment', {
        body: {
          imageBase64: base64,
          expectedAmount: invoice.remainingAmount > 0 ? invoice.remainingAmount : invoice.totalAmount,
          invoiceNumber: invoice.invoiceNumber
        }
      });

      if (ocrError) {
        throw new Error('Errore OCR: ' + ocrError.message);
      }

      setOcrResult(ocrData);

      if (ocrData.verified) {
        onVerified(true, storagePath, 'ocr');
        toast.success('Pagamento verificato con OCR!');
      } else {
        toast.warning(ocrData.message || 'Verifica manuale richiesta');
      }

    } catch (err) {
      console.error('Verification error:', err);
      toast.error(err instanceof Error ? err.message : 'Errore durante la verifica');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualConfirm = async () => {
    if (preview && user) {
      // If we have a preview, upload it
      try {
        const fileName = `${user.id}/${invoice.id}-${Date.now()}-manual.jpg`;
        const blob = await fetch(preview).then(r => r.blob());
        
        const { error: uploadError } = await supabase.storage
          .from('payment-screenshots')
          .upload(fileName, blob);

        if (!uploadError) {
          onVerified(true, fileName, 'manual');
        } else {
          onVerified(true, undefined, 'manual');
        }
      } catch {
        onVerified(true, undefined, 'manual');
      }
    } else {
      onVerified(true, undefined, 'manual');
    }
    toast.success('Pagamento confermato manualmente');
  };

  const getVerificationStatus = () => {
    const paymentVerified = (invoice as any).paymentVerified;
    const verificationMethod = (invoice as any).verificationMethod;
    
    if (invoice.status !== 'pagata' && invoice.status !== 'parziale') {
      return null;
    }

    if (paymentVerified && verificationMethod === 'ocr') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verificato OCR
        </Badge>
      );
    }

    if (paymentVerified && verificationMethod === 'manual') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Confermato manualmente
        </Badge>
      );
    }

    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <XCircle className="h-3 w-3 mr-1" />
        Non verificato
      </Badge>
    );
  };

  const existingScreenshot = (invoice as any).paymentScreenshotUrl;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Verifica Pagamento
          </span>
          {getVerificationStatus()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Screenshot pagamento"
              className="w-full h-32 object-contain rounded-lg bg-muted"
            />
          </div>
        )}

        {(existingScreenshot || signedUrl) && !preview && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Visualizza Screenshot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Screenshot Pagamento</DialogTitle>
              </DialogHeader>
              {signedUrl ? (
                <img
                  src={signedUrl}
                  alt="Screenshot pagamento"
                  className="w-full rounded-lg"
                />
              ) : (
                <p className="text-muted-foreground">Caricamento...</p>
              )}
            </DialogContent>
          </Dialog>
        )}

        {ocrResult && (
          <Alert variant={ocrResult.verified ? 'default' : 'destructive'}>
            <AlertDescription className="text-sm">
              {ocrResult.message}
              {ocrResult.amount && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Importo rilevato: €{ocrResult.amount?.toFixed(2)}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Carica Screenshot Banca
              </>
            )}
          </Button>

          {(invoice.status === 'pagata' || invoice.status === 'parziale') && 
           !(invoice as any).paymentVerified && (
            <Button
              onClick={handleManualConfirm}
              variant="ghost"
              size="sm"
              className="text-yellow-500 hover:text-yellow-400"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Conferma senza verifica OCR
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
