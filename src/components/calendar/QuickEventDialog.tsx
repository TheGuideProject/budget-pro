import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { EVENT_TYPES, EventType } from '@/types/calendar';
import { toast } from 'sonner';
import { CalendarPlus, Loader2, Check } from 'lucide-react';

interface QuickEventDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickEventDialog({ trigger, open: controlledOpen, onOpenChange }: QuickEventDialogProps) {
  const { createEvent } = useCalendarEvents();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState<EventType>('scadenza');

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const resetForm = () => {
    setTitle('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventType('scadenza');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }

    setLoading(true);
    try {
      const typeConfig = EVENT_TYPES.find(t => t.value === eventType);
      
      const { error } = await createEvent({
        title: title.trim(),
        eventDate: new Date(eventDate),
        eventType,
        color: typeConfig?.color || '#3b82f6',
      });

      if (error) {
        toast.error('Errore durante il salvataggio');
        return;
      }

      toast.success('Evento aggiunto');
      resetForm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <CalendarPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-semibold">Nuovo Evento</span>
            <p className="text-xs text-muted-foreground font-normal">Aggiungi un promemoria</p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quickTitle">Titolo</Label>
          <Input
            id="quickTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Es: Pagare bolletta"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quickDate">Data</Label>
          <Input
            id="quickDate"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: type.color }}
                    />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-base font-semibold" 
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-5 w-5" />
          )}
          Aggiungi Evento
        </Button>
      </form>
    </DialogContent>
  );

  // If controlled, render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Nuovo Evento
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
