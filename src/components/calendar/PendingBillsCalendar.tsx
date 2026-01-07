import { useState, useMemo } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, isPast, isSameMonth 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Zap, Flame, Droplets, Wifi, Phone, Building, AlertTriangle, Check, TrendingUp, CreditCard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Expense, BILL_TYPES, PAID_BY_OPTIONS, PaidBy, BillType } from '@/types';
import { cn } from '@/lib/utils';
import { useBudgetStore } from '@/store/budgetStore';
import { useBillForecast } from '@/hooks/useBillForecast';
import { toast } from 'sonner';

interface PendingBillsCalendarProps {
  expenses: Expense[];
}

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

export function PendingBillsCalendar({ expenses }: PendingBillsCalendarProps) {
    const { updateExpense } = useBudgetStore();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    // Get bill forecast data
    const { monthlyForecasts } = useBillForecast(expenses, 12);

    // Filter only unpaid bills AND unpaid installments (category 'fissa' with isPaid false)
    const pendingBills = expenses.filter(exp => 
      (exp.billType && exp.isPaid === false) || 
      (exp.category === 'fissa' && exp.isPaid === false && !exp.recurring)
    );

    // Separate installments from regular bills
    const installments = pendingBills.filter(exp => 
      exp.description?.includes('Rata') && exp.category === 'fissa' && !exp.billType
    );
    const regularBills = pendingBills.filter(exp => 
      !(exp.description?.includes('Rata') && exp.category === 'fissa' && !exp.billType)
    );

    // Get installments for current month
    const currentMonthInstallments = installments.filter(inst => 
      isSameMonth(new Date(inst.date), currentMonth)
    );

    const days = useMemo(() => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // Get current month's forecast
    const currentMonthKey = format(currentMonth, 'yyyy-MM');
    const currentMonthForecast = monthlyForecasts.find(f => f.monthKey === currentMonthKey);

    const getBillsForDay = (date: Date) => {
      return pendingBills.filter(bill => isSameDay(new Date(bill.date), date));
    };

    const getDayTotal = (date: Date) => {
      return getBillsForDay(date).reduce((sum, bill) => sum + bill.amount, 0);
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const markAsPaid = async (bill: Expense, paidBy: PaidBy) => {
      await updateExpense(bill.id, {
        isPaid: true,
        paidAt: new Date(),
        paidBy,
      });
      toast.success(`Bolletta segnata come pagata da ${paidBy}`);
    };

    const selectedDayBills = selectedDay ? getBillsForDay(selectedDay) : [];

    // Get first day offset
    const firstDayOfMonth = startOfMonth(currentMonth);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const offset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    // Get forecasted bills for this month
    const forecastedBills = currentMonthForecast?.bills.filter(b => b.isForecast) || [];

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Bollette da Pagare
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Forecasted bills for this month */}
          {forecastedBills.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Previsione Bollette</span>
                <Badge variant="outline" className="text-xs">Stima</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {forecastedBills.map((bill, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {billTypeIcons[bill.billType]}
                    <span className="truncate">{bill.provider}</span>
                    <span className="font-bold text-primary ml-auto">{formatCurrency(bill.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-primary/20 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Totale stimato</span>
                <span className="font-bold text-primary">
                  {formatCurrency(forecastedBills.reduce((sum, b) => sum + b.amount, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {days.map(day => {
              const dayBills = getBillsForDay(day);
              const dayTotal = getDayTotal(day);
              const hasBills = dayBills.length > 0;
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isOverdue = hasBills && isPast(day) && !isToday(day);
              const isDueToday = hasBills && isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => hasBills && setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    'aspect-square p-1 rounded-md text-center transition-all',
                    hasBills && 'cursor-pointer',
                    isSelected && 'ring-2 ring-primary',
                    isOverdue && 'bg-destructive/20 border border-destructive/50',
                    isDueToday && 'bg-warning/20 border border-warning/50',
                    hasBills && !isOverdue && !isDueToday && 'bg-muted/50 hover:bg-muted',
                    isToday(day) && !hasBills && 'bg-primary/10'
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium',
                    isToday(day) && 'text-primary font-bold'
                  )}>
                    {format(day, 'd')}
                  </div>
                  {hasBills && (
                    <div className="mt-0.5">
                      <div className="flex justify-center gap-0.5">
                        {dayBills.slice(0, 3).map((bill, idx) => (
                          <span key={idx}>
                            {bill.billType && billTypeIcons[bill.billType]}
                          </span>
                        ))}
                      </div>
                      <div className={cn(
                        'text-[10px] font-bold mt-0.5',
                        isOverdue ? 'text-destructive' : isDueToday ? 'text-warning' : 'text-primary'
                      )}>
                        {formatCurrency(dayTotal)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day details */}
          {selectedDay && selectedDayBills.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {format(selectedDay, "EEEE d MMMM", { locale: it })}
                </h4>
                <Badge variant={isPast(selectedDay) && !isToday(selectedDay) ? "destructive" : "outline"}>
                  {selectedDayBills.length} bollette
                </Badge>
              </div>
              <div className="space-y-2">
                {selectedDayBills.map(bill => (
                  <div key={bill.id} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {bill.billType && billTypeIcons[bill.billType]}
                        <span className="font-medium">{bill.billProvider || bill.description}</span>
                        {bill.billType && (
                          <Badge variant="outline" className="text-xs">
                            {BILL_TYPES.find(b => b.value === bill.billType)?.label}
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold">{formatCurrency(bill.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Segna pagata da:</span>
                      {PAID_BY_OPTIONS.map(option => (
                        <Button
                          key={option.value}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => markAsPaid(bill, option.value)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingBills.length === 0 && forecastedBills.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Nessuna bolletta da pagare
            </p>
          )}
        </CardContent>
    </Card>
  );
}
