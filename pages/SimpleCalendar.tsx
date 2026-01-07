import { useState, useMemo } from 'react';
import { SimpleLayout } from '@/components/simple/SimpleLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Receipt, CalendarDays } from 'lucide-react';
import { useBudgetStore } from '@/store/budgetStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function SimpleCalendar() {
  const { expenses } = useBudgetStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const expensesByDate = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(expense => {
      const dateKey = format(new Date(expense.date), 'yyyy-MM-dd');
      map.set(dateKey, (map.get(dateKey) || 0) + expense.amount);
    });
    return map;
  }, [expenses]);

  const selectedDateExpenses = useMemo(() => {
    if (!selectedDate) return [];
    return expenses.filter(expense => 
      isSameDay(new Date(expense.date), selectedDate)
    );
  }, [expenses, selectedDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const monthTotal = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, currentMonth]);

  return (
    <SimpleLayout title="Calendario">
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Month Navigation */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h2 className="font-semibold capitalize text-lg">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </h2>
              <p className="text-sm text-muted-foreground">
                Totale: {formatCurrency(monthTotal)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before start of month */}
            {Array.from({ length: (calendarDays[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const hasExpenses = expensesByDate.has(dateKey);
              const dayTotal = expensesByDate.get(dateKey) || 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all',
                    isToday(day) && 'ring-2 ring-primary/50',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && hasExpenses && 'bg-muted',
                    !isSelected && !hasExpenses && 'hover:bg-muted/50'
                  )}
                >
                  <span className={cn(
                    'font-medium',
                    !isSameMonth(day, currentMonth) && 'text-muted-foreground'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasExpenses && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Expenses */}
        <div className="flex-1 overflow-y-auto p-4 pb-20">
          {selectedDate ? (
            <>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {format(selectedDate, "d MMMM yyyy", { locale: it })}
              </h3>
              
              {selectedDateExpenses.length === 0 ? (
                <div className="neo-glass p-6 text-center">
                  <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Nessuna spesa in questo giorno</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateExpenses.map((expense) => (
                    <Card key={expense.id} className="neo-glass">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-xs text-muted-foreground capitalize">{expense.category}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Totale giorno</span>
                      <span className="font-semibold">
                        {formatCurrency(selectedDateExpenses.reduce((sum, e) => sum + e.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="neo-glass p-6 text-center">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Seleziona un giorno per vedere le spese</p>
            </div>
          )}
        </div>
      </div>
    </SimpleLayout>
  );
}
