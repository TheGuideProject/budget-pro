import { useState, useMemo, useCallback } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  getDate,
  isSameMonth,
  isPast,
  isToday as isDateToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Euro, 
  Receipt, 
  Zap, 
  CalendarCheck,
  Filter,
  Plus,
  Flame,
  Droplets,
  Wifi,
  Phone,
  Building,
  Sparkles,
  Check,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Invoice, Expense, EXPENSE_CATEGORIES, BILL_TYPES, PAID_BY_OPTIONS, PaidBy } from '@/types';
import { CalendarEvent, EVENT_TYPES } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBudgetStore } from '@/store/budgetStore';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { AddEventDialog } from './AddEventDialog';
import { EventEditDialog } from './EventEditDialog';
import { toast } from 'sonner';

interface UnifiedCalendarProps {
  invoices: Invoice[];
  expenses: Expense[];
  onInvoiceClick?: (invoice: Invoice) => void;
  onExpenseClick?: (expense: Expense) => void;
}

type FilterType = 'events' | 'income' | 'recurring' | 'bills';

const billTypeIcons: Record<string, React.ReactNode> = {
  luce: <Zap className="h-3 w-3 text-yellow-500" />,
  gas: <Flame className="h-3 w-3 text-orange-500" />,
  acqua: <Droplets className="h-3 w-3 text-blue-500" />,
  internet: <Wifi className="h-3 w-3 text-purple-500" />,
  telefono: <Phone className="h-3 w-3 text-green-500" />,
  condominio: <Building className="h-3 w-3 text-gray-500" />,
  rifiuti: <Building className="h-3 w-3 text-amber-500" />,
  altro: <Building className="h-3 w-3 text-gray-400" />,
};

