import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { FileText, Trash2, Eye, Calendar, MessageSquare, Edit, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProjectReports, ProjectReport } from '@/hooks/useProjectReports';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectReportsListProps {
  project: Project;
  onEditReport?: (report: ProjectReport) => void;
}

export function ProjectReportsList({ project, onEditReport }: ProjectReportsListProps) {
  const { reports, loading, deleteReport } = useProjectReports(project.id);
  const [viewingReport, setViewingReport] = useState<ProjectReport | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Caricamento report...</span>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="empty-state-glass">
        <div className="empty-state-icon">
          <FileText className="h-10 w-10 text-primary" />
        </div>
        <h4 className="font-medium mb-1">Nessun report AI</h4>
        <p className="text-sm text-muted-foreground">Crea il primo report con l'assistente AI</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {reports.map((report, index) => (
          <div 
            key={report.id} 
            className={cn(
              "report-card p-4 opacity-0 animate-slide-up",
              `stagger-${Math.min(index + 1, 4)}`
            )}
            style={{ animationFillMode: 'forwards' }}
          >
            {/* Status Indicator */}
            <div className={cn(
              "report-card-status",
              report.status === 'final' ? 'final' : 'draft'
            )} />

            {/* Content */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-medium leading-tight line-clamp-2 mb-2">
                  {report.title}
                </h5>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge 
                    variant={report.status === 'final' ? 'default' : 'secondary'}
                    className={cn(
                      "text-[10px] px-2 py-0.5",
                      report.status === 'final' && "bg-gradient-to-r from-success to-accent text-white"
                    )}
                  >
                    {report.status === 'final' ? '✓ Finale' : 'Bozza'}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(report.updated_at), "dd MMM", { locale: it })}
                  </span>
                  {report.chat_history.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {report.chat_history.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
              {report.status === 'final' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-9 hover:bg-primary/10"
                  onClick={() => setViewingReport(report)}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Visualizza
                </Button>
              )}
              {onEditReport && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-9 hover:bg-primary/10"
                  onClick={() => onEditReport(report)}
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  {report.status === 'final' ? 'Modifica' : 'Continua'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteReport(report.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* View Report Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="flex flex-col p-0 gap-0 max-h-[100dvh] sm:max-h-[90vh]">
          <DialogHeader className="sheet-header-glass shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="truncate">{viewingReport?.title}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto overscroll-contain p-6">
            <div className="neo-glass p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm break-words">
                {viewingReport?.content}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
