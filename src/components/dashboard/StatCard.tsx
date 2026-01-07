import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      'neo-glass group relative overflow-hidden p-4 md:p-6 transition-all duration-300',
      'hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]',
      'hover:border-primary/30',
      className
    )}>
      {/* Glow ring effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      </div>
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 md:mt-2 text-xl md:text-3xl font-bold gradient-text truncate">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  trend.isPositive 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">vs mese scorso</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl',
          'bg-gradient-to-br from-primary/20 to-accent/10',
          'shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]',
          'group-hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.3)]',
          'transition-all duration-300'
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
