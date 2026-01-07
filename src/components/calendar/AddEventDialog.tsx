import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { EVENT_TYPES, EVENT_COLORS, RECURRENCE_OPTIONS, EventType, RecurrenceInterval } from '@/types/calendar';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

export function AddEventDialog({ open, onOpenChange, defaultDate }: AddEventDialogProps) {
  const { createEvent } = useCalendarEvents();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(defaultDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState<EventType>('scadenza');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('monthly');
  const [color, setColor] = useState(EVENT_TYPES[0].color);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventTime('');
    setEventType('scadenza');
    setIsRecurring(false);
    setRecurrenceInterval('monthly');
    setColor(EVENT_TYPES[0].color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }

    setLoading(true);
    try {
      const { error } = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        eventDate: new Date(eventDate),
        eventTime: eventTime || undefined,
        eventType,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : undefined,
        color,
      });

      if (error) {
        toast.error('Errore durante il salvataggio');
        return;
      }

      toast.success('Evento aggiunto');
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: EventType) => {
    setEventType(type);
    const defaultColor = EVENT_TYPES.find(t => t.value === type)?.color;
    if (defaultColor) setColor(defaultColor);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo Evento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: Scadenza bolletta"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dettagli opzionali..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Data *</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventTime">Ora</Label>
              <Input
                id="eventTime"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={eventType} onValueChange={(v) => handleTypeChange(v as EventType)}>
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

          <div className="space-y-2">
            <Label>Colore</Label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="recurring">Ricorrente</Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Frequenza</Label>
              <Select value={recurrenceInterval} onValueChange={(v) => setRecurrenceInterval(v as RecurrenceInterval)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
