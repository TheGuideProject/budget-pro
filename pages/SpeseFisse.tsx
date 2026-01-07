import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Receipt, Plus, Edit, Trash2, Calendar, Save, X, FileText, Tv, Music, Star, Package, Trophy, Wifi, Smartphone, Dumbbell, Shield, Play, Circle, Satellite, PieChart, CreditCard, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, SubscriptionType, SUBSCRIPTION_TYPES, PaidBy, PAID_BY_OPTIONS } from '@/types';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { toast } from 'sonner';
import { InstallmentPlanUploader } from '@/components/budget/InstallmentPlanUploader';
import { SpeseFisseCharts } from '@/components/spese-fisse/SpeseFisseCharts';
import { LoanPaymentsList } from '@/components/spese-fisse/LoanPaymentsList';
import { FamilyTransfersList } from '@/components/spese-fisse/FamilyTransfersList';

// Icon mapping for subscription types
const subscriptionIcons: Record<string, React.ReactNode> = {
  tv: <Tv className="h-5 w-5" />,
  music: <Music className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
  trophy: <Trophy className="h-5 w-5" />,
  satellite: <Satellite className="h-5 w-5" />,
  play: <Play className="h-5 w-5" />,
  apple: <Tv className="h-5 w-5" />,
  youtube: <Play className="h-5 w-5" />,
  smartphone: <Smartphone className="h-5 w-5" />,
  wifi: <Wifi className="h-5 w-5" />,
  dumbbell: <Dumbbell className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
  circle: <Circle className="h-5 w-5" />,
};

