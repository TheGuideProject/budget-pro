import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface MonthlyGoalProgressProps {
  expectedIncome: number;
  totalExpenses: number;
  balance: number;
  compact?: boolean;
}

export function MonthlyGoalProgress({ 
  expectedIncome, 
  totalExpenses, 
  balance,
  compact = false 
}: MonthlyGoalProgressProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  // Calculate progress towards covering expenses
  const progressPercent = totalExpenses > 0 
    ? Math.min(100, Math.max(0, (expectedIncome / totalExpenses) * 100))
    : 100;
  
  const isSurplus = balance > 0;
  const isDeficit = balance < 0;
  const isBreakEven = Math.abs(balance) < 50; // within €50 is "break even"

  // Determine color based on progress
  const getProgressColor = () => {
    if (progressPercent >= 100) return 'bg-green-500';
    if (progressPercent >= 75) return 'bg-amber-500';
    return 'bg-destructive';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Progress 
          value={progressPercent} 
          className="h-2 w-16 flex-shrink-0"
          indicatorClassName={getProgressColor()}
        />
        {isBreakEven ? (
          <Badge variant="secondary" className="text-[10px] px-1.5">~OK</Badge>
        ) : isSurplus ? (
          <Badge variant="default" className="text-[10px] px-1.5 bg-green-500">
            +{formatCurrency(balance)}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px] px-1.5">
            {formatCurrency(balance)}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <Target className="h-3 w-3" />
          Obiettivo: {formatCurrency(totalExpenses)}
        </span>
        <span className="font-medium">
          {progressPercent.toFixed(0)}%
        </span>
      </div>
      
      <Progress 
        value={progressPercent} 
        className="h-2"
        indicatorClassName={getProgressColor()}
      />
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-600 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Entrate: {formatCurrency(expectedIncome)}
        </span>
        
        {isBreakEven ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Pareggio
          </Badge>
        ) : isSurplus ? (
          <Badge variant="default" className="bg-green-500 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Surplus {formatCurrency(balance)}
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Mancano {formatCurrency(Math.abs(balance))}
          </Badge>
        )}
      </div>
    </div>
  );
}
