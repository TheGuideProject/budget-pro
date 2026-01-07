import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { FolderOpen, Plus, Sparkles, Rocket } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { ReportChatDialog } from '@/components/projects/ReportChatDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDetailSheet } from '@/components/projects/ProjectDetailSheet';
import { ProjectHeroStats } from '@/components/projects/ProjectHeroStats';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Expense } from '@/types';
import { toast } from 'sonner';
import { ExpenseEditDialog } from '@/components/expense/ExpenseEditDialog';
import { supabase } from '@/integrations/supabase/client';
import { ProjectReport } from '@/hooks/useProjectReports';

export default function Projects() {
  const { user } = useAuth();
  const { projects, expenses, projectNotes, addProject, deleteProject, addProjectNote, deleteProjectNote, getProjectNotes, updateExpense, deleteExpense } = useBudgetStore();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: '', client: '', description: '' });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [uploadingExpenseId, setUploadingExpenseId] = useState<string | null>(null);
  const [deleteProjectDialog, setDeleteProjectDialog] = useState<Project | null>(null);
  const [showReportChat, setShowReportChat] = useState(false);
  const [editingReport, setEditingReport] = useState<ProjectReport | undefined>(undefined);

  const handleUploadReceipt = async (expenseId: string, file: File) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }
    setUploadingExpenseId(expenseId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${expenseId}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('expense-receipts').upload(fileName, file);
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('expense-receipts').getPublicUrl(fileName);
      await updateExpense(expenseId, { attachmentUrl: publicUrl.publicUrl });
      toast.success('Scontrino caricato con successo');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Errore durante il caricamento');
    } finally {
      setUploadingExpenseId(null);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name) {
      toast.error('Inserisci il nome del progetto');
      return;
    }
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }
    const project: Project = {
      id: crypto.randomUUID(),
      name: newProject.name,
      client: newProject.client || undefined,
      description: newProject.description || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await addProject(project, user.id);
    toast.success('Progetto creato');
    setNewProject({ name: '', client: '', description: '' });
    setShowDialog(false);
  };

  const getProjectExpenses = (projectId: string) => expenses.filter(exp => exp.projectId === projectId);
  const totalExpenses = projects.reduce((sum, p) => sum + getProjectExpenses(p.id).reduce((s, e) => s + e.amount, 0), 0);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="gradient-mesh-bg rounded-3xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3 mb-2">
                <Rocket className="h-8 w-8 text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold">I tuoi Progetti</h1>
              </div>
              <p className="text-muted-foreground">Gestisci lavori, spese e report AI</p>
            </div>
            <Button 
              onClick={() => setShowDialog(true)}
              className="h-12 px-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 opacity-0 animate-scale-in"
              style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuovo Progetto
            </Button>
          </div>

          <ProjectHeroStats
            totalProjects={projects.length}
            totalExpenses={totalExpenses}
            totalReports={0}
          />
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="empty-state-glass">
            <div className="empty-state-icon">
              <FolderOpen className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nessun progetto</h3>
            <p className="text-sm text-muted-foreground mb-6">Crea il tuo primo progetto per iniziare</p>
            <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Crea Progetto
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <div key={project.id} style={{ animationDelay: `${index * 0.1}s` }}>
                <ProjectCard
                  project={project}
                  expenses={getProjectExpenses(project.id)}
                  notes={getProjectNotes(project.id)}
                  onClick={() => setSelectedProject(project)}
                />
              </div>
            ))}
          </div>
        )}

        {/* New Project Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="neo-glass-static border-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Nuovo Progetto
              </DialogTitle>
              <DialogDescription>Crea un nuovo progetto per organizzare spese e report.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Progetto *</Label>
                <Input value={newProject.name} onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))} placeholder="es. Manutenzione Nave X" className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={newProject.client} onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))} placeholder="Nome cliente (opzionale)" className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea value={newProject.description} onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))} placeholder="Descrizione del progetto..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Annulla</Button>
              <Button onClick={handleAddProject} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">Crea Progetto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project Detail Sheet */}
        <ProjectDetailSheet
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          expenses={selectedProject ? getProjectExpenses(selectedProject.id) : []}
          notes={selectedProject ? getProjectNotes(selectedProject.id) : []}
          onAddNote={(title, content) => {
            if (selectedProject && user) {
              addProjectNote({ id: crypto.randomUUID(), projectId: selectedProject.id, title: title || undefined, content, createdAt: new Date(), updatedAt: new Date() }, user.id);
            }
          }}
          onDeleteNote={deleteProjectNote}
          onEditExpense={setEditingExpense}
          onDeleteExpense={deleteExpense}
          onUploadReceipt={handleUploadReceipt}
          uploadingExpenseId={uploadingExpenseId}
          onDeleteProject={() => selectedProject && setDeleteProjectDialog(selectedProject)}
          onOpenReportChat={(report) => { setEditingReport(report); setShowReportChat(true); }}
        />

        {/* Expense Edit Dialog */}
        <ExpenseEditDialog
          expense={editingExpense}
          projects={projects}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSave={(id, updates) => { updateExpense(id, updates); setEditingExpense(null); }}
          onDelete={(id) => { deleteExpense(id); setEditingExpense(null); }}
        />

        {/* Delete Project Confirmation */}
        <DeleteProjectDialog
          project={deleteProjectDialog}
          open={!!deleteProjectDialog}
          onOpenChange={(open) => !open && setDeleteProjectDialog(null)}
          onConfirm={() => {
            if (deleteProjectDialog) {
              deleteProject(deleteProjectDialog.id);
              setDeleteProjectDialog(null);
              setSelectedProject(null);
              toast.success('Progetto eliminato');
            }
          }}
        />

        {/* Report Chat Dialog */}
        {selectedProject && (
          <ReportChatDialog project={selectedProject} open={showReportChat} onOpenChange={setShowReportChat} existingReport={editingReport} />
        )}
      </div>
    </Layout>
  );
}
