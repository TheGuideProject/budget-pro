import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Invoice } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface InvoiceTableProps {
  invoices: Invoice[];
  limit?: number;
}

const statusConfig = {
  bozza: { label: 'Bozza', variant: 'secondary' as const },
  inviata: { label: 'Inviata', variant: 'default' as const },
  pagata: { label: 'Pagata', variant: 'outline' as const },
};

export function InvoiceTable({ invoices, limit }: InvoiceTableProps) {
  const displayInvoices = limit ? invoices.slice(0, limit) : invoices;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="neo-glass overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-muted/50 to-muted/30 hover:bg-muted/50 border-b border-border/50">
            <TableHead className="font-semibold text-foreground">N° Fattura</TableHead>
            <TableHead className="font-semibold text-foreground">Cliente</TableHead>
            <TableHead className="font-semibold text-foreground">Progetto</TableHead>
            <TableHead className="font-semibold text-foreground">Importo</TableHead>
            <TableHead className="font-semibold text-foreground">Scadenza</TableHead>
            <TableHead className="font-semibold text-foreground">Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayInvoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Nessuna fattura presente
              </TableCell>
            </TableRow>
          ) : (
            displayInvoices.map((invoice, index) => {
              const daysUntilDue = getDaysUntilDue(invoice.dueDate);
              const isOverdue = daysUntilDue < 0 && invoice.status !== 'pagata';
              const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7 && invoice.status !== 'pagata';

              return (
                <TableRow 
                  key={invoice.id} 
                  className={cn(
                    'transition-all duration-200',
                    'hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent',
                    'hover:shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.05)]',
                    'border-b border-border/30'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-mono font-medium text-primary">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="font-medium">{invoice.clientName}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {invoice.projectName}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {formatCurrency(invoice.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={cn(
                        'font-medium',
                        isOverdue && 'text-destructive',
                        isDueSoon && 'text-warning'
                      )}>
                        {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: it })}
                      </span>
                      {invoice.status !== 'pagata' && (
                        <span className={cn(
                          'text-xs',
                          isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : 'text-muted-foreground'
                        )}>
                          {isOverdue ? `${Math.abs(daysUntilDue)} giorni fa` : `tra ${daysUntilDue} giorni`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        'transition-all',
                        invoice.status === 'pagata' && 'bg-success/10 text-success border-success/30 hover:bg-success/20',
                        invoice.status === 'inviata' && 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
                        invoice.status === 'bozza' && 'bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {statusConfig[invoice.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
