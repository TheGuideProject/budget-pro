import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, Check, X, AlertCircle, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/types';
import { getCategoryParent, getCategoryChild } from '@/types/categories';

interface ParsedExpense {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string;
}

interface VoiceExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseConfirmed: (expense: ParsedExpense) => void;
}

// iOS-compatible audio formats with priority
const SUPPORTED_MIME_TYPES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/m4a',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
];

function getSupportedMimeType(): string | null {
  for (const mimeType of SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return null;
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'm4a';
  }
  if (mimeType.includes('webm')) {
    return 'webm';
  }
  if (mimeType.includes('ogg')) {
    return 'ogg';
  }
  return 'mp4';
}

export function VoiceExpenseSheet({ open, onOpenChange, onExpenseConfirmed }: VoiceExpenseSheetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedMimeTypeRef = useRef<string>('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const startRecording = async () => {
    setError(null);
    setTranscribedText(null);
    setParsedExpense(null);
    chunksRef.current = [];

    const supportedMimeType = getSupportedMimeType();
    if (!supportedMimeType) {
      setError('Il tuo browser non supporta la registrazione audio.');
      toast.error('Formato audio non supportato');
      return;
    }
    selectedMimeTypeRef.current = supportedMimeType;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        await processRecording();
      };

      mediaRecorder.start(100);
      recordingStartRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 100);
      
    } catch (err) {
      console.error('Microphone error:', err);
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError('Microfono non autorizzato. Controlla le impostazioni del browser.');
      } else {
        setError('Impossibile accedere al microfono.');
      }
    }
  };

  const stopRecording = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    const duration = Date.now() - recordingStartRef.current;
    const mimeType = selectedMimeTypeRef.current;
    
    if (chunksRef.current.length === 0) {
      setError('Nessun audio registrato.');
      return;
    }

    const audioBlob = new Blob(chunksRef.current, { type: mimeType });
    
    if (audioBlob.size < 10000 || duration < 500) {
      setError('Registrazione troppo breve. Parla per almeno 1 secondo.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          if (!base64 || base64.length < 100) reject(new Error('Audio conversion failed'));
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read audio'));
        reader.readAsDataURL(audioBlob);
      });

      const fileExtension = getFileExtension(mimeType);

      const transcribeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ audio: base64Audio, mimeType, extension: fileExtension }),
        }
      );

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || 'Errore durante la trascrizione');
      }

      const { text } = await transcribeResponse.json();
      if (!text) throw new Error('Nessun testo riconosciuto.');
      
      setTranscribedText(text);

      const parseResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-parse-expense`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || 'Errore durante l\'analisi');
      }

      const { expense } = await parseResponse.json();
      if (!expense) throw new Error('Non sono riuscito a capire la spesa.');
      
      setParsedExpense(expense);
      toast.success('Spesa riconosciuta!');

    } catch (err) {
      console.error('Processing error:', err);
      const message = err instanceof Error ? err.message : 'Errore durante l\'elaborazione';
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedExpense) {
      onExpenseConfirmed(parsedExpense);
      handleReset();
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setTranscribedText(null);
    setParsedExpense(null);
    setError(null);
    setRecordingDuration(0);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 overflow-hidden">
        <div className="h-full flex flex-col bg-gradient-to-b from-background via-background to-muted/30">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/30">
            <SheetTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Mic className="h-5 w-5 text-primary-foreground" />
              </div>
              Spesa Vocale
            </SheetTitle>
          </SheetHeader>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            {/* Recording Button - Large and prominent */}
            <div className="relative mb-8">
              {/* Animated rings when recording */}
              {isRecording && (
                <>
                  <div className="absolute inset-[-20px] rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-[-12px] rounded-full border-2 border-primary/40 animate-pulse" />
                  <div className="absolute inset-[-28px] rounded-full border border-primary/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
                </>
              )}
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                  'relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300',
                  'shadow-2xl hover:shadow-3xl active:scale-95',
                  isRecording 
                    ? 'bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground' 
                    : 'bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground',
                  isProcessing && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-12 w-12 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-12 w-12" />
                ) : (
                  <Mic className="h-12 w-12" />
                )}
              </button>
            </div>

            {/* Status Text */}
            <div className="text-center space-y-2 mb-8">
              <p className={cn(
                "text-xl font-semibold transition-colors",
                isRecording ? "text-destructive" : "text-foreground"
              )}>
                {isProcessing 
                  ? 'Elaborazione in corso...' 
                  : isRecording 
                    ? `${recordingDuration}s • Tocca per fermare`
                    : 'Tocca e parla'}
              </p>
              {!parsedExpense && !isRecording && !isProcessing && (
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Esempio: "Ho speso 45 euro al supermercato per la spesa"
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="w-full max-w-sm flex items-start gap-3 p-4 bg-destructive/10 rounded-2xl border border-destructive/20 mb-6">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Transcribed Text */}
            {transcribedText && !parsedExpense && (
              <div className="w-full max-w-sm p-4 bg-muted/50 rounded-2xl border mb-6 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Trascrizione</span>
                </div>
                <p className="text-sm italic">"{transcribedText}"</p>
              </div>
            )}

            {/* Parsed Expense Result */}
            {parsedExpense && (
              <div className="w-full max-w-sm space-y-4 animate-in fade-in-0 slide-in-from-bottom-4">
                {/* Transcription preview */}
                {transcribedText && (
                  <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                    <p className="text-xs text-muted-foreground text-center italic">"{transcribedText}"</p>
                  </div>
                )}

                {/* Result Card */}
                <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-3xl border border-primary/20 shadow-lg">
                  <div className="text-center mb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-3">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">Rilevato con AI</span>
                    </div>
                    <p className="text-4xl font-bold text-primary">
                      {formatCurrency(parsedExpense.amount)}
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-primary/10">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Descrizione</span>
                      <span className="font-medium text-sm text-right max-w-[60%] truncate">{parsedExpense.description}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Categoria</span>
                      <Badge variant="secondary" className="capitalize">
                        {parsedExpense.category}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Data</span>
                      <span className="font-medium text-sm">{formatDate(parsedExpense.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl text-base"
                    onClick={handleReset}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Riprova
                  </Button>
                  <Button
                    className="flex-1 h-14 rounded-2xl text-base shadow-lg"
                    onClick={handleConfirm}
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Conferma
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer hint */}
          {!parsedExpense && (
            <div className="px-6 pb-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analisi AI automatica del tuo messaggio vocale</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
