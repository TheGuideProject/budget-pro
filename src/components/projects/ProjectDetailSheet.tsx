import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  X, Euro, Receipt, StickyNote, MessageSquare, Trash2, Edit,
  Plus, Download, Upload, Calendar, FolderOpen, Sparkles
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProjectReportsList } from './ProjectReportsList';
import { Project, ProjectNote, Expense } from '@/types';
import { ProjectReport } from '@/hooks/useProjectReports';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectDetailSheetProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  notes: ProjectNote[];
  onAddNote: (title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onUploadReceipt: (expenseId: string, file: File) => void;
  uploadingExpenseId: string | null;
  onDeleteProject: () => void;
  onOpenReportChat: (report?: ProjectReport) => void;
}

export function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
  expenses,
  notes,
  onAddNote,
  onDeleteNote,
  onEditExpense,
  onDeleteExpense,
  onUploadReceipt,
  uploadingExpenseId,
  onDeleteProject,
  onOpenReportChat,
}: ProjectDetailSheetProps) {
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState('overview');

  if (!project) return null;

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handleAddNote = () => {
    if (!newNote.content) {
      toast.error('Inserisci il contenuto della nota');
      return;
    }
    onAddNote(newNote.title, newNote.content);
    setNewNote({ title: '', content: '' });
    toast.success('Nota aggiunta');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        {/* Header */}
        <SheetHeader className="sheet-header-glass shrink-0">
          <div className="flex items-start gap-4">
            <div className="project-icon shrink-0">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{project.name}</SheetTitle>
              {project.client && (
                <p className="text-sm text-muted-foreground mt-1">{project.client}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Hero Stats */}
        <div className="px-6 py-4 shrink-0">
          <div className="grid grid-cols-3 gap-3">
            <div className="hero-stat-card">
              <Euro className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="stat-value">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground mt-1">Totale</p>
            </div>
            <div className="hero-stat-card">
              <Receipt className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="stat-value">{expenses.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Spese</p>
            </div>
            <div className="hero-stat-card">
              <StickyNote className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="stat-value">{notes.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Note</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="tabs-glass w-full">
              <TabsTrigger value="overview" className="tab-trigger-glass flex-1">
                <Receipt className="h-4 w-4 mr-1.5" />
                Spese
              </TabsTrigger>
              <TabsTrigger value="notes" className="tab-trigger-glass flex-1">
                <StickyNote className="h-4 w-4 mr-1.5" />
                Note
              </TabsTrigger>
              <TabsTrigger value="ai" className="tab-trigger-glass flex-1">
                <Sparkles className="h-4 w-4 mr-1.5" />
                AI
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <Tabs value={activeTab} className="w-full">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {project.description && (
                <div className="neo-glass p-4">
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
              )}

              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">Nessuna spesa associata</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="neo-glass p-4 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{expense.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{format(new Date(expense.date), 'dd MMM yyyy', { locale: it })}</span>
                            {expense.expenseType === 'aziendale' && (
                              <Badge variant="outline" className="text-xs">Aziendale</Badge>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-primary shrink-0">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                        {expense.attachmentUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(expense.attachmentUrl!, '_blank');
                            }}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Scontrino
                          </Button>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              id={`upload-sheet-${expense.id}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onUploadReceipt(expense.id, file);
                                e.target.value = '';
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => document.getElementById(`upload-sheet-${expense.id}`)?.click()}
                              disabled={uploadingExpenseId === expense.id}
                            >
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              {uploadingExpenseId === expense.id ? '...' : 'Carica'}
                            </Button>
                          </>
                        )}
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onEditExpense(expense)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => {
                            onDeleteExpense(expense.id);
                            toast.success('Spesa eliminata');
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0 space-y-4">
              {/* Add Note Form */}
              <div className="neo-glass p-4 space-y-3">
                <Input
                  placeholder="Titolo (opzionale)"
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  className="h-11"
                />
                <Textarea
                  placeholder="Scrivi la tua nota..."
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
                <Button onClick={handleAddNote} disabled={!newNote.content} className="w-full h-11">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Nota
                </Button>
              </div>

              {/* Notes List */}
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">Nessuna nota per questo progetto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="neo-glass p-4 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {note.title && (
                            <h5 className="font-medium mb-1">{note.title}</h5>
                          )}
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {note.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(note.createdAt), "dd MMM yyyy 'alle' HH:mm", { locale: it })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => {
                            onDeleteNote(note.id);
                            toast.success('Nota eliminata');
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* AI Reports Tab */}
            <TabsContent value="ai" className="mt-0 space-y-4">
              <Button
                onClick={() => onOpenReportChat()}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Nuovo Report AI
              </Button>

              <ProjectReportsList
                project={project}
                onEditReport={(report) => onOpenReportChat(report)}
              />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t bg-background/80 backdrop-blur-sm">
          <Button
            variant="destructive"
            className="w-full h-11"
            onClick={onDeleteProject}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina Progetto
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
