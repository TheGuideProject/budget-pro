import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useExpectedExpenses } from '@/hooks/useExpectedExpenses';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { ExpectedExpense } from '@/types';
import { DebugPanel } from '@/components/debug/DebugPanel';

export function ExpectedExpensesTab() {
  const { expectedExpenses, isLoading, addExpectedExpense, updateExpectedExpense, deleteExpectedExpense, toggleCompleted } = useExpectedExpenses();
  const { settings, defaultSettings } = useFinancialSettings();
  const dailyRate = settings?.daily_rate ?? defaultSettings.daily_rate;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpectedExpense | null>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expectedDate: '',
    category: 'una_tantum' as 'una_tantum' | 'ricorrente',
    recurrenceMonths: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      expectedDate: '',
      category: 'una_tantum',
      recurrenceMonths: '',
      notes: '',
    });
    setEditingExpense(null);
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.expectedDate) return;

    const data = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      expectedDate: new Date(formData.expectedDate),
      category: formData.category,
      recurrenceMonths: formData.category === 'ricorrente' ? parseInt(formData.recurrenceMonths) || 1 : undefined,
      isCompleted: false,
      notes: formData.notes || undefined,
    };

    if (editingExpense) {
      await updateExpectedExpense.mutateAsync({ id: editingExpense.id, ...data });
    } else {
      await addExpectedExpense.mutateAsync(data);
    }

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (expense: ExpectedExpense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      expectedDate: format(expense.expectedDate, 'yyyy-MM-dd'),
      category: expense.category,
      recurrenceMonths: expense.recurrenceMonths?.toString() || '',
      notes: expense.notes || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminare questa spesa prevista?')) {
      await deleteExpectedExpense.mutateAsync(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const calculateWorkDaysImpact = (amount: number) => {
    return dailyRate > 0 ? (amount / dailyRate).toFixed(1) : '0';
  };

  // Group by month for impact preview
  const upcomingByMonth = expectedExpenses
    .filter(exp => !exp.isCompleted)
    .reduce((acc, exp) => {
      const monthKey = format(exp.expectedDate, 'yyyy-MM');
      if (!acc[monthKey]) acc[monthKey] = { total: 0, items: [] };
      acc[monthKey].total += exp.amount;
      acc[monthKey].items.push(exp);
      return acc;
    }, {} as Record<string, { total: number; items: ExpectedExpense[] }>);

  const totalPending = expectedExpenses
    .filter(exp => !exp.isCompleted)
    .reduce((sum, exp) => sum + exp.amount, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Spese in Arrivo</span>
            </div>
            <p className="text-2xl font-bold mt-1">{expectedExpenses.filter(e => !e.isCompleted).length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Totale Previsto</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Giorni Lavoro Extra</span>
            </div>
            <p className="text-2xl font-bold mt-1">{calculateWorkDaysImpact(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Debug Panel */}
      <DebugPanel
        title="Spese Previste"
        hookName="useExpectedExpenses() + useFinancialSettings()"
        calculation={`totalPending = expectedExpenses.filter(!isCompleted).reduce(sum)
workDaysImpact = totalPending / dailyRate
upcomingByMonth = group by format(expectedDate, 'yyyy-MM')`}
        values={[
          { label: 'Spese in Arrivo', value: expectedExpenses.filter(e => !e.isCompleted).length },
          { label: 'Totale Pendente', value: totalPending },
          { label: 'Giorni Lavoro Extra', value: parseFloat(calculateWorkDaysImpact(totalPending)) },
          { label: 'Tariffa Giornaliera', value: dailyRate },
          { label: 'Totale Spese Registrate', value: expectedExpenses.length, isRaw: true },
        ]}
        dataSource="Supabase: expected_expenses via useExpectedExpenses()"
      />

      {/* Impact preview by month */}
      {Object.keys(upcomingByMonth).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impatto sul Piano Lavoro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(upcomingByMonth)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(0, 4)
                .map(([monthKey, data]) => (
                  <div key={monthKey} className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(monthKey + '-01'), 'MMMM yyyy', { locale: it })}
                    </p>
                    <p className="font-bold">{formatCurrency(data.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      +{calculateWorkDaysImpact(data.total)} giorni
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add button and dialog */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Spese Previste</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Spesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Modifica Spesa' : 'Nuova Spesa Prevista'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="es. Manutenzione auto"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Importo (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expectedDate">Data Prevista</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Tipo</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: 'una_tantum' | 'ricorrente') => 
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="una_tantum">Una Tantum</SelectItem>
                    <SelectItem value="ricorrente">Ricorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.category === 'ricorrente' && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence">Frequenza (mesi)</Label>
                  <Select
                    value={formData.recurrenceMonths}
                    onValueChange={(value) => setFormData({ ...formData, recurrenceMonths: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona frequenza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Mensile</SelectItem>
                      <SelectItem value="3">Trimestrale</SelectItem>
                      <SelectItem value="6">Semestrale</SelectItem>
                      <SelectItem value="12">Annuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Note (opzionale)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive"
                />
              </div>

              {formData.amount && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Questa spesa richiederà <strong>+{calculateWorkDaysImpact(parseFloat(formData.amount) || 0)} giorni</strong> di lavoro.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                resetForm();
                setIsAddDialogOpen(false);
              }}>
                Annulla
              </Button>
              <Button onClick={handleSubmit} disabled={addExpectedExpense.isPending || updateExpectedExpense.isPending}>
                {editingExpense ? 'Salva' : 'Aggiungi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expenses table */}
      <Card>
        <CardContent className="pt-6">
          {expectedExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna spesa prevista</p>
              <p className="text-sm">Aggiungi spese future per vedere l'impatto sul piano lavoro</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-center">Giorni</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expectedExpenses.map((expense) => (
                  <TableRow key={expense.id} className={expense.isCompleted ? 'opacity-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={expense.isCompleted}
                        onCheckedChange={(checked) => 
                          toggleCompleted.mutate({ id: expense.id, isCompleted: !!checked })
                        }
                      />
                    </TableCell>
                    <TableCell className={expense.isCompleted ? 'line-through' : ''}>
                      {expense.description}
                      {expense.notes && (
                        <p className="text-xs text-muted-foreground">{expense.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(expense.expectedDate, 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={expense.category === 'ricorrente' ? 'default' : 'secondary'}>
                        {expense.category === 'ricorrente' 
                          ? `Ogni ${expense.recurrenceMonths} mesi`
                          : 'Una tantum'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        +{calculateWorkDaysImpact(expense.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
