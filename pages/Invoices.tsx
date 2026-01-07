import { useState, useMemo } from 'react';
import { format, startOfYear, isBefore, isAfter, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Plus, Search, Filter, Eye, Edit, Trash2, Check, Send, Pencil,
  AlertTriangle, CheckCircle, XCircle, Upload, Calendar, Download, Wallet, Package, FileText, ReceiptText, Mail, User, Briefcase, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateInvoicePdf } from '@/utils/generateInvoicePdf';
import { Layout } from '@/components/layout/Layout';
import { InvoiceTable } from '@/components/dashboard/InvoiceTable';
import { InvoiceAnalytics } from '@/components/invoice/InvoiceAnalytics';
import { BulkInvoiceUpload } from '@/components/invoice/BulkInvoiceUpload';
import { FamilyTransfersList } from '@/components/invoice/FamilyTransfersList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBudgetStore } from '@/store/budgetStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PaymentVerification } from '@/components/invoice/PaymentVerification';
import { InvoiceEditDialog } from '@/components/invoice/InvoiceEditDialog';

export default function Invoices() {
  const { invoices, updateInvoice, deleteInvoice } = useBudgetStore();
  const { isSecondary } = useUserProfile();
  const { settings } = useInvoiceSettings();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<string>(isSecondary ? 'transfers' : 'invoices');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Extract unique clients and projects for filters
  const uniqueClients = useMemo(() => 
    [...new Set(invoices.map(inv => inv.clientName))].filter(Boolean).sort(),
    [invoices]
  );
  
  const uniqueProjects = useMemo(() => 
    [...new Set(invoices.map(inv => inv.projectName))].filter(Boolean).sort(),
    [invoices]
  );

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesClient = clientFilter === 'all' || inv.clientName === clientFilter;
    const matchesProject = projectFilter === 'all' || inv.projectName === projectFilter;
    const matchesYear = new Date(inv.invoiceDate).getFullYear() === selectedYear;
    
    return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesYear;
  }), [invoices, searchQuery, statusFilter, clientFilter, projectFilter, selectedYear]);

  const sortedInvoices = [...filteredInvoices].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const activeFiltersCount = [statusFilter, clientFilter, projectFilter].filter(f => f !== 'all').length;

  const clearAllFilters = () => {
    setStatusFilter('all');
    setClientFilter('all');
    setProjectFilter('all');
    setSearchQuery('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleSendEmail = async (invoice: Invoice) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    // Find client email from invoice data or settings
    const clientEmail = (invoice as any).clientEmail;
    if (!clientEmail) {
      toast.error('Email cliente non disponibile. Modifica la fattura per aggiungere l\'email.');
      return;
    }

    if (!settings.company_name) {
      toast.error('Configura i dati aziendali nelle impostazioni fattura');
      return;
    }

    setSendingEmail(true);
    try {
      // Generate PDF blob
      const companyInfo = {
        name: settings.company_name,
        address: settings.company_address,
        country: settings.company_country,
        vatNumber: settings.company_vat,
        iban: settings.company_iban,
        bic: settings.company_bic,
        bankAddress: settings.company_bank_address,
      };
      
      const pdfBlob = await generateInvoicePdf(invoice, companyInfo);
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      // Call edge function
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          recipientEmail: clientEmail,
          recipientName: invoice.clientName,
          senderName: settings.company_name,
          senderEmail: settings.company_email || undefined,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          dueDate: invoice.dueDate,
          pdfBase64,
          projectName: invoice.projectName,
        },
      });

      if (error) throw error;

      toast.success(`Email inviata a ${clientEmail}`);
      
      // Update invoice status to "inviata" if it was "bozza"
      if (invoice.status === 'bozza') {
        updateInvoice(invoice.id, { status: 'inviata' });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Errore nell\'invio email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: Invoice['status']) => {
    updateInvoice(id, { status: newStatus });
    toast.success(`Stato fattura aggiornato a "${newStatus}"`);
  };

  const handlePaymentVerified = (id: string, verified: boolean, screenshotUrl?: string, method?: 'ocr' | 'manual') => {
    updateInvoice(id, { 
      paymentVerified: verified,
      paymentScreenshotUrl: screenshotUrl,
      verificationMethod: method
    });
  };

  const handleDelete = (id: string) => {
    deleteInvoice(id);
    setSelectedInvoice(null);
    toast.success('Fattura eliminata');
  };

  const getVerificationBadge = (invoice: Invoice) => {
    if (invoice.status !== 'pagata' && invoice.status !== 'parziale') return null;
    
    if (invoice.paymentVerified && invoice.verificationMethod === 'ocr') {
      return (
        <Badge className="bg-success/20 text-success border-success/30 text-xs backdrop-blur-sm">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verificato
        </Badge>
      );
    }
    
    if (invoice.paymentVerified && invoice.verificationMethod === 'manual') {
      return (
        <Badge className="bg-warning/20 text-warning border-warning/30 text-xs backdrop-blur-sm">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Manuale
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs backdrop-blur-sm">
        <XCircle className="h-3 w-3 mr-1" />
        Non verificato
      </Badge>
    );
  };

  const statusConfig = {
    bozza: { label: 'Bozza', color: 'text-muted-foreground', bg: 'bg-muted/50', borderColor: 'border-border/50' },
    inviata: { label: 'Inviata', color: 'text-primary', bg: 'bg-primary/10', borderColor: 'border-primary/30' },
    parziale: { label: 'Parziale', color: 'text-warning', bg: 'bg-warning/10', borderColor: 'border-warning/30' },
    pagata: { label: 'Pagata', color: 'text-success', bg: 'bg-success/10', borderColor: 'border-success/30' },
  };

  // Generate available years
  const years = Array.from(new Set(invoices.map(inv => new Date(inv.invoiceDate).getFullYear()))).sort((a, b) => b - a);
  if (!years.includes(new Date().getFullYear())) {
    years.unshift(new Date().getFullYear());
  }

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        {/* Hero Header with Gradient Mesh */}
        <div className="gradient-mesh-bg p-6 rounded-2xl">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {isSecondary ? 'Entrate' : 'Fatture'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSecondary 
                  ? 'Visualizza i bonifici familiari ricevuti' 
                  : 'Gestisci tutte le fatture e monitora i pagamenti'
                }
              </p>
            </div>
            {!isSecondary && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBulkUpload(true)}
                  className="neo-glass border-border/50 hover:border-primary/50 transition-all"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importa
                </Button>
                <Link to="/new-invoice">
                  <Button className="gradient-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Secondary user: Show only family transfers */}
        {isSecondary ? (
          <div className="space-y-4">
            <div className="neo-glass p-3 rounded-xl inline-flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px] bg-background/50 border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FamilyTransfersList selectedYear={selectedYear} />
          </div>
        ) : (
          <>
            {/* Year Selector + Analytics */}
            <div className="space-y-4">
              <div className="neo-glass p-3 rounded-xl inline-flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-[120px] bg-background/50 border-border/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <InvoiceAnalytics invoices={invoices} year={selectedYear} />

              {/* Carryover Section - Invoices from previous years */}
              {(() => {
                const yearStart = startOfYear(new Date(selectedYear, 0, 1));
                const today = startOfDay(new Date());
                
                const carryoverInvoices = invoices.filter(inv => {
                  const invoiceDate = new Date(inv.invoiceDate);
                  const dueDate = new Date(inv.dueDate);
                  const isFromPreviousYear = isBefore(invoiceDate, yearStart);
                  const isDueInSelectedYear = !isBefore(dueDate, yearStart);
                  const hasRemainingAmount = inv.remainingAmount > 0;
                  return isFromPreviousYear && isDueInSelectedYear && hasRemainingAmount;
                });

                if (carryoverInvoices.length === 0) return null;

                const totalCarryover = carryoverInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

                return (
                  <div className="neo-glass border-warning/30 rounded-2xl overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-warning/20 bg-gradient-to-r from-warning/10 to-transparent">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                          <Package className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Da Incassare (Anni Precedenti)</h3>
                          <p className="text-sm text-muted-foreground">
                            Fatture emesse prima del {selectedYear} con scadenza nel {selectedYear}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 md:p-6 space-y-3">
                      {carryoverInvoices.map(inv => {
                        const dueDate = new Date(inv.dueDate);
                        const isOverdue = isBefore(dueDate, today) && inv.status !== 'pagata';
                        const isParziale = inv.paidAmount > 0 && inv.remainingAmount > 0;
                        
                        return (
                          <div 
                            key={inv.id}
                            className={cn(
                              "expense-glass-card group cursor-pointer",
                              isOverdue && "border-destructive/50"
                            )}
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {inv.invoiceNumber}
                                </Badge>
                                <span className="font-medium">{inv.projectName}</span>
                                {isOverdue && (
                                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Scaduta
                                  </Badge>
                                )}
                                {isParziale && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                    Parziale: {formatCurrency(inv.paidAmount)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  Scad. {format(dueDate, 'd MMM yyyy', { locale: it })}
                                </span>
                                <span className="font-bold text-lg">
                                  {formatCurrency(inv.remainingAmount)}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoice(inv);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="expense-summary-glass flex justify-between items-center mt-4">
                        <span className="font-semibold">Totale da incassare</span>
                        <span className="text-xl font-bold text-warning">{formatCurrency(totalCarryover)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Filters with Glass Style */}
            <div className="neo-glass p-4 rounded-xl space-y-3">
              {/* Search + Clear */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca fattura, cliente o progetto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 border-border/30 focus:border-primary/50"
                  />
                </div>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Pulisci ({activeFiltersCount})
                  </Button>
                )}
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={cn(
                    "w-[150px] bg-background/50 border-border/30",
                    statusFilter !== 'all' && "border-primary/50 bg-primary/5"
                  )}>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="bozza">Bozze</SelectItem>
                    <SelectItem value="inviata">Inviate</SelectItem>
                    <SelectItem value="parziale">Parziali</SelectItem>
                    <SelectItem value="pagata">Pagate</SelectItem>
                  </SelectContent>
                </Select>

                {/* Client Filter */}
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className={cn(
                    "w-[180px] bg-background/50 border-border/30",
                    clientFilter !== 'all' && "border-primary/50 bg-primary/5"
                  )}>
                    <User className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i clienti</SelectItem>
                    {uniqueClients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Project Filter */}
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className={cn(
                    "w-[180px] bg-background/50 border-border/30",
                    projectFilter !== 'all' && "border-primary/50 bg-primary/5"
                  )}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Progetto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i progetti</SelectItem>
                    {uniqueProjects.map(project => (
                      <SelectItem key={project} value={project}>{project}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Results Count */}
                <div className="ml-auto flex items-center text-sm text-muted-foreground">
                  <span>{sortedInvoices.length} fatture</span>
                </div>
              </div>
            </div>

            {/* Invoice List with Glass Cards */}
            <div className="expenses-section-glass">
              {sortedInvoices.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-primary/50" />
                  </div>
                  <p className="text-muted-foreground">Nessuna fattura trovata</p>
                  <Link to="/new-invoice">
                    <Button className="gradient-button mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Crea la prima fattura
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedInvoices.map((invoice, index) => {
                    const dueDate = new Date(invoice.dueDate);
                    const today = startOfDay(new Date());
                    const isOverdue = isBefore(dueDate, today) && invoice.status !== 'pagata';
                    const isDueSoon = !isOverdue && 
                      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7 && 
                      invoice.status !== 'pagata';

                    return (
                      <div 
                        key={invoice.id}
                        className={cn(
                          "expense-glass-card group cursor-pointer",
                          isOverdue && "border-destructive/50",
                          isDueSoon && "border-warning/50"
                        )}
                        onClick={() => setSelectedInvoice(invoice)}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          {/* Icon with Glow */}
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all",
                            "bg-gradient-to-br from-primary/20 to-accent/10",
                            "group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                          )}>
                            <ReceiptText className="h-5 w-5 text-primary expense-category-icon" />
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-primary">
                                {invoice.invoiceNumber}
                              </span>
                              <Badge className={cn(
                                "text-xs backdrop-blur-sm",
                                statusConfig[invoice.status].bg,
                                statusConfig[invoice.status].color,
                                statusConfig[invoice.status].borderColor,
                                "border"
                              )}>
                                {statusConfig[invoice.status].label}
                              </Badge>
                              {getVerificationBadge(invoice)}
                              {invoice.excludeFromBudget && (
                                <Badge variant="outline" className="text-xs opacity-60">
                                  No budget
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium mt-0.5 truncate">{invoice.clientName}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {invoice.projectName}
                            </p>
                          </div>

                          {/* Amount & Date */}
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold">{formatCurrency(invoice.totalAmount)}</p>
                            {invoice.paidAmount > 0 && (
                              <p className="text-xs text-success">
                                Pagato: {formatCurrency(invoice.paidAmount)}
                              </p>
                            )}
                            <p className={cn(
                              "text-xs mt-0.5",
                              isOverdue ? "text-destructive font-medium" : 
                              isDueSoon ? "text-warning" : "text-muted-foreground"
                            )}>
                              {isOverdue ? 'Scaduta ' : 'Scade '}
                              {format(dueDate, 'dd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invoice Detail Dialog - Modernized */}
            <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto neo-glass-static border-border/50">
                {selectedInvoice && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 flex-wrap">
                        <span className="text-xl">Fattura {selectedInvoice.invoiceNumber}</span>
                        <Badge className={cn(
                          "text-xs backdrop-blur-sm border",
                          statusConfig[selectedInvoice.status].bg,
                          statusConfig[selectedInvoice.status].color,
                          statusConfig[selectedInvoice.status].borderColor
                        )}>
                          {statusConfig[selectedInvoice.status].label}
                        </Badge>
                        {selectedInvoice.excludeFromBudget && (
                          <Badge variant="outline" className="text-xs">Esclusa budget</Badge>
                        )}
                      </DialogTitle>
                      <DialogDescription>
                        Creata il {format(new Date(selectedInvoice.createdAt), 'dd MMMM yyyy', { locale: it })}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 mt-4">
                      {/* Client & Project Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="expense-summary-glass">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                          <p className="font-semibold">{selectedInvoice.clientName}</p>
                          {selectedInvoice.clientAddress && (
                            <p className="text-sm text-muted-foreground mt-1">{selectedInvoice.clientAddress}</p>
                          )}
                          {selectedInvoice.clientVat && (
                            <p className="text-sm text-muted-foreground">P.IVA: {selectedInvoice.clientVat}</p>
                          )}
                        </div>
                        <div className="expense-summary-glass">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Progetto</p>
                          <p className="font-semibold">{selectedInvoice.projectName}</p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="expense-summary-glass">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Data Fattura</p>
                          <p className="font-semibold">
                            {format(new Date(selectedInvoice.invoiceDate), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                        <div className="expense-summary-glass">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Scadenza</p>
                          <p className="font-semibold">
                            {format(new Date(selectedInvoice.dueDate), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Voci</p>
                        <div className="neo-glass rounded-xl overflow-hidden divide-y divide-border/30">
                          {selectedInvoice.items.map((item, idx) => (
                            <div key={item.id} className={cn(
                              'flex justify-between items-center p-3',
                              item.amount < 0 && 'bg-destructive/10'
                            )}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground">{item.quantity}×</span>
                                <span className="font-medium">{item.description}</span>
                              </div>
                              <span className={cn(
                                "font-semibold",
                                item.amount < 0 && "text-destructive"
                              )}>
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Verification Alerts */}
                      {(selectedInvoice.status === 'pagata' || selectedInvoice.status === 'parziale') && 
                       !selectedInvoice.paymentVerified && (
                        <Alert className="bg-destructive/10 border-destructive/30 text-destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            Accredito non verificato! Carica lo screenshot del pagamento bancario per confermare la ricezione.
                          </AlertDescription>
                        </Alert>
                      )}

                      {selectedInvoice.paymentVerified && selectedInvoice.verificationMethod === 'manual' && (
                        <Alert className="bg-warning/10 border-warning/30 text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Pagamento confermato manualmente. Verifica OCR non effettuata.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Payment Verification Component */}
                      {(selectedInvoice.status === 'pagata' || selectedInvoice.status === 'parziale') && (
                        <PaymentVerification
                          invoice={selectedInvoice}
                          onVerified={(verified, screenshotUrl, method) => {
                            handlePaymentVerified(selectedInvoice.id, verified, screenshotUrl, method);
                            const updated = { 
                              ...selectedInvoice, 
                              paymentVerified: verified,
                              paymentScreenshotUrl: screenshotUrl,
                              verificationMethod: method
                            };
                            setSelectedInvoice(updated);
                          }}
                        />
                      )}

                      {/* Totals with Gradient */}
                      <div className="flex flex-wrap justify-end gap-3">
                        {selectedInvoice.paidAmount > 0 && (
                          <div className="expense-summary-glass text-center px-6">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Anticipo</p>
                            <p className="text-xl font-bold text-muted-foreground mt-1">
                              {formatCurrency(selectedInvoice.paidAmount)}
                            </p>
                          </div>
                        )}
                        <div className="bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/30 rounded-xl p-4 text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            {selectedInvoice.paidAmount > 0 ? 'Rimanente' : 'Totale'}
                          </p>
                          <p className="text-2xl font-bold text-primary mt-1">
                            {formatCurrency(selectedInvoice.remainingAmount ?? selectedInvoice.totalAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between pt-4 border-t border-border/30 gap-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="hover:shadow-[0_0_15px_hsl(var(--destructive)/0.4)]"
                          onClick={() => handleDelete(selectedInvoice.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </Button>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            className="neo-glass border-border/50 hover:border-primary/50"
                            onClick={async () => {
                              const companyInfo = settings.company_name ? {
                                name: settings.company_name,
                                address: settings.company_address,
                                country: settings.company_country,
                                vatNumber: settings.company_vat,
                                iban: settings.company_iban,
                                bic: settings.company_bic,
                                bankAddress: settings.company_bank_address,
                              } : undefined;
                              const blob = await generateInvoicePdf(selectedInvoice, companyInfo);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Fattura_${selectedInvoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
                              a.click();
                              URL.revokeObjectURL(url);
                              toast.success('PDF scaricato!');
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="neo-glass border-border/50 hover:border-accent/50"
                            onClick={() => handleSendEmail(selectedInvoice)}
                            disabled={sendingEmail}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {sendingEmail ? 'Invio...' : 'Email'}
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="neo-glass border-border/50 hover:border-primary/50"
                            onClick={() => {
                              setSelectedInvoice(null);
                              setEditingInvoice(selectedInvoice);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifica
                          </Button>
                          {selectedInvoice.status === 'bozza' && (
                            <Button 
                              variant="outline"
                              size="sm"
                              className="neo-glass border-border/50 hover:border-primary/50"
                              onClick={() => handleStatusChange(selectedInvoice.id, 'inviata')}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Inviata
                            </Button>
                          )}
                          {(selectedInvoice.status === 'inviata' || selectedInvoice.status === 'parziale') && (
                            <Button 
                              variant="outline"
                              size="sm"
                              className="neo-glass border-border/50 hover:border-warning/50"
                              onClick={() => handleStatusChange(selectedInvoice.id, 'parziale')}
                            >
                              Parziale
                            </Button>
                          )}
                          {selectedInvoice.status !== 'pagata' && (
                            <Button 
                              size="sm"
                              className="gradient-button"
                              onClick={() => handleStatusChange(selectedInvoice.id, 'pagata')}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Pagata
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <InvoiceEditDialog
              invoice={editingInvoice}
              open={!!editingInvoice}
              onOpenChange={(open) => !open && setEditingInvoice(null)}
              onSave={(id, updates) => {
                updateInvoice(id, updates);
                setEditingInvoice(null);
              }}
            />

            {/* Bulk Upload Dialog */}
            <BulkInvoiceUpload
              open={showBulkUpload}
              onOpenChange={setShowBulkUpload}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
