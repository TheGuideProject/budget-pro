import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Package, 
  Plus,
  Pencil,
  Trash2,
  Check,
  Star
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSubscriptionPlans, useCreatePlan, useUpdatePlan, useDeletePlan, SubscriptionPlan } from '@/hooks/useAdminData';

interface PlanFormData {
  name: string;
  description: string;
  price: string;
  billing_period: string;
  features: string;
  is_active: boolean;
  sort_order: number;
}

const defaultFormData: PlanFormData = {
  name: '',
  description: '',
  price: '0',
  billing_period: 'monthly',
  features: '',
  is_active: true,
  sort_order: 0,
};

export default function AdminPlans() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      billing_period: plan.billing_period,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const featuresArray = formData.features
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const planData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
      billing_period: formData.billing_period,
      features: featuresArray,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
    };

    if (editingPlan) {
      await updatePlan.mutateAsync({ id: editingPlan.id, ...planData });
    } else {
      await createPlan.mutateAsync(planData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deletePlan.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="p-2 rounded-xl bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Piani Abbonamento</h1>
                <p className="text-sm text-muted-foreground">{plans?.length || 0} piani configurati</p>
              </div>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Piano
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Plans Grid */}
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden ${!plan.is_active ? 'opacity-60' : ''} ${plan.name === 'Pro' ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.name === 'Pro' && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Popolare
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">€{plan.price}</span>
                    <span className="text-muted-foreground">
                      /{plan.billing_period === 'yearly' ? 'anno' : 'mese'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-6">
                    {Array.isArray(plan.features) && plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Attivo' : 'Disattivato'}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(plan)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun piano configurato</h3>
            <p className="text-muted-foreground mb-4">Crea il tuo primo piano di abbonamento</p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Piano
            </Button>
          </Card>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Modifica Piano' : 'Nuovo Piano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Piano</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Es: Pro, Business..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrizione del piano"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prezzo (€)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing">Periodo</Label>
                <Select
                  value={formData.billing_period}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, billing_period: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensile</SelectItem>
                    <SelectItem value="yearly">Annuale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Funzionalità (una per riga)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                placeholder="Spese illimitate&#10;Analisi AI&#10;Export PDF"
                rows={5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Piano Attivo</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Ordine Visualizzazione</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annulla</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createPlan.isPending || updatePlan.isPending || !formData.name}
            >
              {(createPlan.isPending || updatePlan.isPending) ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Piano</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo piano? Gli utenti con questo piano attivo perderanno l'abbonamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