export function UnifiedCalendar({ invoices, expenses, onInvoiceClick, onExpenseClick }: UnifiedCalendarProps) {
  const isMobile = useIsMobile();
  const { updateExpense } = useBudgetStore();
  const { events, loading: eventsLoading, updateEvent, deleteEvent, toggleCompleted } = useCalendarEvents();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filters, setFilters] = useState<Record<FilterType, boolean>>({
    events: true,
    income: true,
    recurring: true,
    bills: true
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Processed data
  const recurringExpenses = useMemo(() => 
    expenses.filter(exp => exp.recurring), [expenses]
  );
  
  const pendingBills = useMemo(() => 
    expenses.filter(exp => exp.billType && exp.isPaid === false), [expenses]
  );

  // Data by date
  const invoicesByDate = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    invoices.forEach(inv => {
      const dateKey = format(new Date(inv.dueDate), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, inv]);
    });
    return map;
  }, [invoices]);

  const recurringByDay = useMemo(() => {
    const map = new Map<number, Expense[]>();
    recurringExpenses.forEach(exp => {
      const dayOfMonth = getDate(new Date(exp.date));
      const existing = map.get(dayOfMonth) || [];
      map.set(dayOfMonth, [...existing, exp]);
    });
    return map;
  }, [recurringExpenses]);

  const billsByDate = useMemo(() => {
    const map = new Map<string, Expense[]>();
    pendingBills.forEach(bill => {
      const dateKey = format(new Date(bill.date), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, bill]);
    });
    return map;
  }, [pendingBills]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dateKey = format(new Date(event.eventDate), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, event]);
    });
    return map;
  }, [events]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const toggleFilter = (filter: FilterType) => {
    setFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  };

  const getDayData = useCallback((day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayOfMonth = getDate(day);
    
    return {
      invoices: filters.income ? (invoicesByDate.get(dateKey) || []) : [],
      recurring: filters.recurring && isSameMonth(day, currentMonth) ? (recurringByDay.get(dayOfMonth) || []) : [],
      bills: filters.bills ? (billsByDate.get(dateKey) || []) : [],
      events: filters.events ? (eventsByDate.get(dateKey) || []) : []
    };
  }, [invoicesByDate, recurringByDay, billsByDate, eventsByDate, filters, currentMonth]);

  const handleDayClick = (day: Date) => {
    const data = getDayData(day);
    const hasContent = data.invoices.length > 0 || data.recurring.length > 0 || 
                       data.bills.length > 0 || data.events.length > 0;
    
    if (hasContent || !isMobile) {
      setSelectedDate(isSameDay(day, selectedDate || new Date(0)) ? null : day);
      if (isMobile && hasContent) {
        setMobileSheetOpen(true);
      }
    }
  };

  const markBillAsPaid = async (bill: Expense, paidBy: PaidBy) => {
    await updateExpense(bill.id, {
      isPaid: true,
      paidAt: new Date(),
      paidBy,
    });
    toast.success(`Bolletta segnata come pagata`);
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return getDayData(selectedDate);
  }, [selectedDate, getDayData]);

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[3];
  };

  const isAIEvent = (event: CalendarEvent) => {
    const aiKeywords = ['lavoro', 'turno', 'work', 'shift', 'cantiere', 'trasferta', 'ferie', 'riposo'];
    return aiKeywords.some(k => event.title.toLowerCase().includes(k) || event.description?.toLowerCase().includes(k));
  };

  // Render day content indicators
  const renderDayIndicators = (day: Date) => {
    const data = getDayData(day);
    const indicators = [];
    
    if (data.events.length > 0) {
      indicators.push(
        <div key="events" className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Eventi" />
      );
    }
    if (data.invoices.length > 0) {
      indicators.push(
        <div key="income" className="w-1.5 h-1.5 rounded-full bg-primary" title="Entrate" />
      );
    }
    if (data.recurring.length > 0) {
      indicators.push(
        <div key="recurring" className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Spese fisse" />
      );
    }
    if (data.bills.length > 0) {
      const hasOverdue = data.bills.some(b => isPast(new Date(b.date)) && !isDateToday(new Date(b.date)));
      indicators.push(
        <div key="bills" className={cn(
          "w-1.5 h-1.5 rounded-full",
          hasOverdue ? "bg-destructive" : "bg-yellow-500"
        )} title="Bollette" />
      );
    }
    
    return indicators;
  };

  const DayDetailsContent = () => {
    if (!selectedDate || !selectedDayData) return null;
    
    const { invoices: dayInvoices, recurring, bills, events: dayEvents } = selectedDayData;
    const hasContent = dayInvoices.length > 0 || recurring.length > 0 || bills.length > 0 || dayEvents.length > 0;
    
    if (!hasContent) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nessun evento per questo giorno</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => setShowAddEvent(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi evento
          </Button>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[60vh] md:h-auto md:max-h-[500px]">
        <div className="space-y-4 pr-4">
          {/* Events Section */}
          {dayEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarCheck className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-sm">Eventi</h4>
                <Badge variant="secondary" className="text-xs">{dayEvents.length}</Badge>
              </div>
              <div className="space-y-2">
                {dayEvents.map(event => {
                  const typeInfo = getEventTypeInfo(event.eventType);
                  return (
                    <div 
                      key={event.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                        event.isCompleted && "opacity-60"
                      )}
                      style={{ borderLeftColor: event.color || typeInfo.color, borderLeftWidth: 3 }}
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isAIEvent(event) && <Sparkles className="h-3 w-3 text-primary" />}
                          <span className={cn("font-medium", event.isCompleted && "line-through")}>
                            {event.title}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await toggleCompleted(event.id);
                          }}
                        >
                          <Check className={cn("h-4 w-4", event.isCompleted && "text-success")} />
                        </Button>
                      </div>
                      {event.eventTime && (
                        <p className="text-xs text-muted-foreground mt-1">Ore {event.eventTime}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Income Section */}
          {dayInvoices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Euro className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Entrate Previste</h4>
                <Badge variant="secondary" className="text-xs">{dayInvoices.length}</Badge>
              </div>
              <div className="space-y-2">
                {dayInvoices.map(inv => (
                  <div 
                    key={inv.id}
                    className={cn(
                      "p-3 rounded-lg border bg-primary/5",
                      onInvoiceClick && "cursor-pointer hover:border-primary/50"
                    )}
                    onClick={() => onInvoiceClick?.(inv)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inv.clientName}</p>
                        <p className="text-xs text-muted-foreground">{inv.projectName}</p>
                      </div>
                      <span className="font-bold text-primary">{formatCurrency(inv.remainingAmount ?? inv.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Expenses Section */}
          {recurring.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-orange-500" />
                <h4 className="font-semibold text-sm">Spese Fisse</h4>
                <Badge variant="secondary" className="text-xs">{recurring.length}</Badge>
              </div>
              <div className="space-y-2">
                {recurring.map(exp => (
                  <div 
                    key={exp.id}
                    className={cn(
                      "p-3 rounded-lg border bg-orange-500/5",
                      onExpenseClick && "cursor-pointer hover:border-orange-500/50"
                    )}
                    onClick={() => onExpenseClick?.(exp)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{exp.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{getCategoryLabel(exp.category)}</Badge>
                          {exp.paymentMethod === 'carta_credito' && (
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-orange-600">{formatCurrency(exp.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bills Section */}
          {bills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <h4 className="font-semibold text-sm">Bollette da Pagare</h4>
                <Badge variant="destructive" className="text-xs">{bills.length}</Badge>
              </div>
              <div className="space-y-2">
                {bills.map(bill => {
                  const isOverdue = isPast(new Date(bill.date)) && !isDateToday(new Date(bill.date));
                  return (
                    <div 
                      key={bill.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        isOverdue ? "bg-destructive/10 border-destructive/30" : "bg-yellow-500/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {bill.billType && billTypeIcons[bill.billType]}
                          <span className="font-medium">{bill.billProvider || bill.description}</span>
                          {isOverdue && <Badge variant="destructive" className="text-xs">Scaduta</Badge>}
                        </div>
                        <span className="font-bold">{formatCurrency(bill.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Segna pagata:</span>
                        {PAID_BY_OPTIONS.map(option => (
                          <Button
                            key={option.value}
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => markBillAsPaid(bill, option.value)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold capitalize min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs"
          >
            Oggi
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Badge 
            variant={filters.events ? "default" : "outline"}
            className="cursor-pointer transition-all"
            onClick={() => toggleFilter('events')}
          >
            <CalendarCheck className="h-3 w-3 mr-1" />
            Eventi
          </Badge>
          <Badge 
            variant={filters.income ? "default" : "outline"}
            className={cn("cursor-pointer transition-all", filters.income && "bg-primary")}
            onClick={() => toggleFilter('income')}
          >
            <Euro className="h-3 w-3 mr-1" />
            Entrate
          </Badge>
          <Badge 
            variant={filters.recurring ? "default" : "outline"}
            className={cn("cursor-pointer transition-all", filters.recurring && "bg-orange-500")}
            onClick={() => toggleFilter('recurring')}
          >
            <Receipt className="h-3 w-3 mr-1" />
            Fisse
          </Badge>
          <Badge 
            variant={filters.bills ? "default" : "outline"}
            className={cn("cursor-pointer transition-all", filters.bills && "bg-yellow-500 text-yellow-950")}
            onClick={() => toggleFilter('bills')}
          >
            <Zap className="h-3 w-3 mr-1" />
            Bollette
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div 
                  key={day} 
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: adjustedStartDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const data = getDayData(day);
                const hasContent = data.invoices.length > 0 || data.recurring.length > 0 || 
                                   data.bills.length > 0 || data.events.length > 0;
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const hasOverdueBills = data.bills.some(b => isPast(new Date(b.date)) && !isDateToday(new Date(b.date)));
                const indicators = renderDayIndicators(day);

                return (
                  <div 
                    key={dateKey}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all cursor-pointer',
                      isToday && 'ring-2 ring-primary',
                      isSelected && 'ring-2 ring-accent bg-accent/20',
                      hasOverdueBills && !isSelected && 'bg-destructive/10',
                      hasContent && !isSelected && !hasOverdueBills && 'hover:bg-muted/80',
                      !hasContent && 'hover:bg-muted/50'
                    )}
                  >
                    <span className={cn(
                      'text-sm font-medium',
                      isToday && 'text-primary font-bold',
                      isSelected && 'text-accent-foreground font-bold'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {indicators.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {indicators}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Eventi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Entrate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">Spese fisse</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Bollette</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Scadute</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop: Details Sidebar */}
        {!isMobile && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {selectedDate 
                    ? format(selectedDate, 'EEEE d MMMM', { locale: it })
                    : 'Seleziona un giorno'}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddEvent(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Evento
                </Button>
              </div>
              {selectedDate ? (
                <DayDetailsContent />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarCheck className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>Clicca su un giorno per vedere i dettagli</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile: Bottom Sheet */}
      {isMobile && (
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center justify-between">
                {selectedDate 
                  ? format(selectedDate, 'EEEE d MMMM', { locale: it })
                  : 'Dettagli'}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setShowAddEvent(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Evento
                </Button>
              </SheetTitle>
            </SheetHeader>
            <DayDetailsContent />
          </SheetContent>
        </Sheet>
      )}

      {/* Dialogs */}
      <AddEventDialog
        open={showAddEvent}
        onOpenChange={setShowAddEvent}
        defaultDate={selectedDate || undefined}
      />

      <EventEditDialog
        event={editingEvent}
        open={!!editingEvent}
        onOpenChange={(open) => !open && setEditingEvent(null)}
      />
    </div>
  );
}
