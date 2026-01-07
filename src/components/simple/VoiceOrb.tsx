import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceOrbProps {
  onExpenseConfirmed: (expense: ParsedExpense) => void;
  className?: string;
}

interface ParsedExpense {
  amount: number;
  description: string;
  category: string;
  date: string;
}

type OrbState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

function getSupportedMimeType(): string {
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
}

export function VoiceOrb({ onExpenseConfirmed, className }: VoiceOrbProps) {
  const [state, setState] = useState<OrbState>('idle');
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setRecordingTime(0);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      mediaRecorder.start();
      setState('listening');
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Impossibile accedere al microfono');
      setState('error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setState('processing');
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    }
  }, []);

  const processRecording = async () => {
    try {
      if (audioChunksRef.current.length === 0) {
        throw new Error('No audio recorded');
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: getSupportedMimeType() });
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Transcribe audio
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (transcriptError || !transcriptData?.text) {
          throw new Error('Transcription failed');
        }

        setTranscript(transcriptData.text);

        // Parse expense with AI
        const { data: parseData, error: parseError } = await supabase.functions.invoke('ai-parse-expense', {
          body: { text: transcriptData.text }
        });

        if (parseError || !parseData) {
          throw new Error('Parsing failed');
        }

        setParsedExpense(parseData);
        setState('success');
        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing recording:', error);
      setState('error');
      toast.error('Errore durante l\'elaborazione');
    } finally {
      cleanup();
    }
  };

  const handleOrbClick = () => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'listening') {
      stopRecording();
    } else if (state === 'success' && parsedExpense) {
      onExpenseConfirmed(parsedExpense);
      resetState();
    } else if (state === 'error') {
      resetState();
    }
  };

  const resetState = () => {
    setState('idle');
    setParsedExpense(null);
    setTranscript('');
    cleanup();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Orb Button */}
      <button
        onClick={handleOrbClick}
        disabled={state === 'processing'}
        className={cn(
          'voice-orb relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500',
          state === 'idle' && 'voice-orb-idle',
          state === 'listening' && 'voice-orb-listening',
          state === 'processing' && 'voice-orb-processing',
          state === 'success' && 'voice-orb-success',
          state === 'error' && 'voice-orb-error',
        )}
      >
        {/* Gradient mesh background */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className={cn(
            'absolute inset-0 voice-orb-mesh transition-opacity duration-500',
            state === 'listening' && 'opacity-100 animate-pulse',
            state !== 'listening' && 'opacity-70'
          )} />
        </div>

        {/* Icon */}
        <div className="relative z-10">
          {state === 'idle' && <Mic className="h-10 w-10 text-white" />}
          {state === 'listening' && <MicOff className="h-10 w-10 text-white animate-pulse" />}
          {state === 'processing' && <Loader2 className="h-10 w-10 text-white animate-spin" />}
          {state === 'success' && <Check className="h-10 w-10 text-white" />}
          {state === 'error' && <X className="h-10 w-10 text-white" />}
        </div>

        {/* Waveform ring */}
        {state === 'listening' && (
          <div className="absolute inset-0 rounded-full voice-orb-ring" />
        )}
      </button>

      {/* Status Text */}
      <div className="mt-4 text-center min-h-[60px]">
        {state === 'idle' && (
          <p className="text-muted-foreground text-sm">Tocca per parlare</p>
        )}
        {state === 'listening' && (
          <div className="space-y-1">
            <p className="text-primary font-medium">Sto ascoltando...</p>
            <p className="text-xs text-muted-foreground">{formatTime(recordingTime)}</p>
          </div>
        )}
        {state === 'processing' && (
          <p className="text-muted-foreground text-sm">Elaborazione in corso...</p>
        )}
        {state === 'success' && parsedExpense && (
          <div className="space-y-1 animate-fade-in">
            <p className="font-semibold text-lg">€{parsedExpense.amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              {parsedExpense.description}
            </p>
            <p className="text-xs text-primary">Tocca per confermare</p>
          </div>
        )}
        {state === 'error' && (
          <div className="space-y-1">
            <p className="text-destructive font-medium">Errore</p>
            <p className="text-xs text-muted-foreground">Tocca per riprovare</p>
          </div>
        )}
      </div>

      {/* Transcript preview */}
      {transcript && state === 'success' && (
        <div className="mt-2 px-4 py-2 bg-muted/50 rounded-lg max-w-[250px]">
          <p className="text-xs text-muted-foreground italic truncate">"{transcript}"</p>
        </div>
      )}

      {/* Cancel button for success state */}
      {state === 'success' && (
        <button
          onClick={resetState}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Annulla
        </button>
      )}
    </div>
  );
}
