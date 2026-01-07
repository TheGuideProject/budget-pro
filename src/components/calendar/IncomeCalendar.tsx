import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Euro, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Invoice } from '@/types';
import { cn } from '@/lib/utils';

interface IncomeCalendarProps {
  invoices: Invoice[];
  onInvoiceClick?: (invoice: Invoice) => void;
}

export function IncomeCalendar({ invoices, onInvoiceClick }: IncomeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const invoicesByDate = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    invoices.forEach(inv => {
      const dateKey = format(new Date(inv.dueDate), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, inv]);
    });
    return map;
  }, [invoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const monthTotal = useMemo(() => {
    return invoices
      .filter(inv => isSameMonth(new Date(inv.dueDate), currentMonth) && inv.status !== 'pagata')
      .reduce((sum, inv) => sum + (inv.remainingAmount ?? inv.totalAmount), 0);
  }, [invoices, currentMonth]);

  // Get invoices for selected date
  const selectedDateInvoices = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return invoicesByDate.get(dateKey) || [];
  }, [selectedDate, invoicesByDate]);

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayInvoices = invoicesByDate.get(dateKey) || [];
    if (dayInvoices.length > 0) {
      setSelectedDate(isSameDay(day, selectedDate || new Date(0)) ? null : day);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Calendario Entrate
          </CardTitle>
          <Badge variant="outline" className="text-base px-3 py-1 bg-primary/10 text-primary border-primary/30">
            {formatCurrency(monthTotal)} previsti
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h3>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
            const dayInvoices = invoicesByDate.get(dateKey) || [];
            const pendingInvoices = dayInvoices.filter(inv => inv.status !== 'pagata');
            const hasInvoices = dayInvoices.length > 0;
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const totalAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.remainingAmount ?? inv.totalAmount), 0);
            const hasPaid = dayInvoices.some(inv => inv.status === 'pagata');
            const hasPending = pendingInvoices.length > 0;

            return (
              <div 
                key={dateKey}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all',
                  hasInvoices && 'cursor-pointer',
                  isToday && 'ring-2 ring-primary',
                  isSelected && 'ring-2 ring-accent bg-accent/20',
                  hasInvoices && hasPending && !isSelected && 'bg-primary/10 hover:bg-primary/20',
                  hasInvoices && hasPaid && !hasPending && !isSelected && 'bg-success/10 hover:bg-success/20',
                  !hasInvoices && 'hover:bg-muted/50'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  isToday && 'text-primary font-bold',
                  isSelected && 'text-accent-foreground font-bold',
                  hasInvoices && 'text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                {hasPending && totalAmount > 0 && (
                  <div className="flex flex-col items-center mt-0.5">
                    <Euro className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary hidden sm:block">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                )}
                {hasPaid && !hasPending && (
                  <div className="flex items-center mt-0.5">
                    <Euro className="h-3 w-3 text-success" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected date details */}
        {selectedDate && selectedDateInvoices.length > 0 && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/30">
            <h4 className="font-semibold mb-3">
              {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
            </h4>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {selectedDateInvoices.map(inv => (
                  <div 
                    key={inv.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-card border",
                      onInvoiceClick && "cursor-pointer hover:border-primary/50"
                    )}
                    onClick={() => onInvoiceClick?.(inv)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{inv.clientName}</p>
                      <p className="text-sm text-muted-foreground truncate">{inv.projectName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            inv.status === 'pagata' && 'bg-success/10 text-success border-success/30',
                            inv.status === 'inviata' && 'bg-primary/10 text-primary border-primary/30',
                            inv.status === 'parziale' && 'bg-warning/10 text-warning border-warning/30'
                          )}
                        >
                          {inv.status === 'pagata' ? 'Pagata' : inv.status === 'inviata' ? 'Inviata' : inv.status === 'parziale' ? 'Parziale' : 'Bozza'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(inv.remainingAmount ?? inv.totalAmount)}
                        </p>
                        {inv.paidAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            di {formatCurrency(inv.totalAmount)}
                          </p>
                        )}
                      </div>
                      {onInvoiceClick && (
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/30" />
            <span className="text-sm text-muted-foreground">In attesa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success/30" />
            <span className="text-sm text-muted-foreground">Pagata</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded ring-2 ring-primary" />
            <span className="text-sm text-muted-foreground">Oggi</span>
          </div>
          <p className="text-xs text-muted-foreground w-full mt-2">
            Tocca un giorno per vedere i dettagli
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
