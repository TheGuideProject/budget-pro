import React, { useState } from 'react';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { useHousehold } from '@/hooks/useHousehold';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Wallet, Briefcase, Home, Gift, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { IncomeSourceType, IncomeFrequency } from '@/types/household';
import { toast } from 'sonner';

const INCOME_TYPE_LABELS: Record<IncomeSourceType, { label: string; icon: React.ReactNode }> = {
  salary: { label: 'Stipendio', icon: <Briefcase className="h-4 w-4" /> },
  pension: { label: 'Pensione', icon: <Home className="h-4 w-4" /> },
  freelance: { label: 'Freelance', icon: <Wallet className="h-4 w-4" /> },
  support: { label: 'Supporto', icon: <Gift className="h-4 w-4" /> },
  other: { label: 'Altro', icon: <MoreHorizontal className="h-4 w-4" /> },
};

const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  monthly: 'Mensile',
  biweekly: 'Bisettimanale',
  weekly: 'Settimanale',
  one_time: 'Una tantum',
};

export function IncomeSourcesManager() {
  const { hasPermission } = useHousehold();
  const { 
    incomeSources, 
    monthlyIncome, 
    isLoading, 
    addIncomeSource, 
    deleteIncomeSource 
  } = useIncomeSources();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'salary' as IncomeSourceType,
    amount: '',
    frequency: 'monthly' as IncomeFrequency,
  });

  const canManageIncome = hasPermission('can_manage_income_sources');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amount) {
      toast.error('Compila tutti i campi');
      return;
    }

    try {
      await addIncomeSource.mutateAsync({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
      });
      
      toast.success('Fonte di reddito aggiunta');
      setIsDialogOpen(false);
      setFormData({ name: '', type: 'salary', amount: '', frequency: 'monthly' });
    } catch (error) {
      toast.error('Errore nel salvare');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIncomeSource.mutateAsync(id);
      toast.success('Fonte di reddito rimossa');
    } catch (error) {
      toast.error('Errore nella rimozione');
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Le Tue Entrate
          </CardTitle>
          <CardDescription>
            Gestisci le tue fonti di reddito
          </CardDescription>
        </div>
        {canManageIncome && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuova Fonte di Reddito</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="es. Stipendio Azienda XYZ"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v: IncomeSourceType) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INCOME_TYPE_LABELS).map(([key, { label, icon }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {icon}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Importo (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequenza</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(v: IncomeFrequency) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={addIncomeSource.isPending}>
                    {addIncomeSource.isPending ? 'Salvataggio...' : 'Salva'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {/* Monthly Total */}
        <div className="mb-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">Entrate mensili stimate</p>
          <p className="text-3xl font-bold">€{monthlyIncome.toFixed(2)}</p>
        </div>

        {/* Income Sources List */}
        {incomeSources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nessuna fonte di reddito registrata</p>
            {canManageIncome && (
              <p className="text-sm">Clicca "Aggiungi" per inserire le tue entrate</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {incomeSources.map((source) => (
              <div 
                key={source.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    {INCOME_TYPE_LABELS[source.type].icon}
                  </div>
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{INCOME_TYPE_LABELS[source.type].label}</Badge>
                      <span>{FREQUENCY_LABELS[source.frequency]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-green-600">
                    €{source.amount.toFixed(2)}
                  </span>
                  {canManageIncome && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(source.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
