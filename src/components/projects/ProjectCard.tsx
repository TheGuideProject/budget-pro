import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { FolderOpen, User, Receipt, StickyNote, MessageSquare, ChevronRight, Sparkles } from 'lucide-react';
import { Project, Expense, ProjectNote } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  expenses: Expense[];
  notes: ProjectNote[];
  reportsCount?: number;
  onClick: () => void;
}

export function ProjectCard({ project, expenses, notes, reportsCount = 0, onClick }: ProjectCardProps) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <article
      className="project-card group opacity-0 animate-slide-up"
      style={{ animationFillMode: 'forwards' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="project-icon">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          {project.client && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{project.client}</span>
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="stat-badge">
          <Receipt className="h-3.5 w-3.5 text-primary" />
          <span>{expenses.length} spese</span>
        </div>
        <div className="stat-badge">
          <StickyNote className="h-3.5 w-3.5 text-accent" />
          <span>{notes.length} note</span>
        </div>
        {reportsCount > 0 && (
          <div className="stat-badge">
            <Sparkles className="h-3.5 w-3.5 text-warning" />
            <span>{reportsCount} AI</span>
          </div>
        )}
      </div>

      {/* Total & Date */}
      <div className="flex items-end justify-between pt-4 border-t border-border/30">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Totale spese</p>
          <p className={cn(
            "text-xl font-bold transition-all",
            total > 0 ? "gradient-text" : "text-muted-foreground"
          )}>
            {formatCurrency(total)}
          </p>
        </div>
        <time className="text-xs text-muted-foreground">
          {format(new Date(project.createdAt), "dd MMM ''yy", { locale: it })}
        </time>
      </div>
    </article>
  );
}
