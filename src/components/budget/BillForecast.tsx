import { useMemo } from 'react';
import { format, subMonths, startOfMonth, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Zap, Flame, Droplets, Wifi, Phone, Building, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Expense, BillType, PaidBy, BILL_TYPES, PAID_BY_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';

interface BillForecastProps {
  expenses: Expense[];
}

interface BillStats {
  billType: BillType;
  provider: string;
  avgAmount: number;
  lastAmount: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  monthsData: { month: string; amount: number }[];
}

interface PaidByStats {
  name: PaidBy;
  total: number;
  count: number;
}

const billTypeIcons: Record<string, React.ReactNode> = {
  luce: <Zap className="h-4 w-4 text-yellow-500" />,
  gas: <Flame className="h-4 w-4 text-orange-500" />,
  acqua: <Droplets className="h-4 w-4 text-blue-500" />,
  internet: <Wifi className="h-4 w-4 text-purple-500" />,
  telefono: <Phone className="h-4 w-4 text-green-500" />,
  condominio: <Building className="h-4 w-4 text-gray-500" />,
  rifiuti: <Building className="h-4 w-4 text-amber-500" />,
  altro: <Building className="h-4 w-4 text-gray-400" />,
};

export function BillForecast({ expenses }: BillForecastProps) {
  const { billStats, paidByStats, forecastTotal, paidByTotal } = useMemo(() => {
    // Filter only bill expenses (with billType set)
    const billExpenses = expenses.filter(exp => exp.billType);
    
    if (billExpenses.length === 0) {
      return { billStats: [], paidByStats: [], forecastTotal: 0, paidByTotal: {} };
    }

    // Group by bill type and provider
    const groupedByType = new Map<string, Expense[]>();
    billExpenses.forEach(exp => {
      const key = `${exp.billType}-${exp.billProvider || 'unknown'}`;
      const existing = groupedByType.get(key) || [];
      groupedByType.set(key, [...existing, exp]);
    });

    // Calculate stats for each bill type
    const stats: BillStats[] = [];
    groupedByType.forEach((exps, key) => {
      const [billType, provider] = key.split('-');
      const sortedByDate = exps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const amounts = sortedByDate.map(e => e.amount);
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const lastAmount = amounts[0] || 0;
      
      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;
      
      if (amounts.length >= 2) {
        const recentAvg = amounts.slice(0, Math.min(3, amounts.length)).reduce((s, a) => s + a, 0) / Math.min(3, amounts.length);
        const olderAvg = amounts.slice(Math.min(3, amounts.length)).reduce((s, a) => s + a, 0) / Math.max(1, amounts.length - 3);
        
        if (olderAvg > 0) {
          trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
          if (trendPercent > 5) trend = 'up';
          else if (trendPercent < -5) trend = 'down';
        }
      }

      // Get monthly data
      const monthsData = sortedByDate.slice(0, 6).map(exp => ({
        month: format(new Date(exp.date), 'MMM yy', { locale: it }),
        amount: exp.amount,
      }));

      stats.push({
        billType: billType as BillType,
        provider,
        avgAmount,
        lastAmount,
        trend,
        trendPercent: Math.abs(trendPercent),
        monthsData,
      });
    });

    // Calculate paid by stats
    const paidByMap = new Map<PaidBy, { total: number; count: number }>();
    billExpenses.forEach(exp => {
      if (exp.paidBy) {
        const existing = paidByMap.get(exp.paidBy) || { total: 0, count: 0 };
        paidByMap.set(exp.paidBy, {
          total: existing.total + exp.amount,
          count: existing.count + 1,
        });
      }
    });

    const paidByStatsArray: PaidByStats[] = [];
    paidByMap.forEach((data, name) => {
      paidByStatsArray.push({ name, ...data });
    });

    // Calculate forecast total (average monthly bill cost)
    const forecastTotal = stats.reduce((sum, s) => sum + s.avgAmount, 0);

    // Create paidByTotal object for easy access
    const paidByTotalObj: Record<string, number> = {};
    paidByStatsArray.forEach(s => {
      paidByTotalObj[s.name] = s.total;
    });

    return { 
      billStats: stats, 
      paidByStats: paidByStatsArray, 
      forecastTotal,
      paidByTotal: paidByTotalObj 
    };
  }, [expenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const totalPaidByAll = paidByStats.reduce((sum, s) => sum + s.total, 0);

  if (billStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Previsione Bollette</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Carica delle bollette per vedere la previsione dei costi
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Forecast Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Previsione Bollette Mensile</CardTitle>
              <p className="text-xs text-muted-foreground">Basata sulla media storica degli importi</p>
            </div>
            <Badge variant="outline" className="text-lg">
              {formatCurrency(forecastTotal)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {billStats.map((stat, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {billTypeIcons[stat.billType]}
                <div>
                  <p className="font-medium">{stat.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    {BILL_TYPES.find(b => b.value === stat.billType)?.label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(stat.avgAmount)}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {stat.trend === 'up' && (
                      <span className="text-destructive flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stat.trendPercent.toFixed(0)}%
                      </span>
                    )}
                    {stat.trend === 'down' && (
                      <span className="text-success flex items-center">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        -{stat.trendPercent.toFixed(0)}%
                      </span>
                    )}
                    {stat.trend === 'stable' && (
                      <span className="text-muted-foreground">stabile</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Paid By Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chi ha pagato?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PAID_BY_OPTIONS.map((option) => {
            const stats = paidByStats.find(s => s.name === option.value);
            const total = stats?.total || 0;
            const count = stats?.count || 0;
            const percentage = totalPaidByAll > 0 ? (total / totalPaidByAll) * 100 : 0;

            return (
              <div key={option.value} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {count} bollette
                    </Badge>
                  </div>
                  <span className="font-bold">{formatCurrency(total)}</span>
                </div>
                <Progress 
                  value={percentage} 
                  className={cn(
                    'h-2',
                    option.value === 'Luca' && '[&>div]:bg-blue-500',
                    option.value === 'Dina' && '[&>div]:bg-pink-500',
                    option.value === 'Jacopo' && '[&>div]:bg-green-500'
                  )}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {percentage.toFixed(1)}% del totale
                </p>
              </div>
            );
          })}

          {totalPaidByAll > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Totale bollette</span>
                <span className="font-bold text-lg">{formatCurrency(totalPaidByAll)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}