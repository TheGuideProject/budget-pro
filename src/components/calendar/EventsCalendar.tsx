import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  ChevronLeft, ChevronRight, Plus, Check, Clock, Calendar as CalendarIcon, 
  Edit, Sparkles, Bell, Target, MoreHorizontal
} from 'lucide-react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { AddEventDialog } from './AddEventDialog';
import { EventEditDialog } from './EventEditDialog';
import { CalendarEvent, EVENT_TYPES } from '@/types/calendar';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// AI-generated event keywords
const AI_EVENT_KEYWORDS = ['Lavoro target', 'Scadenza fattura', 'Promemoria incasso', 'Giorno lavorativo', 'piano ai'];

function isAIGeneratedEvent(event: CalendarEvent): boolean {
  return AI_EVENT_KEYWORDS.some(keyword => 
    event.title.toLowerCase().includes(keyword.toLowerCase()) ||
    event.description?.toLowerCase().includes('piano ai') ||
    event.description?.toLowerCase().includes('generato automaticamente')
  );
}

function getEventTypeIcon(eventType: string, isAI: boolean = false) {
  if (isAI) {
    return <Sparkles className="h-3.5 w-3.5 text-primary" />;
  }
  
  switch (eventType) {
    case 'scadenza':
      return <Clock className="h-3.5 w-3.5 text-destructive" />;
    case 'promemoria':
      return <Bell className="h-3.5 w-3.5 text-amber-500" />;
    case 'appuntamento':
      return <Target className="h-3.5 w-3.5 text-primary" />;
    default:
      return <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getEventColor(event: CalendarEvent): string {
  if (event.color) return event.color;
  const typeConfig = EVENT_TYPES.find(t => t.value === event.eventType);
  return typeConfig?.color || '#6b7280';
}

export function EventsCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showAIOnly, setShowAIOnly] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const { events, loading, toggleCompleted } = useCalendarEvents();

  // Filter events based on AI toggle
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (showAIOnly) {
      return events.filter(isAIGeneratedEvent);
    }
    return events;
  }, [events, showAIOnly]);

  // Group events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    
    filteredEvents.forEach(event => {
      const dateKey = format(new Date(event.eventDate), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    
    return map;
  }, [filteredEvents]);

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding for start of week (Monday = 0)
    const startDay = start.getDay();
    const paddingDays = startDay === 0 ? 6 : startDay - 1;
    const paddedDays: (Date | null)[] = Array(paddingDays).fill(null);
    
    return [...paddedDays, ...days];
  }, [currentMonth]);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [selectedDate, eventsByDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    // Open bottom sheet on mobile
    if (window.innerWidth < 1024) {
      setMobileSheetOpen(true);
    }
  };

  const handleToggleComplete = async (eventId: string) => {
    await toggleCompleted(eventId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Caricamento eventi...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render event badges for a day cell (max 3, with overflow indicator)
  const renderDayEvents = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateKey) || [];
    
    if (dayEvents.length === 0) return null;

    const maxVisible = 2;
    const visibleEvents = dayEvents.slice(0, maxVisible);
    const overflowCount = dayEvents.length - maxVisible;
    
    const hasAI = dayEvents.some(isAIGeneratedEvent);

    return (
      <div className="flex flex-col gap-0.5 w-full px-0.5 mt-0.5">
        {/* Mobile: Show colored dots in a row */}
        <div className="flex gap-1 justify-center lg:hidden flex-wrap">
          {visibleEvents.map((event, idx) => (
            <div
              key={idx}
              className={cn(
                "w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-background",
                event.isCompleted && "opacity-50"
              )}
              style={{ backgroundColor: getEventColor(event) }}
            />
          ))}
          {overflowCount > 0 && (
            <span className="text-[9px] text-muted-foreground font-medium leading-none flex items-center">+{overflowCount}</span>
          )}
          {hasAI && (
            <Sparkles className="h-2.5 w-2.5 text-primary flex-shrink-0" />
          )}
        </div>
        
        {/* Desktop: Show mini badges */}
        <div className="hidden lg:flex flex-col gap-0.5">
          {visibleEvents.map((event, idx) => {
            const isAI = isAIGeneratedEvent(event);
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate",
                  event.isCompleted ? "opacity-50 line-through" : ""
                )}
                style={{ 
                  backgroundColor: `${getEventColor(event)}20`,
                  color: getEventColor(event),
                  borderLeft: `2px solid ${getEventColor(event)}`
                }}
              >
                {isAI && <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />}
                <span className="truncate">{event.title}</span>
              </div>
            );
          })}
          {overflowCount > 0 && (
            <div className="text-[10px] text-muted-foreground text-center">
              +{overflowCount} altri
            </div>
          )}
        </div>
      </div>
    );
  };

  // Event list component (reused in both desktop sidebar and mobile sheet)
  const EventsList = () => (
    <div className="space-y-2">
      {selectedDateEvents.length === 0 ? (
        <div className="text-center py-8">
          <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nessun evento per questa data</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Aggiungi evento
          </Button>
        </div>
      ) : (
        selectedDateEvents.map(event => {
          const isAI = isAIGeneratedEvent(event);
          const eventColor = getEventColor(event);
          
          return (
            <div
              key={event.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                event.isCompleted 
                  ? "bg-muted/50 border-muted" 
                  : "bg-card hover:shadow-md"
              )}
              style={{ borderLeftWidth: '4px', borderLeftColor: eventColor }}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleComplete(event.id)}
                  className={cn(
                    "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    event.isCompleted 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground/50 hover:border-primary"
                  )}
                >
                  {event.isCompleted && <Check className="h-3 w-3" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getEventTypeIcon(event.eventType, isAI)}
                    <h4 className={cn(
                      "font-medium text-sm",
                      event.isCompleted && "line-through text-muted-foreground"
                    )}>
                      {event.title}
                    </h4>
                    {isAI && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        AI
                      </Badge>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5"
                      style={{ borderColor: eventColor, color: eventColor }}
                    >
                      {EVENT_TYPES.find(t => t.value === event.eventType)?.label || event.eventType}
                    </Badge>
                    
                    {event.eventTime && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.eventTime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setEditingEvent(event)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Calendario Eventi</h2>
          {filteredEvents.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filteredEvents.length} eventi
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* AI Filter Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
            <Sparkles className="h-4 w-4 text-primary" />
            <Label htmlFor="ai-filter" className="text-xs cursor-pointer whitespace-nowrap">Solo AI</Label>
            <Switch 
              id="ai-filter"
              checked={showAIOnly}
              onCheckedChange={setShowAIOnly}
            />
          </div>

          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuovo</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-base sm:text-lg capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-2 sm:p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {daysInMonth.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate.get(dateKey) || [];
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                const hasPending = dayEvents.some(e => !e.isCompleted);
                const allCompleted = hasEvents && dayEvents.every(e => e.isCompleted);

                return (
                  <button
                    key={dateKey}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "aspect-square p-0.5 sm:p-1 rounded-md sm:rounded-lg transition-all flex flex-col items-center justify-start relative min-h-[48px] sm:min-h-[70px]",
                      "hover:bg-accent/50 active:scale-95",
                      isSelected && "ring-2 ring-primary bg-primary/10",
                      isCurrentDay && !isSelected && "bg-primary/5",
                      !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50"
                    )}
                  >
                    {/* Day number */}
                    <span className={cn(
                      "text-xs sm:text-sm font-medium",
                      isCurrentDay && "bg-primary text-primary-foreground w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs"
                    )}>
                      {format(day, 'd')}
                    </span>

                    {/* Events preview */}
                    {hasEvents && renderDayEvents(day)}

                    {/* Status indicator at bottom corner */}
                    {hasEvents && (
                      <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                        {allCompleted ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        ) : hasPending ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        ) : null}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t text-[10px] sm:text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>In sospeso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Completato</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>AI</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop: Event Details Sidebar */}
        <Card className="hidden lg:block">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {selectedDate ? (
                <>
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, 'd MMMM yyyy', { locale: it })}
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4" />
                  Seleziona un giorno
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-3">
              {selectedDate ? (
                <EventsList />
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Clicca su un giorno per vedere gli eventi
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Bottom Sheet for Events */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="h-[75vh] lg:hidden rounded-t-2xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: it })}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setMobileSheetOpen(false);
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pt-4 pb-8">
            <EventsList />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Add Event Dialog */}
      <AddEventDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultDate={selectedDate || new Date()}
      />

      {/* Edit Event Dialog */}
      {editingEvent && (
        <EventEditDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
        />
      )}
    </div>
  );
}

export default EventsCalendar;
