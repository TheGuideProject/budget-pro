import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  getDate
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Receipt, CreditCard, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Expense, EXPENSE_CATEGORIES } from '@/types';
import { cn } from '@/lib/utils';

interface RecurringExpensesCalendarProps {
  expenses: Expense[];
  onExpenseClick?: (expense: Expense) => void;
}

export function RecurringExpensesCalendar({ expenses, onExpenseClick }: RecurringExpensesCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const expensesByDay = useMemo(() => {
    const map = new Map<number, Expense[]>();
    expenses.forEach(exp => {
      const dayOfMonth = getDate(new Date(exp.date));
      const existing = map.get(dayOfMonth) || [];
      map.set(dayOfMonth, [...existing, exp]);
    });
    return map;
  }, [expenses]);

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
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const selectedDayExpenses = useMemo(() => {
    if (selectedDay === null) return [];
    return expensesByDay.get(selectedDay) || [];
  }, [selectedDay, expensesByDay]);

  const handleDayClick = (dayOfMonth: number) => {
    const dayExpenses = expensesByDay.get(dayOfMonth) || [];
    if (dayExpenses.length > 0) {
      setSelectedDay(selectedDay === dayOfMonth ? null : dayOfMonth);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Spese Ricorrenti
          </CardTitle>
          <Badge variant="outline" className="text-base px-3 py-1 bg-destructive/10 text-destructive border-destructive/30">
            {formatCurrency(monthTotal)} / mese
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
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: adjustedStartDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {daysInMonth.map(day => {
            const dayOfMonth = getDate(day);
            const dayExpenses = expensesByDay.get(dayOfMonth) || [];
            const hasExpenses = dayExpenses.length > 0;
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay === dayOfMonth;
            const totalAmount = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            return (
              <div 
                key={dayOfMonth}
                onClick={() => handleDayClick(dayOfMonth)}
                className={cn(
                  'aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all',
                  hasExpenses && 'cursor-pointer',
                  isToday && 'ring-2 ring-primary',
                  isSelected && 'ring-2 ring-accent bg-accent/20',
                  hasExpenses && !isSelected && 'bg-destructive/10 hover:bg-destructive/20',
                  !hasExpenses && 'hover:bg-muted/50'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  isToday && 'text-primary font-bold',
                  isSelected && 'text-accent-foreground font-bold',
                  hasExpenses && 'text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                {hasExpenses && (
                  <div className="flex flex-col items-center mt-0.5">
                    <Receipt className="h-3 w-3 text-destructive" />
                    <span className="text-[10px] font-medium text-destructive hidden sm:block">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected day details */}
        {selectedDay !== null && selectedDayExpenses.length > 0 && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/30">
            <h4 className="font-semibold mb-3">
              Giorno {selectedDay} di ogni mese
            </h4>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {selectedDayExpenses.map(exp => (
                  <div 
                    key={exp.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-card border",
                      onExpenseClick && "cursor-pointer hover:border-primary/50"
                    )}
                    onClick={() => onExpenseClick?.(exp)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{exp.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(exp.category)}
                        </Badge>
                        {exp.paymentMethod === 'carta_credito' && (
                          <Badge variant="secondary" className="text-xs">
                            <CreditCard className="h-3 w-3 mr-1" />
                            CC
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold">{formatCurrency(exp.amount)}</span>
                      {onExpenseClick && (
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-destructive/30" />
            <span className="text-sm text-muted-foreground">Spesa ricorrente</span>
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
