import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceChatInterfaceProps {
  onConnectionChange: (connected: boolean) => void;
  onTranscript: (text: string) => void;
  onResponse: (text: string) => void;
}

export function VoiceChatInterface({ 
  onConnectionChange, 
  onTranscript, 
  onResponse 
}: VoiceChatInterfaceProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Create audio element for playback
    audioElRef.current = document.createElement('audio');
    audioElRef.current.autoplay = true;
    
    return () => {
      disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Get ephemeral token from our edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('realtime-token', {
        body: { 
          systemPrompt: `Sei un assistente finanziario italiano esperto e amichevole.
Aiuti gli utenti a gestire le loro finanze personali, analizzare spese e entrate.
Rispondi sempre in italiano in modo chiaro e conciso.
Quando l'utente ti chiede di categorizzare spese, suggerisci le categorie appropriate.
Sei empatico e incoraggi buone abitudini finanziarie.
Mantieni le risposte brevi e naturali, come in una conversazione telefonica.`
        }
      });

      if (tokenError) throw tokenError;
      
      if (!tokenData?.client_secret?.value) {
        throw new Error("Token non ricevuto dal server");
      }

      const EPHEMERAL_KEY = tokenData.client_secret.value;

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up remote audio playback
      pc.ontrack = (e) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      pc.addTrack(stream.getTracks()[0]);

      // Set up data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        console.log("Data channel opened");
        setIsConnected(true);
        setIsConnecting(false);
        onConnectionChange(true);
        toast.success("Connesso! Parla pure...");
      });

      dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log("Realtime event:", event.type);
          
          switch (event.type) {
            case 'input_audio_buffer.speech_started':
              setIsListening(true);
              break;
            case 'input_audio_buffer.speech_stopped':
              setIsListening(false);
              break;
            case 'response.audio.delta':
              setIsSpeaking(true);
              break;
            case 'response.audio.done':
              setIsSpeaking(false);
              break;
            case 'conversation.item.input_audio_transcription.completed':
              if (event.transcript) {
                onTranscript(event.transcript);
              }
              break;
            case 'response.text.done':
            case 'response.audio_transcript.done':
              if (event.text || event.transcript) {
                onResponse(event.text || event.transcript);
              }
              break;
            case 'error':
              console.error("Realtime error:", event.error);
              toast.error("Errore nella conversazione");
              break;
          }
        } catch (err) {
          console.error("Error parsing event:", err);
        }
      });

      dc.addEventListener("close", () => {
        console.log("Data channel closed");
        setIsConnected(false);
        onConnectionChange(false);
      });

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Errore connessione: ${sdpResponse.status}`);
      }

      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      
      await pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");

    } catch (err) {
      console.error("Connection error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Errore di connessione';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsConnecting(false);
      disconnect();
    }
  }, [onConnectionChange, onTranscript, onResponse]);

  const disconnect = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
    onConnectionChange(false);
  }, [onConnectionChange]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
      {/* Main Voice Button */}
      <div className="relative">
        {/* Outer pulse ring */}
        {(isListening || isSpeaking) && (
          <div className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-20",
            isListening ? "bg-success" : "bg-primary"
          )} style={{ animationDuration: '1.5s' }} />
        )}
        
        {/* Glow effect */}
        {isConnected && (
          <div className={cn(
            "absolute -inset-4 rounded-full blur-xl opacity-30 transition-colors",
            isSpeaking ? "bg-primary" : isListening ? "bg-success" : "bg-muted"
          )} />
        )}
        
        <button
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          className={cn(
            "relative h-32 w-32 rounded-full flex items-center justify-center",
            "transition-all duration-300 shadow-2xl",
            "hover:scale-105 active:scale-95",
            isConnected 
              ? "bg-gradient-to-br from-destructive to-destructive/80" 
              : "bg-gradient-to-br from-primary to-accent",
            isConnecting && "opacity-70 cursor-wait"
          )}
        >
          {isConnecting ? (
            <Loader2 className="h-12 w-12 text-primary-foreground animate-spin" />
          ) : isConnected ? (
            <PhoneOff className="h-12 w-12 text-primary-foreground" />
          ) : (
            <Phone className="h-12 w-12 text-primary-foreground" />
          )}
        </button>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">
          {isConnecting ? 'Connessione in corso...' :
           isConnected ? (isSpeaking ? '🔊 Sto parlando...' : isListening ? '🎤 Ti ascolto...' : '👂 In attesa...') :
           'Tocca per iniziare'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isConnected 
            ? 'Parla naturalmente, risponderò a voce' 
            : 'Avvia una conversazione vocale con l\'assistente AI'}
        </p>
      </div>

      {/* Status Indicators */}
      {isConnected && (
        <div className="flex items-center gap-4 mt-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            isListening 
              ? "bg-success/20 text-success" 
              : "bg-muted text-muted-foreground"
          )}>
            <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
            <span>Microfono</span>
          </div>
          
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            isSpeaking 
              ? "bg-primary/20 text-primary" 
              : "bg-muted text-muted-foreground"
          )}>
            <Volume2 className={cn("h-4 w-4", isSpeaking && "animate-pulse")} />
            <span>AI</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl text-sm max-w-sm text-center">
          {error}
        </div>
      )}

      {/* Instructions */}
      {!isConnected && !isConnecting && (
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            La chat vocale usa OpenAI Realtime API per conversazioni naturali
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Analizza spese', 'Consigli risparmio', 'Categorie'].map((tag) => (
              <span 
                key={tag}
                className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
