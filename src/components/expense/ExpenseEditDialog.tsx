import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Upload, Trash2, Download, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Expense, PaymentMethod, ExpenseType, Project } from '@/types';
import { CategoryPicker } from './CategoryPicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExpenseEditDialogProps {
  expense: Expense | null;
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Expense>) => void;
  onDelete?: (id: string) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'contanti', label: 'Contanti' },
  { value: 'bancomat', label: 'Bancomat' },
  { value: 'carta_credito', label: 'Carta di Credito' },
  { value: 'bonifico', label: 'Bonifico' },
];

const EXPENSE_TYPES: { value: ExpenseType; label: string }[] = [
  { value: 'privata', label: 'Privata' },
  { value: 'aziendale', label: 'Aziendale' },
];

export function ExpenseEditDialog({ 
  expense, 
  projects,
  open, 
  onOpenChange, 
  onSave,
  onDelete 
}: ExpenseEditDialogProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [categoryParent, setCategoryParent] = useState<string | null>(null);
  const [categoryChild, setCategoryChild] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();
  const [recurring, setRecurring] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>('privata');
  const [projectId, setProjectId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('contanti');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount);
      // Use new category system with fallback to legacy
      setCategoryParent(expense.categoryParent || null);
      setCategoryChild(expense.categoryChild || null);
      setDate(new Date(expense.date));
      setPurchaseDate(expense.purchaseDate ? new Date(expense.purchaseDate) : undefined);
      setRecurring(expense.recurring);
      setExpenseType(expense.expenseType || 'privata');
      setProjectId(expense.projectId);
      setPaymentMethod(expense.paymentMethod || 'contanti');
      setNotes(expense.notes || '');
      setAttachmentUrl(expense.attachmentUrl);
    }
  }, [expense]);

  const handleCategoryChange = (parentId: string, childId?: string | null) => {
    setCategoryParent(parentId);
    setCategoryChild(childId || null);
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !expense) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Carica solo file immagine (JPG, PNG, etc.)');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${expense.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(fileName);

      setAttachmentUrl(publicUrl);
      toast.success('Scontrino caricato');
    } catch (error: any) {
      toast.error('Errore upload: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveReceipt = async () => {
    if (!attachmentUrl || !expense) return;

    try {
      const path = attachmentUrl.split('/expense-receipts/')[1];
      if (path) {
        await supabase.storage.from('expense-receipts').remove([path]);
      }
      setAttachmentUrl(undefined);
      toast.success('Scontrino rimosso');
    } catch (error: any) {
      toast.error('Errore rimozione: ' + error.message);
    }
  };

  const handleSave = () => {
    if (!expense) return;

    const updates: Partial<Expense> = {
      description,
      amount,
      category: expense.category, // Keep legacy field
      categoryParent: categoryParent || undefined,
      categoryChild: categoryChild || undefined,
      date,
      purchaseDate,
      recurring,
      expenseType,
      projectId: projectId || undefined,
      paymentMethod,
      notes: notes || undefined,
      attachmentUrl,
    };

    onSave(expense.id, updates);
    onOpenChange(false);
    toast.success('Spesa aggiornata');
  };

  const handleDelete = () => {
    if (!expense || !onDelete) return;
    onDelete(expense.id);
    onOpenChange(false);
    toast.success('Spesa eliminata');
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Spesa</DialogTitle>
          <DialogDescription>
            Modifica i dettagli della spesa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Descrizione</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label>Importo (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* New hierarchical category picker */}
          <div>
            <Label>Categoria</Label>
            <CategoryPicker
              value={categoryParent}
              childValue={categoryChild}
              onChange={handleCategoryChange}
              placeholder="Seleziona categoria"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Spesa</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[300]">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Data Acquisto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, 'dd/MM/yyyy') : 'Seleziona...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[300]">
                  <Calendar
                    mode="single"
                    selected={purchaseDate}
                    onSelect={setPurchaseDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Metodo Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo Spesa</Label>
              <Select value={expenseType} onValueChange={(v: ExpenseType) => setExpenseType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {EXPENSE_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Progetto</Label>
            <Select 
              value={projectId || 'none'} 
              onValueChange={(v) => setProjectId(v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nessun progetto" />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                <SelectItem value="none">Nessun progetto</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Spesa Ricorrente</Label>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          <div>
            <Label>Note</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note aggiuntive..."
              rows={2}
            />
          </div>

          {/* Receipt Upload - only for business expenses */}
          {expenseType === 'aziendale' && (
            <div className="space-y-2">
              <Label>Scontrino / Ricevuta</Label>
              {attachmentUrl ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  <Image className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-sm truncate">Scontrino allegato</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(attachmentUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Scarica
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveReceipt}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadReceipt}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Caricamento...' : 'Carica Scontrino'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {onDelete && (
            <Button variant="destructive" onClick={handleDelete} className="sm:mr-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            Salva Modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
