import { Euro, FolderOpen, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectHeroStatsProps {
  totalProjects: number;
  totalExpenses: number;
  totalReports: number;
}

export function ProjectHeroStats({ totalProjects, totalExpenses, totalReports }: ProjectHeroStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      icon: Euro,
      value: formatCurrency(totalExpenses),
      label: 'Totale Spese',
      gradient: 'from-primary to-accent',
    },
    {
      icon: FolderOpen,
      value: totalProjects.toString(),
      label: 'Progetti',
      gradient: 'from-accent to-success',
    },
    {
      icon: Sparkles,
      value: totalReports.toString(),
      label: 'Report AI',
      gradient: 'from-warning to-primary',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "hero-stat-card opacity-0 animate-scale-in",
            `stagger-${index + 1}`
          )}
          style={{ animationFillMode: 'forwards' }}
        >
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br",
            stat.gradient
          )}>
            <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <p className="stat-value text-lg md:text-2xl">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