export default function SpeseFisse() {
  const { user } = useAuth();
  const { expenses, addExpense, updateExpense, deleteExpense } = useBudgetStore();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'fissa' as ExpenseCategory,
    dayOfMonth: 1,
    subscriptionType: undefined as SubscriptionType | undefined,
    totalInstallments: undefined as number | undefined,
    currentInstallment: undefined as number | undefined,
  });

  // Subscription dialog state
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [editingSub, setEditingSub] = useState<Expense | null>(null);
  const [subFormData, setSubFormData] = useState({
    subscriptionType: 'netflix' as SubscriptionType,
    customName: '',
    amount: 0,
    dayOfMonth: 1,
    paidBy: 'Luca' as PaidBy,
  });

  // Get recurring fixed expenses (original filter - kept for backwards compatibility)
  const fixedExpenses = expenses.filter(
    (exp) => exp.recurring && exp.category === 'fissa'
  );

  // Get subscriptions
  const subscriptions = expenses.filter(
    (exp) => exp.recurring && exp.category === 'abbonamenti'
  );

  const handleOpenNew = () => {
    setEditingExpense(null);
    setFormData({
      description: '',
      amount: 0,
      category: 'fissa',
      dayOfMonth: 1,
      subscriptionType: undefined,
      totalInstallments: undefined,
      currentInstallment: undefined,
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    const date = new Date(expense.date);
    // Try to extract installment info from description pattern "Rata X/Y - NAME"
    const match = expense.description.match(/rata\s+(\d+)\/(\d+)/i);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      dayOfMonth: date.getDate(),
      subscriptionType: expense.subscriptionType,
      totalInstallments: match ? parseInt(match[2]) : undefined,
      currentInstallment: match ? parseInt(match[1]) : undefined,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.description || formData.amount <= 0) {
      toast.error('Inserisci descrizione e importo validi');
      return;
    }

    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const now = new Date();
    const expenseDate = new Date(now.getFullYear(), now.getMonth(), formData.dayOfMonth);

    // Build description with installment pattern if provided
    let finalDescription = formData.description;
    if (formData.totalInstallments && formData.totalInstallments > 0) {
      const currentNum = formData.currentInstallment || 1;
      // Remove existing "Rata X/Y - " pattern if present
      const cleanDesc = formData.description.replace(/^rata\s+\d+\/\d+\s*[-–]\s*/i, '').trim();
      finalDescription = `Rata ${currentNum}/${formData.totalInstallments} - ${cleanDesc}`;
    }

    if (editingExpense) {
      await updateExpense(editingExpense.id, {
        description: finalDescription,
        amount: formData.amount,
        category: formData.category,
        date: expenseDate,
        bookedDate: expenseDate,
        subscriptionType: formData.subscriptionType,
      });
      toast.success('Spesa fissa aggiornata');
    } else {
      const expense: Expense = {
        id: crypto.randomUUID(),
        description: finalDescription,
        amount: formData.amount,
        category: formData.category,
        date: expenseDate,
        purchaseDate: expenseDate,
        bookedDate: expenseDate,
        recurring: true,
        expenseType: 'privata',
        paymentMethod: 'bonifico',
        subscriptionType: formData.subscriptionType,
      };
      await addExpense(expense, user.id);
      toast.success('Spesa fissa aggiunta');
    }

    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    toast.success('Spesa fissa eliminata');
  };

  // Subscription handlers
  const handleOpenNewSub = () => {
    setEditingSub(null);
    setSubFormData({
      subscriptionType: 'netflix',
      customName: '',
      amount: 0,
      dayOfMonth: 1,
      paidBy: 'Luca',
    });
    setShowSubDialog(true);
  };

  const handleOpenEditSub = (expense: Expense) => {
    setEditingSub(expense);
    const date = new Date(expense.date);
    setSubFormData({
      subscriptionType: expense.subscriptionType || 'altro',
      customName: expense.description,
      amount: expense.amount,
      dayOfMonth: date.getDate(),
      paidBy: expense.paidBy || 'Luca',
    });
    setShowSubDialog(true);
  };

  const handleSaveSub = async () => {
    if (subFormData.amount <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    const subType = SUBSCRIPTION_TYPES.find(s => s.value === subFormData.subscriptionType);
    const description = subFormData.customName || subType?.label || 'Abbonamento';
    
    const now = new Date();
    const expenseDate = new Date(now.getFullYear(), now.getMonth(), subFormData.dayOfMonth);

    if (editingSub) {
      await updateExpense(editingSub.id, {
        description,
        amount: subFormData.amount,
        date: expenseDate,
        bookedDate: expenseDate,
        subscriptionType: subFormData.subscriptionType,
        paidBy: subFormData.paidBy,
      });
      toast.success('Abbonamento aggiornato');
    } else {
      const expense: Expense = {
        id: crypto.randomUUID(),
        description,
        amount: subFormData.amount,
        category: 'abbonamenti',
        date: expenseDate,
        purchaseDate: expenseDate,
        bookedDate: expenseDate,
        recurring: true,
        expenseType: 'privata',
        paymentMethod: 'carta_credito',
        subscriptionType: subFormData.subscriptionType,
        paidBy: subFormData.paidBy,
      };
      await addExpense(expense, user.id);
      toast.success('Abbonamento aggiunto');
    }

    setShowSubDialog(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const totalMonthlyFixed = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalMonthlySubs = subscriptions.reduce((sum, exp) => sum + exp.amount, 0);
  const totalMonthly = totalMonthlyFixed + totalMonthlySubs;

  const getSubscriptionIcon = (subscriptionType?: SubscriptionType) => {
    if (!subscriptionType) return <Circle className="h-5 w-5" />;
    const sub = SUBSCRIPTION_TYPES.find(s => s.value === subscriptionType);
    if (!sub) return <Circle className="h-5 w-5" />;
    return subscriptionIcons[sub.icon] || <Circle className="h-5 w-5" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Spese Fisse</h1>
            <p className="text-muted-foreground">
              Gestisci rate, abbonamenti, trasferimenti e spese ricorrenti
            </p>
          </div>
        </div>

        <Tabs defaultValue="riepilogo" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="riepilogo" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
              <PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Riepilogo</span>
            </TabsTrigger>
            <TabsTrigger value="rate" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Rate</span>
            </TabsTrigger>
            <TabsTrigger value="trasferimenti" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Trasf.</span>
            </TabsTrigger>
            <TabsTrigger value="abbonamenti" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
              <Tv className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Abb.</span>
            </TabsTrigger>
            <TabsTrigger value="fisse" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Fisse</span>
            </TabsTrigger>
            <TabsTrigger value="importa" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Import</span>
            </TabsTrigger>
          </TabsList>

          {/* Riepilogo Tab - Charts */}
          <TabsContent value="riepilogo" className="space-y-4">
            <SpeseFisseCharts expenses={expenses} />
            
            {/* Debug Panel */}
            <DebugPanel
              title="Spese Fisse Totali"
              hookName="useBudgetStore().expenses + filters"
              calculation={`fixedExpenses = expenses.filter(recurring && category === 'fissa')
subscriptions = expenses.filter(recurring && category === 'abbonamenti')
totalMonthlyFixed = fixedExpenses.reduce(sum)
totalMonthlySubs = subscriptions.reduce(sum)`}
              values={[
                { label: 'Totale Fisse', value: totalMonthlyFixed },
                { label: 'Totale Abbonamenti', value: totalMonthlySubs },
                { label: 'Totale Mensile', value: totalMonthly },
                { label: 'N. Spese Fisse', value: fixedExpenses.length, isRaw: true },
                { label: 'N. Abbonamenti', value: subscriptions.length, isRaw: true },
              ]}
              dataSource="Supabase: expenses table via useBudgetStore()"
            />
          </TabsContent>

          {/* Rate & Prestiti Tab */}
          <TabsContent value="rate" className="space-y-4">
            <LoanPaymentsList expenses={expenses} />
          </TabsContent>

          {/* Trasferimenti Tab */}
          <TabsContent value="trasferimenti" className="space-y-4">
            <FamilyTransfersList expenses={expenses} />
          </TabsContent>

          {/* Abbonamenti Tab */}
          <TabsContent value="abbonamenti" className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Totale Abbonamenti Mensili</p>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(totalMonthlySubs)}</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm text-muted-foreground">Attivi</p>
                      <p className="text-xl sm:text-2xl font-bold">{subscriptions.length}</p>
                    </div>
                    <Button onClick={handleOpenNewSub} size="sm" className="shrink-0">
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Aggiungi</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscriptions Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="h-5 w-5" />
                  I Tuoi Abbonamenti
                </CardTitle>
                <CardDescription>
                  Streaming, telefonia, palestra e altri servizi ricorrenti
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Tv className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Nessun abbonamento registrato
                    </p>
                    <Button variant="outline" onClick={handleOpenNewSub}>
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi il primo abbonamento
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {subscriptions.map((sub) => {
                      const subType = SUBSCRIPTION_TYPES.find(s => s.value === sub.subscriptionType);
                      return (
                        <div
                          key={sub.id}
                          className="relative p-4 rounded-xl border bg-card hover:shadow-md transition-all group"
                        >
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              {getSubscriptionIcon(sub.subscriptionType)}
                            </div>
                            <div>
                              <p className="font-semibold">{sub.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Addebito il {new Date(sub.date).getDate()} del mese
                              </p>
                            </div>
                            <p className="text-2xl font-bold text-primary">
                              {formatCurrency(sub.amount)}
                            </p>
                            {sub.paidBy && (
                              <Badge variant={sub.paidBy === 'Jacopo' ? 'secondary' : sub.paidBy === 'Dina' ? 'outline' : 'default'} className="text-xs">
                                👤 {sub.paidBy}
                              </Badge>
                            )}
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEditSub(sub)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(sub.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Altre Fisse Tab (original lista) */}
          <TabsContent value="fisse" className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Totale Spese Fisse Ricorrenti</p>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(totalMonthlyFixed)}</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm text-muted-foreground">Spese</p>
                      <p className="text-xl sm:text-2xl font-bold">{fixedExpenses.length}</p>
                    </div>
                    <Button onClick={handleOpenNew} size="sm" className="shrink-0">
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Nuova</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Expenses List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Elenco Spese Fisse
                </CardTitle>
                <CardDescription>
                  Spese marcate come ricorrenti con categoria "Fissa"
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fixedExpenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessuna spesa fissa registrata con categoria "Fissa" e flag ricorrente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fixedExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{expense.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label}
                              </Badge>
                              <span>
                                Ogni {new Date(expense.date).getDate()} del mese
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
                            <p className="text-xs text-muted-foreground">/mese</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(expense)}
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Importa Piano Rate Tab */}
          <TabsContent value="importa" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Importa Piano Rate
                </CardTitle>
                <CardDescription>
                  Carica un documento con il piano rate di un finanziamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InstallmentPlanUploader />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Fixed Expense Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Modifica Spesa Fissa' : 'Nuova Spesa Fissa'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Es. Affitto, Rata mutuo..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Importo (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth">Giorno del mese</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ExpenseCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Installment fields */}
              <div className="space-y-2 p-3 rounded-lg bg-muted/30 border">
                <Label className="text-sm font-medium">Dettagli Rata (opzionale)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Compila se questa è una rata di un prestito/finanziamento
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="currentInstallment" className="text-xs">Rata corrente</Label>
                    <Input
                      id="currentInstallment"
                      type="number"
                      min="1"
                      value={formData.currentInstallment || ''}
                      onChange={(e) => setFormData({ ...formData, currentInstallment: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Es. 1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="totalInstallments" className="text-xs">Rate totali</Label>
                    <Input
                      id="totalInstallments"
                      type="number"
                      min="1"
                      value={formData.totalInstallments || ''}
                      onChange={(e) => setFormData({ ...formData, totalInstallments: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Es. 48"
                    />
                  </div>
                </div>
                {formData.totalInstallments && formData.totalInstallments > 0 && (
                  <p className="text-xs text-primary mt-2">
                    Anteprima: "Rata {formData.currentInstallment || 1}/{formData.totalInstallments} - {formData.description.replace(/^rata\s+\d+\/\d+\s*[-–]\s*/i, '').trim() || '[descrizione]'}"
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Subscription Dialog */}
        <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSub ? 'Modifica Abbonamento' : 'Nuovo Abbonamento'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo Abbonamento</Label>
                <Select
                  value={subFormData.subscriptionType}
                  onValueChange={(value: SubscriptionType) => setSubFormData({ ...subFormData, subscriptionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_TYPES.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>
                        <div className="flex items-center gap-2">
                          {subscriptionIcons[sub.icon] || <Circle className="h-4 w-4" />}
                          {sub.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customName">Nome personalizzato (opzionale)</Label>
                <Input
                  id="customName"
                  value={subFormData.customName}
                  onChange={(e) => setSubFormData({ ...subFormData, customName: e.target.value })}
                  placeholder="Es. Netflix famiglia"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subAmount">Importo (€)</Label>
                  <Input
                    id="subAmount"
                    type="number"
                    step="0.01"
                    value={subFormData.amount || ''}
                    onChange={(e) => setSubFormData({ ...subFormData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subDay">Giorno addebito</Label>
                  <Input
                    id="subDay"
                    type="number"
                    min="1"
                    max="31"
                    value={subFormData.dayOfMonth}
                    onChange={(e) => setSubFormData({ ...subFormData, dayOfMonth: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pagato da</Label>
                <Select
                  value={subFormData.paidBy}
                  onValueChange={(value: PaidBy) => setSubFormData({ ...subFormData, paidBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAID_BY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button onClick={handleSaveSub}>
                <Save className="h-4 w-4 mr-2" />
                Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
