import { Bot, Save, Ship, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  onSaveAsReport?: () => void;
  onOpenPinfabb?: () => void;
  showActions?: boolean;
}

export function ChatMessage({ 
  role, 
  content, 
  onSaveAsReport, 
  onOpenPinfabb,
  showActions = true 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copiato negli appunti');
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'user') {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="chat-bubble-user">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="ai-avatar shrink-0">
        <Bot className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="chat-bubble-ai">
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
        
        {showActions && (
          <div className="flex flex-wrap gap-2 pl-1">
            {onSaveAsReport && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs hover:bg-primary/10"
                onClick={onSaveAsReport}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Salva Report
              </Button>
            )}
            {onOpenPinfabb && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs hover:bg-primary/10"
                onClick={onOpenPinfabb}
              >
                <Ship className="h-3.5 w-3.5 mr-1.5" />
                PINFABB
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs hover:bg-primary/10"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5" />
              )}
              {copied ? 'Copiato' : 'Copia'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="ai-avatar shrink-0">
        <Bot className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="typing-indicator">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
