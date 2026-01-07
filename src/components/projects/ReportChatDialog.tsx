import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Send, FileText, Save, Trash2, Mic, MicOff, Ship, 
  ChevronDown, ChevronUp, X, Sparkles, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProjectReports, ChatMessage as ChatMessageType, ProjectReport } from '@/hooks/useProjectReports';
import { Project } from '@/types';
import { PinfabbReport, defaultPinfabbReport } from '@/types/pinfabb';
import { PinfabbReportEditor } from './PinfabbReportEditor';
import { ChatMessage, TypingIndicator } from '@/components/ai/ChatMessage';
import { QuickActionsBar } from '@/components/ai/QuickActionsBar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportChatDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingReport?: ProjectReport;
}

export function ReportChatDialog({ project, open, onOpenChange, existingReport }: ReportChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pinfabbEditorOpen, setPinfabbEditorOpen] = useState(false);
  const [pinfabbData, setPinfabbData] = useState<Partial<PinfabbReport>>({});
  const [reportPreviewOpen, setReportPreviewOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [cumulativePinfabbData, setCumulativePinfabbData] = useState<Partial<PinfabbReport>>({});
  
  const { createReport, updateReport } = useProjectReports(project.id);

  useEffect(() => {
    if (existingReport) {
      setMessages(existingReport.chat_history || []);
      setCurrentReportId(existingReport.id);
      if (existingReport.status === 'final') {
        setReportContent(existingReport.content);
      }
    } else {
      setMessages([]);
      setCurrentReportId(null);
      setReportContent(null);
      setCumulativePinfabbData({});
    }
  }, [existingReport, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const normalizeToIsoDate = (dateStr: string): string => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const extractPinfabbDataFromJson = (content: string): Partial<PinfabbReport> | null => {
    const jsonMatch = content.match(/```pinfabb_data\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        return {
          shipName: parsed.shipName || '',
          imoNumber: parsed.imoNumber || '',
          flag: parsed.flag || '',
          port: parsed.port || '',
          dateStart: normalizeToIsoDate(parsed.dateStart || ''),
          dateEnd: normalizeToIsoDate(parsed.dateEnd || ''),
          numberOfTechnicians: parsed.numberOfTechnicians || 1,
          overtimeHours: typeof parsed.overtimeHours === 'number' ? parsed.overtimeHours : 0,
          nightHours: typeof parsed.nightHours === 'number' ? parsed.nightHours : 0,
          spareParts: parsed.spareParts || '',
          serviceReport: parsed.serviceReport || '',
          stabilizationPlant: parsed.stabilizationPlant || 'PINFABB Stabilizers',
          chiefEngineerName: parsed.chiefEngineerName || '',
          serviceEngineerName: parsed.serviceEngineerName || '',
        };
      } catch (e) {
        console.warn('Failed to parse pinfabb_data JSON:', e);
      }
    }
    return null;
  };

  const cleanMessageContent = (content: string): string => {
    return content.replace(/```pinfabb_data\s*[\s\S]*?\s*```/g, '').trim();
  };

  const getPinfabbFieldCount = (): { filled: number; total: number } => {
    const fieldsToCheck = ['shipName', 'imoNumber', 'flag', 'port', 'dateStart', 'dateEnd', 'serviceReport'];
    const filled = fieldsToCheck.filter(f => {
      const val = cumulativePinfabbData[f as keyof PinfabbReport];
      return val !== undefined && val !== '' && val !== 0;
    }).length;
    return { filled, total: fieldsToCheck.length };
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
            projectName: project.name,
            projectDescription: project.description,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella comunicazione');
      }

      const data = await response.json();

      const extractedData = extractPinfabbDataFromJson(data.content);
      if (extractedData) {
        setCumulativePinfabbData(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(extractedData).filter(([key, v]) => {
              if (typeof v === 'number') return true;
              return v !== '' && v !== undefined && v !== null;
            })
          ),
        }));
      }

      const assistantMessage: ChatMessageType = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const isReportGenerated = 
        text.toLowerCase().includes('genera report') ||
        text.toLowerCase().includes('generate report') ||
        text.toLowerCase().includes('report finale') ||
        text.toLowerCase().includes('final report') ||
        data.content.includes('# Report') ||
        data.content.includes('## Summary') ||
        data.content.includes('## Sommario');

      if (isReportGenerated) {
        setReportContent(cleanMessageContent(data.content));
        toast.success('Report generato! Puoi salvarlo o continuare la conversazione.');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      toast.error(errorMessage);
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Mi dispiace, si è verificato un errore: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processVoice(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Registrazione avviata...');
    } catch (err) {
      console.error('Microphone error:', err);
      toast.error('Impossibile accedere al microfono');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoice = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Errore lettura audio'));
        reader.readAsDataURL(blob);
      });

      toast.info('Trascrizione in corso...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ audio: base64, mimeType: 'audio/webm', extension: 'webm' }),
        }
      );

      if (!response.ok) throw new Error('Errore trascrizione');

      const { text } = await response.json();
      if (text) {
        setInput(prev => prev + (prev ? ' ' : '') + text);
        toast.success('Trascrizione completata');
      }
    } catch (err) {
      console.error('Voice processing error:', err);
      toast.error('Errore nella trascrizione');
    }
  };

  const saveMessageAsReport = async (messageContent: string) => {
    let reportId = currentReportId;

    if (!reportId) {
      const newReport = await createReport(`Report - ${project.name}`);
      if (!newReport) return;
      reportId = newReport.id;
      setCurrentReportId(reportId);
    }

    const success = await updateReport(reportId, {
      content: messageContent,
      chat_history: messages,
      status: 'final',
    });

    if (success) {
      toast.success('Report salvato nel progetto');
    }
  };

  const openPinfabbEditor = () => {
    const { filled } = getPinfabbFieldCount();
    if (filled === 0) {
      toast.warning('Nessun dato PINFABB trovato. Descrivi nave, IMO, porto, date nella chat.');
    }
    
    const today = new Date().toISOString().split('T')[0];
    setPinfabbData({
      ...defaultPinfabbReport,
      ...cumulativePinfabbData,
      date: cumulativePinfabbData.date || today,
      chiefEngineerDate: cumulativePinfabbData.chiefEngineerDate || today,
      serviceEngineerDate: cumulativePinfabbData.serviceEngineerDate || today,
    });
    setPinfabbEditorOpen(true);
  };

  const saveReport = async () => {
    if (!reportContent) return;

    let reportId = currentReportId;

    if (!reportId) {
      const newReport = await createReport(`Report - ${project.name}`);
      if (!newReport) return;
      reportId = newReport.id;
      setCurrentReportId(reportId);
    }

    const success = await updateReport(reportId, {
      content: reportContent,
      chat_history: messages,
      status: 'final',
    });

    if (success) {
      toast.success('Report salvato nel progetto');
      onOpenChange(false);
    }
  };

  const discardReport = () => {
    setReportContent(null);
    toast.info('Report scartato. Puoi continuare la conversazione.');
  };

  const pinfabbCount = getPinfabbFieldCount();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col p-0 gap-0 max-h-[100dvh] sm:max-h-[90vh] overflow-hidden">
          {/* Glass Header */}
          <div className="sheet-header-glass shrink-0">
            <div className="flex items-center gap-3">
              <div className="ai-avatar">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Report AI
                </h2>
                <p className="text-sm text-muted-foreground truncate">{project.name}</p>
              </div>
              {messages.length > 0 && (
                <Badge 
                  variant={pinfabbCount.filled > 0 ? "default" : "secondary"}
                  className="shrink-0 gap-1"
                >
                  <Ship className="h-3 w-3" />
                  {pinfabbCount.filled}/{pinfabbCount.total}
                </Badge>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-6"
          >
            <div className="space-y-6 max-w-full">
              {messages.length === 0 ? (
                <div className="empty-state-glass">
                  <div className="empty-state-icon">
                    <FileText className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Inizia a descrivere il lavoro</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    L'AI ti aiuterà a creare un report tecnico professionale. Puoi chattare in italiano o inglese.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline" className="text-xs">🇮🇹 "Genera report in italiano"</Badge>
                    <Badge variant="outline" className="text-xs">🇬🇧 "Generate report in English"</Badge>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.role === 'assistant' ? cleanMessageContent(msg.content) : msg.content}
                    onSaveAsReport={msg.role === 'assistant' ? () => saveMessageAsReport(cleanMessageContent(msg.content)) : undefined}
                    onOpenPinfabb={msg.role === 'assistant' ? openPinfabbEditor : undefined}
                    showActions={msg.role === 'assistant'}
                  />
                ))
              )}
              
              {isLoading && <TypingIndicator />}
            </div>
          </div>

          {/* Report Preview - Collapsible */}
          {reportContent && (
            <Collapsible 
              open={reportPreviewOpen} 
              onOpenChange={setReportPreviewOpen}
              className="border-t bg-primary/5 shrink-0"
            >
              <CollapsibleTrigger asChild>
                <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <Badge className="gap-1 bg-gradient-to-r from-primary to-accent">
                      <FileText className="h-3 w-3" />
                      Report Generato
                    </Badge>
                  </div>
                  {reportPreviewOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={discardReport} className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Scarta
                    </Button>
                    <Button size="sm" onClick={saveReport} className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      <Save className="h-4 w-4 mr-2" />
                      Salva
                    </Button>
                  </div>
                  <div className="neo-glass max-h-32 overflow-y-auto p-3">
                    <pre className="text-xs whitespace-pre-wrap break-words">{reportContent}</pre>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Quick Actions */}
          {messages.length > 0 && (
            <QuickActionsBar 
              onSelectAction={sendMessage} 
              disabled={isLoading}
            />
          )}

          {/* Input Area */}
          <form 
            onSubmit={handleSubmit} 
            className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm p-4 pb-safe shrink-0"
          >
            <div className="flex items-end gap-3">
              <Button
                type="button"
                variant={isRecording ? 'destructive' : 'outline'}
                size="icon"
                className={cn(
                  "h-12 w-12 shrink-0 rounded-full icon-btn-glow",
                  isRecording && "recording"
                )}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={isLoading}
              >
                {isRecording ? (
                  <div className="voice-waveform">
                    <span /><span /><span /><span /><span />
                  </div>
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              <div className="flex-1 modern-input">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Descrivi il lavoro svolto..."
                  className="min-h-[48px] max-h-[120px] resize-none rounded-2xl py-3 px-4 text-base border-2"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 icon-btn-glow"
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PinfabbReportEditor
        open={pinfabbEditorOpen}
        onOpenChange={setPinfabbEditorOpen}
        initialData={pinfabbData}
      />
    </>
  );
}
