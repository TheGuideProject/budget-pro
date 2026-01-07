import { useState, useMemo, useEffect } from 'react';
import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus, Trash2, Send, Save, CalendarIcon, FolderOpen, Receipt, Settings, Users, Star, UserPlus, Mail, Building2, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserClients } from '@/hooks/useUserClients';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { Invoice, InvoiceItem } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InvoiceOCRScanner } from '@/components/invoice/InvoiceOCRScanner';
import { InvoiceSettingsDialog } from '@/components/invoice/InvoiceSettingsDialog';
import { ClientsManagerDialog } from '@/components/invoice/ClientsManagerDialog';
import { InvoiceImportScanner } from '@/components/invoice/InvoiceImportScanner';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePdf } from '@/utils/generateInvoicePdf';

export default function NewInvoice() {
  const { user } = useAuth();
  const { invoices, expenses, projects, addInvoice } = useBudgetStore();
  const { clients, addClient, findClientByName, loading: clientsLoading } = useUserClients();
  const { settings, hasCompanyData, loading: settingsLoading, refetch: refetchSettings } = useInvoiceSettings();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showClientsDialog, setShowClientsDialog] = useState(false);
  const [showImportScanner, setShowImportScanner] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  
  // Get expenses for selected project
  const projectExpenses = useMemo(() => {
    if (!selectedProjectId) return [];
    return expenses.filter(exp => exp.projectId === selectedProjectId && exp.expenseType === 'aziendale');
  }, [expenses, selectedProjectId]);

  const projectExpensesTotal = useMemo(() => {
    return projectExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [projectExpenses]);
  
  const getNextInvoiceNumber = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const yearInvoices = invoices.filter(inv => inv.invoiceNumber.endsWith(`/${currentYear}`));
    const nextNum = yearInvoices.length + 1;
    return `${nextNum}/${currentYear}`;
  };

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: getNextInvoiceNumber(),
    clientName: '',
    clientAddress: '',
    clientVat: '',
    projectName: '',
    projectLocation: '',
    workStartDate: new Date(),
    workEndDate: new Date(),
    invoiceDate: new Date(),
    paymentDays: 60,
  });

  // Update payment days when settings load
  useEffect(() => {
    if (!settingsLoading && settings.default_payment_days) {
      setInvoiceData(prev => ({ ...prev, paymentDays: settings.default_payment_days }));
    }
  }, [settingsLoading, settings.default_payment_days]);

  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    { quantity: 1, description: '', unitPrice: 500, amount: 500 },
  ]);

  // Update unit price when settings load
  useEffect(() => {
    if (!settingsLoading && settings.default_unit_price) {
      setItems(prev => prev.map((item, idx) => 
        idx === 0 ? { ...item, unitPrice: settings.default_unit_price, amount: item.quantity * settings.default_unit_price } : item
      ));
    }
  }, [settingsLoading, settings.default_unit_price]);

  const [additionalExpenses, setAdditionalExpenses] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [status, setStatus] = useState<'bozza' | 'inviata'>('bozza');

  const calculateDueDate = () => {
    return addDays(invoiceData.workEndDate, invoiceData.paymentDays);
  };

  const calculateTotal = () => {
    const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
    return itemsTotal + additionalExpenses + projectExpensesTotal;
  };

  const updateItem = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: number | string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { quantity: 1, description: '', unitPrice: settings.default_unit_price, amount: settings.default_unit_price }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const generateDescription = () => {
    if (invoiceData.projectName && invoiceData.projectLocation) {
      const start = format(invoiceData.workStartDate, 'dd/MM/yyyy');
      const end = format(invoiceData.workEndDate, 'dd/MM/yyyy');
      return `${invoiceData.projectName} - SERVICE SURVEY ON BOARD - ${invoiceData.projectLocation} - FROM [${start} TO ${end}]`;
    }
    return '';
  };

  // Calculate working days inclusive (start and end count)
  const calculateWorkingDays = () => {
    return differenceInCalendarDays(invoiceData.workEndDate, invoiceData.workStartDate) + 1;
  };

  // Auto-update first item description and quantity when project details change
  useEffect(() => {
    if (invoiceData.projectName && invoiceData.projectLocation && settings.show_work_dates) {
      const desc = generateDescription();
      const days = calculateWorkingDays();
      
      setItems(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const firstItem = updated[0];
        const isAutoGenerated = !firstItem.description || 
          firstItem.description.includes('SERVICE SURVEY') ||
          firstItem.description === '';
        
        if (isAutoGenerated) {
          updated[0] = {
            ...firstItem,
            description: desc,
            quantity: days,
            amount: days * firstItem.unitPrice,
          };
        }
        return updated;
      });
    }
  }, [invoiceData.projectName, invoiceData.projectLocation, invoiceData.workStartDate, invoiceData.workEndDate, settings.show_work_dates]);

  // Handle client selection
  const handleClientSelect = (value: string) => {
    if (value === '__new__') {
      setShowClientsDialog(true);
      return;
    }
    
    const client = clients.find(c => c.id === value);
    if (client) {
      setInvoiceData(prev => ({
        ...prev,
        clientName: client.name,
        clientAddress: client.address || '',
        clientVat: client.vat || '',
      }));
      setClientEmail(client.email || '');
    }
  };

  const handleSave = async (newStatus: 'bozza' | 'inviata') => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    // Auto-save client if new
    if (invoiceData.clientName && !findClientByName(invoiceData.clientName)) {
      await addClient({
        name: invoiceData.clientName,
        address: invoiceData.clientAddress || undefined,
        vat: invoiceData.clientVat || undefined,
        email: clientEmail || undefined,
      });
    }

    const total = calculateTotal();
    const remaining = total - paidAmount;
    const finalStatus = paidAmount > 0 && paidAmount < total ? 'parziale' : newStatus;

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: invoiceData.invoiceNumber,
      clientName: invoiceData.clientName,
      clientAddress: invoiceData.clientAddress,
      clientVat: invoiceData.clientVat,
      projectName: invoiceData.projectName,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: calculateDueDate(),
      items: items.map(item => ({ ...item, id: crypto.randomUUID() })),
      totalAmount: total,
      paidAmount: paidAmount,
      remainingAmount: remaining,
      status: finalStatus,
      paymentTerms: `Payment terms: ${invoiceData.paymentDays} Days End of Work date (${format(calculateDueDate(), 'do MMMM yyyy')})`,
      createdAt: new Date(),
    };

    addInvoice(invoice, user.id);
    toast.success(newStatus === 'inviata' ? 'Fattura inviata e salvata!' : 'Fattura salvata come bozza');
    
    // Reset form
    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber: getNextInvoiceNumber(),
      clientName: '',
      clientAddress: '',
      clientVat: '',
      projectName: '',
      projectLocation: '',
    }));
    setItems([{ quantity: 1, description: '', unitPrice: settings.default_unit_price, amount: settings.default_unit_price }]);
    setAdditionalExpenses(0);
    setPaidAmount(0);
    setClientEmail('');
    setSelectedProjectId(undefined);
  };

  const handleSendEmail = async () => {
    if (!clientEmail) {
      toast.error('Inserisci l\'email del cliente');
      return;
    }
    if (!hasCompanyData) {
      toast.error('Configura i tuoi dati contabili nelle impostazioni');
      setShowSettingsDialog(true);
      return;
    }

    setSendingEmail(true);
    try {
      // Build company info from settings
      const companyInfo = {
        name: settings.company_name,
        address: settings.company_address,
        country: settings.company_country || 'Italia',
        iban: settings.company_iban,
        bic: settings.company_bic,
        bankAddress: settings.company_bank_address,
      };

      // Generate PDF
      const invoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: invoiceData.clientName,
        clientAddress: invoiceData.clientAddress,
        clientVat: invoiceData.clientVat,
        projectName: invoiceData.projectName,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: calculateDueDate(),
        items: items.map(item => ({ ...item, id: crypto.randomUUID() })),
        totalAmount: calculateTotal(),
        paidAmount: paidAmount,
        remainingAmount: calculateTotal() - paidAmount,
        status: 'inviata',
        paymentTerms: `Payment terms: ${invoiceData.paymentDays} Days End of Work date (${format(calculateDueDate(), 'do MMMM yyyy')})`,
        createdAt: new Date(),
      };

      const pdfBlob = generateInvoicePdf(invoice, companyInfo);
      
      // Convert to base64
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = btoa(
        new Uint8Array(pdfArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          recipientEmail: clientEmail,
          recipientName: invoiceData.clientName,
          senderName: settings.company_name,
          senderEmail: settings.company_email || undefined,
          invoiceNumber: invoiceData.invoiceNumber,
          totalAmount: calculateTotal() - paidAmount,
          dueDate: calculateDueDate().toISOString(),
          pdfBase64,
          projectName: invoiceData.projectName || undefined,
        },
      });

      if (error) throw error;

      toast.success(`Fattura inviata a ${clientEmail}`);
      
      // Also save the invoice
      await handleSave('inviata');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Errore nell\'invio email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOCRImport = (data: {
    invoiceNumber: string;
    clientName: string;
    clientAddress: string;
    clientVat: string;
    projectName: string;
    invoiceDate: string;
    dueDate: string;
    workStartDate?: string;
    workEndDate?: string;
    paymentDays?: number;
    items: Array<{
      quantity: number;
      description: string;
      unitPrice: number;
      amount: number;
    }>;
    totalAmount: number;
    paidAmount: number;
    clientEmail?: string;
  }) => {
    // Calculate payment days from invoice date and due date if both are present
    let calculatedPaymentDays = invoiceData.paymentDays;
    if (data.invoiceDate && data.dueDate) {
      const invoiceDateParsed = parseISO(data.invoiceDate);
      const dueDateParsed = parseISO(data.dueDate);
      const diffDays = Math.round((dueDateParsed.getTime() - invoiceDateParsed.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) calculatedPaymentDays = 0;
      else if (diffDays <= 22) calculatedPaymentDays = 15;
      else if (diffDays <= 45) calculatedPaymentDays = 30;
      else if (diffDays <= 75) calculatedPaymentDays = 60;
      else calculatedPaymentDays = 90;
    }

    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
      clientName: data.clientName || prev.clientName,
      clientAddress: data.clientAddress || prev.clientAddress,
      clientVat: data.clientVat || prev.clientVat,
      projectName: data.projectName || prev.projectName,
      invoiceDate: data.invoiceDate ? parseISO(data.invoiceDate) : prev.invoiceDate,
      workStartDate: data.workStartDate ? parseISO(data.workStartDate) : prev.workStartDate,
      workEndDate: data.workEndDate ? parseISO(data.workEndDate) : prev.workEndDate,
      paymentDays: data.paymentDays ?? calculatedPaymentDays,
    }));

    if (data.clientEmail) {
      setClientEmail(data.clientEmail);
    }

    if (data.items && data.items.length > 0) {
      setItems(data.items.map(item => ({
        quantity: item.quantity || 1,
        description: item.description || '',
        unitPrice: item.unitPrice || 0,
        amount: item.amount || 0,
      })));
    }

    if (data.paidAmount) {
      setPaidAmount(data.paidAmount);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Get selected client id for the select
  const selectedClientId = clients.find(c => c.name === invoiceData.clientName)?.id || '';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Neo-Glass Header */}
        <div className="gradient-mesh-bg p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Nuova Fattura
              </h1>
              <p className="mt-2 text-muted-foreground">
                Crea e invia fatture professionali
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowImportScanner(true)} 
                className="neo-glass border-border/30 hover:bg-background/50"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Importa
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowClientsDialog(true)} 
                className="neo-glass border-border/30 hover:bg-background/50"
              >
                <Users className="h-4 w-4 mr-2" />
                Clienti
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSettingsDialog(true)} 
                className="neo-glass border-border/30 hover:bg-background/50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
              </Button>
            </div>
          </div>
        </div>

        {/* Company Data Alert */}
        {!hasCompanyData && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Configura i tuoi dati contabili nelle impostazioni per generare fatture complete.{' '}
              <Button variant="link" className="p-0 h-auto text-amber-600" onClick={() => setShowSettingsDialog(true)}>
                Configura ora
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice Preview */}
        <Card className="neo-glass overflow-hidden border-border/30">
          {/* Company Header */}
          <div className="bg-gradient-to-r from-primary via-primary/90 to-accent p-6">
            <div className="flex items-center justify-between">
              <div className="text-primary-foreground">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 opacity-80" />
                  <span className="text-sm opacity-80">Mittente</span>
                </div>
                <h2 className="text-2xl font-bold">
                  {settings.company_name || 'Configura i tuoi dati'}
                </h2>
                <p className="text-sm opacity-80">{settings.company_address}</p>
                {settings.company_vat && (
                  <p className="text-xs opacity-70 mt-1">P.IVA: {settings.company_vat}</p>
                )}
              </div>
              <div className="text-right text-primary-foreground">
                <p className="text-sm opacity-80">Fattura N°</p>
                <Input
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="text-2xl font-mono font-bold bg-white/20 border-white/30 text-primary-foreground placeholder:text-primary-foreground/50 w-32 text-right"
                />
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Client & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Dati Cliente
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>Cliente</Label>
                    <Select
                      value={selectedClientId}
                      onValueChange={handleClientSelect}
                    >
                      <SelectTrigger className="bg-background/50 border-border/30">
                        <SelectValue placeholder="Seleziona o inserisci cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.filter(c => c.is_favorite).length > 0 && (
                          <>
                            {clients.filter(c => c.is_favorite).map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex items-center gap-2">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {client.name}
                                </div>
                              </SelectItem>
                            ))}
                            <Separator className="my-1" />
                          </>
                        )}
                        {clients.filter(c => !c.is_favorite).map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                        {clients.length > 0 && <Separator className="my-1" />}
                        <SelectItem value="__new__">
                          <div className="flex items-center gap-2 text-primary">
                            <UserPlus className="h-4 w-4" />
                            Gestisci clienti...
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!selectedClientId && (
                    <div>
                      <Label>Nome Cliente</Label>
                      <Input
                        value={invoiceData.clientName}
                        onChange={(e) => setInvoiceData(prev => ({ ...prev, clientName: e.target.value }))}
                        placeholder="Inserisci nome cliente..."
                        className="bg-background/50 border-border/30"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Indirizzo</Label>
                    <Input
                      value={invoiceData.clientAddress}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, clientAddress: e.target.value }))}
                      placeholder="Indirizzo completo"
                      className="bg-background/50 border-border/30"
                    />
                  </div>
                  
                  {settings.show_client_vat && (
                    <div>
                      <Label>P.IVA / C.F.</Label>
                      <Input
                        value={invoiceData.clientVat}
                        onChange={(e) => setInvoiceData(prev => ({ ...prev, clientVat: e.target.value }))}
                        placeholder="Partita IVA o Codice Fiscale"
                        className="bg-background/50 border-border/30"
                      />
                    </div>
                  )}

                  <div>
                    <Label className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email Cliente
                    </Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="email@cliente.it"
                      className="bg-background/50 border-border/30"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Date
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Data Fattura</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm bg-background/50 border-border/30">
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">{format(invoiceData.invoiceDate, 'dd/MM/yyyy')}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={invoiceData.invoiceDate}
                          onSelect={(date) => date && setInvoiceData(prev => ({ ...prev, invoiceDate: date }))}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Termini Pagamento</Label>
                    <Select
                      value={invoiceData.paymentDays.toString()}
                      onValueChange={(value) => setInvoiceData(prev => ({ ...prev, paymentDays: parseInt(value) }))}
                    >
                      <SelectTrigger className="bg-background/50 border-border/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Immediato</SelectItem>
                        <SelectItem value="15">15 giorni</SelectItem>
                        <SelectItem value="30">30 giorni</SelectItem>
                        <SelectItem value="60">60 giorni</SelectItem>
                        <SelectItem value="90">90 giorni</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {settings.show_work_dates && (
                    <>
                      <div>
                        <Label>{settings.work_start_label}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm bg-background/50 border-border/30">
                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                              <span className="truncate">{format(invoiceData.workStartDate, 'dd/MM/yyyy')}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={invoiceData.workStartDate}
                              onSelect={(date) => date && setInvoiceData(prev => ({ ...prev, workStartDate: date }))}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>{settings.work_end_label}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm bg-background/50 border-border/30">
                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                              <span className="truncate">{format(invoiceData.workEndDate, 'dd/MM/yyyy')}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={invoiceData.workEndDate}
                              onSelect={(date) => date && setInvoiceData(prev => ({ ...prev, workEndDate: date }))}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-sm text-muted-foreground">Scadenza Pagamento</p>
                  <p className="font-semibold text-foreground">
                    {format(calculateDueDate(), 'dd MMMM yyyy', { locale: it })}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                Dettagli Progetto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{settings.project_name_label}</Label>
                  <Input
                    placeholder="es. M/T STENA TRANSIT"
                    value={invoiceData.projectName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, projectName: e.target.value }))}
                    className="bg-background/50 border-border/30"
                  />
                </div>
                {settings.show_project_location && (
                  <div>
                    <Label>{settings.project_location_label}</Label>
                    <Input
                      placeholder="es. ANTWERP - EDR SY {BE}"
                      value={invoiceData.projectLocation}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, projectLocation: e.target.value }))}
                      className="bg-background/50 border-border/30"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Voci Fattura</h3>
                <Button variant="outline" size="sm" onClick={addItem} className="border-border/30">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Voce
                </Button>
              </div>

              <div className="border border-border/30 rounded-xl overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 bg-muted/30 p-3 font-medium text-sm">
                  <div className="col-span-1">Qtà</div>
                  <div className="col-span-6">Descrizione</div>
                  <div className="col-span-2">Prezzo Unit.</div>
                  <div className="col-span-2">Totale</div>
                  <div className="col-span-1"></div>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="p-3 border-t border-border/30 space-y-3 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                    {/* Mobile layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Qtà</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="text-center w-16 bg-background/50 border-border/30"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn("font-semibold", item.amount < 0 && "text-destructive")}>
                            {formatCurrency(item.amount)}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Prezzo Unitario</Label>
                        <Input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Negativo per debiti"
                          className="bg-background/50 border-border/30"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Descrizione</Label>
                        <Textarea
                          value={item.description || generateDescription()}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Descrizione servizio..."
                          className="min-h-[60px] bg-background/50 border-border/30"
                        />
                      </div>
                    </div>
                    
                    {/* Desktop layout */}
                    <div className="hidden md:block col-span-1">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="text-center bg-background/50 border-border/30"
                      />
                    </div>
                    <div className="hidden md:block col-span-6">
                      <Textarea
                        value={item.description || generateDescription()}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Descrizione servizio... (usa valori negativi per sconti/debiti)"
                        className="min-h-[60px] bg-background/50 border-border/30"
                      />
                    </div>
                    <div className="hidden md:block col-span-2">
                      <Input
                        type="number"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="Negativo per debiti"
                        className="bg-background/50 border-border/30"
                      />
                    </div>
                    <div className={cn("hidden md:block col-span-2 font-semibold", item.amount < 0 && "text-destructive")}>
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="hidden md:block col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Expenses & Paid Amount */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Label className="whitespace-nowrap">Progetto</Label>
                    <Select
                      value={selectedProjectId || 'none'}
                      onValueChange={(v) => setSelectedProjectId(v === 'none' ? undefined : v)}
                    >
                      <SelectTrigger className="flex-1 bg-background/50 border-border/30">
                        <SelectValue placeholder="Seleziona progetto..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessun progetto</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.client && `(${p.client})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedProjectId && projectExpenses.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Spese Progetto ({projectExpenses.length})
                      </span>
                      <span className="font-semibold text-primary">{formatCurrency(projectExpensesTotal)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
                      {projectExpenses.map((exp) => (
                        <div key={exp.id} className="flex justify-between">
                          <span className="truncate">{exp.description}</span>
                          <span>{formatCurrency(exp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Altre Spese</Label>
                    <Input
                      type="number"
                      value={additionalExpenses}
                      onChange={(e) => setAdditionalExpenses(parseFloat(e.target.value) || 0)}
                      className="w-full sm:w-32 bg-background/50 border-border/30"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Anticipo Pagato</Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full sm:w-32 bg-background/50 border-border/30"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              {paidAmount > 0 && (
                <div className="bg-muted/30 p-4 rounded-xl border border-border/30">
                  <p className="text-sm text-muted-foreground">Anticipo</p>
                  <p className="text-xl font-bold text-muted-foreground">-{formatCurrency(paidAmount)}</p>
                </div>
              )}
              <div className="bg-gradient-to-r from-primary via-primary/90 to-accent p-4 sm:p-6 rounded-xl text-primary-foreground shadow-lg">
                <p className="text-sm opacity-80">Totale {paidAmount > 0 ? 'Rimanente' : 'Fattura'}</p>
                <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(calculateTotal() - paidAmount)}</p>
                {paidAmount > 0 && (
                  <p className="text-sm opacity-70 mt-1">Totale lordo: {formatCurrency(calculateTotal())}</p>
                )}
              </div>
            </div>

            {/* Payment Info */}
            {hasCompanyData && (
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Dettagli Pagamento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Beneficiario</p>
                    <p className="font-medium">{settings.company_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">IBAN</p>
                    <p className="font-mono text-xs">{settings.company_iban}</p>
                  </div>
                  {settings.company_bic && (
                    <div>
                      <p className="text-muted-foreground">BIC</p>
                      <p className="font-mono">{settings.company_bic}</p>
                    </div>
                  )}
                  {settings.company_bank_address && (
                    <div>
                      <p className="text-muted-foreground">Banca</p>
                      <p>{settings.company_bank_address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <Badge variant="outline" className="text-base px-4 py-2 w-fit bg-background/50">
            Stato: {status === 'bozza' ? 'Bozza' : 'Inviata'}
          </Badge>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => handleSave('bozza')} className="w-full sm:w-auto border-border/30">
              <Save className="h-4 w-4 mr-2" />
              Salva Bozza
            </Button>
            <Button variant="outline" onClick={() => handleSave('inviata')} className="w-full sm:w-auto border-border/30">
              <Send className="h-4 w-4 mr-2" />
              Segna come Inviata
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={!clientEmail || sendingEmail}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingEmail ? 'Invio...' : 'Invia via Email'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <InvoiceSettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={(open) => {
          setShowSettingsDialog(open);
          if (!open) refetchSettings();
        }} 
      />
      <ClientsManagerDialog open={showClientsDialog} onOpenChange={setShowClientsDialog} />
      {showImportScanner && (
        <InvoiceImportScanner 
          onInvoiceExtracted={(data) => {
            handleOCRImport(data as any);
            setShowImportScanner(false);
          }}
          onCompanyDataSaved={() => refetchSettings()}
          defaultMode="full"
          showModeSelector={true}
        />
      )}
    </Layout>
  );
}
