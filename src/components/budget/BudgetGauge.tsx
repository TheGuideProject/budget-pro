import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BudgetGaugeProps {
  spent: number;
  total: number;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BudgetGauge({ spent, total, compact = false, size = 'md' }: BudgetGaugeProps) {
  const percentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (spent / total) * 100));
  }, [spent, total]);

  const status = useMemo(() => {
    if (percentage >= 90) return { color: 'text-destructive', gradient: 'from-destructive to-destructive/70', label: 'Critico', glow: 'shadow-destructive/30' };
    if (percentage >= 70) return { color: 'text-warning', gradient: 'from-warning to-warning/70', label: 'Attenzione', glow: 'shadow-warning/30' };
    return { color: 'text-success', gradient: 'from-success to-success/70', label: 'OK', glow: 'shadow-success/30' };
  }, [percentage]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sizeConfig = {
    sm: { wrapper: 'h-28 w-28', stroke: 8, textSize: 'text-sm', labelSize: 'text-[10px]' },
    md: { wrapper: 'h-36 w-36 md:h-44 md:w-44', stroke: 10, textSize: 'text-base md:text-lg', labelSize: 'text-xs' },
    lg: { wrapper: 'h-44 w-44 md:h-52 md:w-52', stroke: 12, textSize: 'text-lg md:text-xl', labelSize: 'text-sm' },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn(
      'flex flex-col items-center gap-2 md:gap-4 p-4 rounded-2xl',
      'bg-gradient-to-br from-background/50 to-muted/30',
      'backdrop-blur-sm border border-border/50',
      compact && 'gap-1 md:gap-2 p-2'
    )}>
      <div className={cn('relative', config.wrapper)}>
        {/* Glow effect behind gauge */}
        <div className={cn(
          'absolute inset-0 rounded-full blur-xl opacity-30',
          `bg-gradient-to-br ${status.gradient}`
        )} />
        
        <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
          {/* Background track with subtle gradient */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#trackGradient)"
            strokeWidth={config.stroke}
            className="opacity-50"
          />
          
          {/* Progress with gradient */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-700',
              percentage >= 90 ? 'stroke-destructive' : percentage >= 70 ? 'stroke-warning' : 'stroke-success'
            )}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 8px hsl(var(--${percentage >= 90 ? 'destructive' : percentage >= 70 ? 'warning' : 'success'}) / 0.5))`
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className={cn('font-bold', status.color, config.textSize)}>
            {Math.round(percentage)}%
          </span>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-muted-foreground',
            'bg-muted/50 backdrop-blur-sm',
            config.labelSize
          )}>
            {status.label}
          </span>
        </div>
      </div>
      
      {!compact && (
        <div className="text-center space-y-1">
          <p className="text-xs md:text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{formatCurrency(spent)}</span> su {formatCurrency(total)}
          </p>
          <p className={cn(
            'text-xs md:text-sm font-medium px-3 py-1 rounded-full',
            'bg-gradient-to-r',
            percentage >= 90 ? 'from-destructive/10 to-destructive/5 text-destructive' :
            percentage >= 70 ? 'from-warning/10 to-warning/5 text-warning' :
            'from-success/10 to-success/5 text-success'
          )}>
            Rimanente: {formatCurrency(Math.max(0, total - spent))}
          </p>
        </div>
      )}
    </div>
  );
}
