import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Send, Loader2, Bot, User, HelpCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const financialQuestions = [
  "Quanto ho fatturato quest'anno?",
  "Quante fatture devo ancora incassare?",
  "Qual è la mia spesa media mensile?",
  "Qual è il mio margine attuale?",
  "Quali sono le mie categorie di spesa principali?",
];

const helpQuestions = [
  "Come creo una nuova fattura?",
  "Come aggiungo una spesa velocemente?",
  "Come funziona lo scanner OCR?",
  "Come uso l'input vocale?",
  "Come gestisco il budget familiare?",
  "Come interpreto i grafici nell'analisi?",
  "Come funzionano le bozze nelle previsioni?",
  "Come verifico un pagamento ricevuto?",
];

// Parse and render formatted message content
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let numberedItems: { num: number; text: string }[] = [];
  let inList = false;
  let inNumberedList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 text-sm ml-2">
          {listItems.map((item, i) => (
            <li key={i}>{formatInlineText(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const flushNumberedList = () => {
    if (numberedItems.length > 0) {
      elements.push(
        <div key={`numlist-${elements.length}`} className="space-y-2">
          {numberedItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                {item.num}
              </span>
              <span className="text-sm">{formatInlineText(item.text)}</span>
            </div>
          ))}
        </div>
      );
      numberedItems = [];
    }
    inNumberedList = false;
  };

  const formatInlineText = (text: string): JSX.Element => {
    // Handle bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          // Handle inline code `text`
          const codeParts = part.split(/(`[^`]+`)/g);
          return (
            <span key={i}>
              {codeParts.map((codePart, j) => {
                if (codePart.startsWith('`') && codePart.endsWith('`')) {
                  return (
                    <code key={j} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                      {codePart.slice(1, -1)}
                    </code>
                  );
                }
                return codePart;
              })}
            </span>
          );
        })}
      </>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Empty line
    if (!line) {
      flushList();
      flushNumberedList();
      continue;
    }

    // Heading ##
    if (line.startsWith('## ')) {
      flushList();
      flushNumberedList();
      elements.push(
        <h4 key={`h-${i}`} className="font-semibold text-sm text-primary mt-3 mb-1">
          {line.slice(3)}
        </h4>
      );
      continue;
    }

    // Tip > 
    if (line.startsWith('> ')) {
      flushList();
      flushNumberedList();
      elements.push(
        <div key={`tip-${i}`} className="bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-500 pl-3 py-2 text-sm rounded-r">
          <span className="font-medium text-amber-700 dark:text-amber-400">💡 </span>
          {formatInlineText(line.slice(2))}
        </div>
      );
      continue;
    }

    // Numbered list 1. 2. 3.
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      flushList();
      if (!inNumberedList) {
        inNumberedList = true;
      }
      numberedItems.push({ num: parseInt(numberedMatch[1]), text: numberedMatch[2] });
      continue;
    } else if (inNumberedList) {
      flushNumberedList();
    }

    // Bullet list -
    if (line.startsWith('- ')) {
      flushNumberedList();
      if (!inList) {
        inList = true;
      }
      listItems.push(line.slice(2));
      continue;
    } else if (inList) {
      flushList();
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm">
        {formatInlineText(line)}
      </p>
    );
  }

  // Flush any remaining lists
  flushList();
  flushNumberedList();

  return <div className="space-y-2">{elements}</div>;
}

export function AskAIDialog() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('data');

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: { message: messageText },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.error || 'Errore nella risposta',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      toast.error('Errore nella comunicazione con l\'AI');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Riprova più tardi.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Sparkles className="h-4 w-4" />
          Chiedi all'AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] h-[650px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente BudgetPro
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ciao! Sono il tuo assistente personale. Posso aiutarti con domande sui tuoi dati finanziari o spiegarti come usare l'app.
              </p>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="data" className="gap-2">
                    <BarChart3 className="h-3 w-3" />
                    I Miei Dati
                  </TabsTrigger>
                  <TabsTrigger value="help" className="gap-2">
                    <HelpCircle className="h-3 w-3" />
                    Come Fare
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="data" className="mt-4">
                  <p className="text-xs text-muted-foreground mb-3">Domande sui tuoi dati finanziari:</p>
                  <div className="flex flex-wrap gap-2">
                    {financialQuestions.map((question, i) => (
                      <Button
                        key={i}
                        variant="secondary"
                        size="sm"
                        className="text-xs h-auto py-2 px-3"
                        onClick={() => handleSuggestedQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="help" className="mt-4">
                  <p className="text-xs text-muted-foreground mb-3">Guida all'uso dell'app:</p>
                  <div className="flex flex-wrap gap-2">
                    {helpQuestions.map((question, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-2 px-3"
                        onClick={() => handleSuggestedQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <FormattedMessage content={msg.content} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi una domanda..."
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
