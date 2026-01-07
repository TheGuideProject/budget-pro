import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, X, Sparkles, MessageSquare, 
  TrendingUp, HelpCircle, Tag, Loader2, Bot, User,
  Volume2, VolumeX, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VoiceChatInterface } from './VoiceChatInterface';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string;
}

interface AIAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions: QuickAction[] = [
  {
    icon: <Tag className="h-5 w-5" />,
    label: "Auto-Categorizza",
    prompt: "Analizza le mie spese recenti senza categoria e suggerisci le categorie appropriate",
    color: "from-primary to-accent"
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    label: "Analisi Spese",
    prompt: "Fammi un'analisi dettagliata delle mie spese di questo mese",
    color: "from-accent to-success"
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    label: "Consigli Budget",
    prompt: "Dammi consigli personalizzati per risparmiare basandoti sulle mie abitudini",
    color: "from-warning to-destructive"
  },
  {
    icon: <HelpCircle className="h-5 w-5" />,
    label: "Come Funziona",
    prompt: "Spiegami come usare al meglio questa app per gestire le mie finanze",
    color: "from-primary to-secondary"
  }
];

export function AIAssistantSheet({ open, onOpenChange }: AIAssistantSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: { 
          message: text.trim(),
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || "Mi dispiace, non sono riuscito a elaborare la tua richiesta.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI error:', error);
      toast.error("Errore nella comunicazione con l'AI");
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "Mi dispiace, si è verificato un errore. Riprova tra poco.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] sm:h-[85vh] rounded-t-3xl border-t-0 p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                {isVoiceConnected && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full border-2 border-background animate-pulse" />
                )}
              </div>
              <div>
                <SheetTitle className="text-xl font-bold">Assistente AI</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {isVoiceMode ? 'Chat vocale attiva' : 'Chiedimi qualsiasi cosa'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="rounded-full gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Nuova Chat</span>
                </Button>
              )}
              <Button
                variant={isVoiceMode ? "default" : "outline"}
                size="icon"
                onClick={toggleVoiceMode}
                className={cn(
                  "rounded-full transition-all",
                  isVoiceMode && "bg-gradient-to-r from-primary to-accent"
                )}
              >
                {isVoiceMode ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Voice Chat Interface or Text Chat */}
        {isVoiceMode ? (
          <VoiceChatInterface 
            onConnectionChange={setIsVoiceConnected}
            onTranscript={(text) => {
              const msg: Message = { role: 'user', content: text, timestamp: new Date() };
              setMessages(prev => [...prev, msg]);
            }}
            onResponse={(text) => {
              const msg: Message = { role: 'assistant', content: text, timestamp: new Date() };
              setMessages(prev => [...prev, msg]);
            }}
          />
        ) : (
          <>
            {/* Quick Actions - Always visible as horizontal scroll */}
            <div className="px-6 py-3 border-b border-border/30 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border border-border/50 whitespace-nowrap",
                      "bg-card hover:bg-muted/50 active:scale-[0.98]",
                      "transition-all duration-200 text-sm shrink-0",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center",
                      "bg-gradient-to-br text-primary-foreground",
                      action.color
                    )}>
                      {React.cloneElement(action.icon as React.ReactElement, { className: "h-3 w-3" })}
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
              <div className="py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                      <Bot className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Ciao! Come posso aiutarti?</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      Sono il tuo assistente finanziario. Posso analizzare le tue spese, 
                      suggerire categorie e darti consigli per risparmiare.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3 animate-fade-in",
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      message.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                    )}>
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-md" 
                        : "bg-muted rounded-tl-md"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <span className={cn(
                        "text-[10px] mt-1 block",
                        message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Sto pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-border/50 bg-card/50 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Scrivi un messaggio..."
                    disabled={isLoading}
                    className="pr-12 h-12 rounded-2xl bg-muted/50 border-border/50 focus:border-primary"
                  />
                </div>
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-12 w-12 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
