import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, Check, X, AlertCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/types';

interface ParsedExpense {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string;
}

interface VoiceExpenseInputProps {
  onExpenseConfirmed: (expense: ParsedExpense) => void;
}

// iOS-compatible audio formats with priority
const SUPPORTED_MIME_TYPES = [
  'audio/mp4;codecs=mp4a.40.2', // Best for iOS
  'audio/mp4',                   // Fallback iOS
  'audio/m4a',                   // Alternative iOS
  'audio/webm;codecs=opus',      // Chrome/Firefox
  'audio/webm',                  // Generic WebM
  'audio/ogg;codecs=opus',       // Firefox fallback
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

export function VoiceExpenseInput({ onExpenseConfirmed }: VoiceExpenseInputProps) {
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

    // Check for supported MIME type first
    const supportedMimeType = getSupportedMimeType();
    if (!supportedMimeType) {
      setError('Il tuo browser non supporta la registrazione audio. Prova con Safari su iOS o Chrome su Android.');
      toast.error('Formato audio non supportato');
      return;
    }
    selectedMimeTypeRef.current = supportedMimeType;
    console.log('Using MIME type:', supportedMimeType);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        await processRecording();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      recordingStartRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Update duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 100);
      
      toast.info('Registrazione avviata... Parla ora!');
    } catch (err) {
      console.error('Microphone error:', err);
      
      // Provide helpful iOS-specific error messages
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError('Microfono non autorizzato. Su iPhone: Impostazioni > Safari > Microfono > Consenti.');
      } else if (errorMessage.includes('NotFoundError')) {
        setError('Nessun microfono trovato. Assicurati che il dispositivo abbia un microfono funzionante.');
      } else {
        setError('Impossibile accedere al microfono. Controlla le autorizzazioni nelle impostazioni del browser.');
      }
      toast.error('Errore accesso microfono');
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
      setError('Nessun audio registrato. Assicurati che il microfono funzioni.');
      return;
    }

    // Create audio blob
    const audioBlob = new Blob(chunksRef.current, { type: mimeType });
    
    console.log('Audio blob size:', audioBlob.size, 'bytes');
    console.log('Recording duration:', duration, 'ms');
    console.log('MIME type:', mimeType);

    // Validate audio before sending
    if (audioBlob.size < 10000) { // Less than 10KB
      setError('Registrazione troppo breve o vuota. Tieni premuto il pulsante e parla chiaramente per almeno 1 secondo.');
      toast.error('Audio troppo corto');
      return;
    }

    if (duration < 500) { // Less than 0.5 seconds
      setError('Registrazione troppo breve. Tieni premuto il pulsante e parla per almeno 1 secondo.');
      toast.error('Registrazione troppo breve');
      return;
    }

    if (!mimeType) {
      setError('Formato audio non riconosciuto. Prova a ricaricare la pagina.');
      toast.error('Formato audio non valido');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert audio to base64
      const reader = new FileReader();
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          if (!base64 || base64.length < 100) {
            reject(new Error('Audio conversion failed'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(audioBlob);
      });

      const fileExtension = getFileExtension(mimeType);
      console.log('Sending audio to transcription, base64 length:', base64Audio.length);

      // Step 1: Transcribe audio
      toast.info('Trascrizione in corso...');
      const transcribeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            audio: base64Audio,
            mimeType: mimeType,
            extension: fileExtension,
          }),
        }
      );

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || 'Errore durante la trascrizione');
      }

      const { text } = await transcribeResponse.json();
      
      if (!text) {
        throw new Error('Nessun testo riconosciuto. Prova a parlare più chiaramente.');
      }
      
      setTranscribedText(text);
      console.log('Transcribed text:', text);

      // Step 2: Parse expense from text
      toast.info('Analisi del testo...');
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
        if (parseResponse.status === 429) {
          throw new Error('Limite richieste superato, riprova tra poco');
        }
        if (parseResponse.status === 402) {
          throw new Error('Crediti esauriti, ricarica il tuo account');
        }
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || 'Errore durante l\'analisi');
      }

      const { expense } = await parseResponse.json();
      
      if (!expense) {
        throw new Error('Non sono riuscito a capire la spesa. Prova con formato: "Ho speso 10 euro al supermercato"');
      }
      
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
      // Reset state
      setTranscribedText(null);
      setParsedExpense(null);
      setRecordingDuration(0);
    }
  };

  const handleCancel = () => {
    setTranscribedText(null);
    setParsedExpense(null);
    setError(null);
    setRecordingDuration(0);
  };

  return (
    <div className="space-y-6">
      {/* Modern Recording Button */}
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="relative">
          {/* Animated rings when recording */}
          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 animate-pulse" />
              <div className="absolute inset-[-16px] rounded-full border border-primary/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={cn(
              'relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
              'shadow-lg hover:shadow-xl active:scale-95',
              isRecording 
                ? 'bg-destructive text-destructive-foreground' 
                : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
              isProcessing && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </button>
        </div>
        
        <div className="text-center space-y-1">
          <p className={cn(
            "font-medium transition-colors",
            isRecording ? "text-destructive" : "text-foreground"
          )}>
            {isProcessing 
              ? 'Elaborazione...' 
              : isRecording 
                ? `${recordingDuration}s - Tocca per fermare`
                : 'Tocca per registrare'}
          </p>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            "Ho speso 45 euro al supermercato"
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-destructive font-medium">{error}</p>
            {error.includes('iPhone') && (
              <p className="text-xs text-muted-foreground mt-1">
                Su iOS usa Safari e autorizza il microfono
              </p>
            )}
          </div>
        </div>
      )}

      {/* Transcribed Text */}
      {transcribedText && (
        <div className="p-4 bg-muted/50 rounded-xl border">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Trascrizione</span>
          </div>
          <p className="text-sm italic">"{transcribedText}"</p>
        </div>
      )}

      {/* Parsed Expense Preview - Modern Card */}
      {parsedExpense && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground mb-1">Importo rilevato</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(parsedExpense.amount)}
              </p>
            </div>
            
            <div className="space-y-3 pt-3 border-t border-primary/10">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Descrizione</span>
                <span className="font-medium text-sm text-right max-w-[60%] truncate">{parsedExpense.description}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Categoria</span>
                <Badge variant="secondary" className="text-xs">
                  {categoryLabels[parsedExpense.category]}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Data</span>
                <span className="font-medium text-sm">{formatDate(parsedExpense.date)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={handleConfirm}
            >
              <Check className="h-4 w-4 mr-2" />
              Conferma
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
