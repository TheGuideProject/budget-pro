import { useState } from 'react';
import { SimpleLayout } from '@/components/simple/SimpleLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, TrendingUp, PiggyBank, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetStore } from '@/store/budgetStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const quickPrompts = [
  { icon: TrendingUp, label: 'Analizza le mie spese', prompt: 'Analizza le mie spese di questo mese e dimmi come sto andando' },
  { icon: PiggyBank, label: 'Come risparmiare?', prompt: 'Dammi consigli su come posso risparmiare di più' },
  { icon: AlertTriangle, label: 'Spese anomale', prompt: 'Ci sono spese anomale o insolite questo mese?' },
  { icon: Lightbulb, label: 'Previsione mese', prompt: 'Qual è la previsione per la fine del mese?' },
];

export default function SimpleAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { expenses } = useBudgetStore();

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          message: text,
          context: {
            expenses: expenses.slice(0, 50).map(e => ({
              amount: e.amount,
              category: e.category,
              description: e.description,
              date: e.date
            }))
          }
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        role: 'assistant',
        content: data?.response || 'Mi dispiace, non sono riuscito a elaborare la risposta.'
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      toast.error('Errore nella comunicazione con l\'AI');
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Riprova più tardi.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SimpleLayout title="Assistente AI">
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 ai-avatar">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">Assistente AI</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                Chiedi consigli sulle tue finanze, analisi delle spese e suggerimenti per risparmiare
              </p>

              {/* Quick Prompts */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {quickPrompts.map((prompt, i) => {
                  const Icon = prompt.icon;
                  return (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-auto py-3 px-3 flex-col gap-1.5 text-left neo-glass border-border/50"
                      onClick={() => sendMessage(prompt.prompt)}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-xs text-center leading-tight">{prompt.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                  )}>
                    {message.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-lg mb-16">
          <div className="flex gap-2 max-w-lg mx-auto">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="min-h-[44px] max-h-32 resize-none rounded-2xl border-border/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <Button
              size="icon"
              className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0"
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
}
