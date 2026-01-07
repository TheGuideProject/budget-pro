import { useMemo } from 'react';
import { startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, CreditCard, ReceiptText, ArrowDown, ArrowUp } from 'lucide-react';
import { Invoice } from '@/types';
import { cn } from '@/lib/utils';

interface InvoiceAnalyticsProps {
  invoices: Invoice[];
  year?: number;
}

export function InvoiceAnalytics({ invoices, year = new Date().getFullYear() }: InvoiceAnalyticsProps) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const analytics = useMemo(() => {
    // Filter invoices for the selected year
    const yearInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return isWithinInterval(invDate, { start: yearStart, end: yearEnd });
    });

    // Total invoiced (all invoices regardless of status)
    const totalInvoiced = yearInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Already received (paid invoices + advances on partial)
    const received = yearInvoices.reduce((sum, inv) => {
      if (inv.status === 'pagata') return sum + inv.totalAmount;
      if (inv.status === 'parziale') return sum + inv.paidAmount;
      return sum;
    }, 0);

    // Still pending (sent + partial remaining)
    const pending = yearInvoices.reduce((sum, inv) => {
      if (inv.status === 'inviata') return sum + inv.totalAmount;
      if (inv.status === 'parziale') return sum + inv.remainingAmount;
      return sum;
    }, 0);

    // Total advances received (paidAmount on non-fully-paid invoices)
    const advancesInvoices = yearInvoices.filter(inv => inv.status !== 'pagata' && inv.paidAmount > 0);
    const advances = advancesInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const advancesCount = advancesInvoices.length;

    // Credits/refunds (negative amounts in items or negative total)
    let creditsCount = 0;
    const credits = yearInvoices.reduce((sum, inv) => {
      // Check for negative items
      const negativeItems = inv.items.filter(item => item.amount < 0);
      const negativeItemsTotal = negativeItems.reduce((itemSum, item) => itemSum + Math.abs(item.amount), 0);
      
      if (negativeItems.length > 0) {
        creditsCount += negativeItems.length;
      }
      
      // Check for negative total invoice (credit note)
      if (inv.totalAmount < 0) {
        creditsCount++;
        return sum + Math.abs(inv.totalAmount);
      }
      
      return sum + negativeItemsTotal;
    }, 0);

    // Drafts not yet sent
    const draftsTotal = yearInvoices
      .filter(inv => inv.status === 'bozza')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Average invoice value
    const avgInvoice = yearInvoices.length > 0 ? totalInvoiced / yearInvoices.length : 0;

    // Invoices by status count
    const byStatus = {
      bozza: yearInvoices.filter(inv => inv.status === 'bozza').length,
      inviata: yearInvoices.filter(inv => inv.status === 'inviata').length,
      parziale: yearInvoices.filter(inv => inv.status === 'parziale').length,
      pagata: yearInvoices.filter(inv => inv.status === 'pagata').length,
    };

    return {
      totalInvoiced,
      received,
      pending,
      advances,
      advancesCount,
      credits,
      creditsCount,
      draftsTotal,
      avgInvoice,
      byStatus,
      count: yearInvoices.length,
    };
  }, [invoices, yearStart, yearEnd]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const statCards = [
    {
      label: 'Fatturato',
      value: analytics.totalInvoiced,
      subtext: `${analytics.count} fatture`,
      icon: TrendingUp,
      colorClass: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
      borderColor: 'border-primary/30',
    },
    {
      label: 'Incassato',
      value: analytics.received,
      subtext: `${analytics.byStatus.pagata} pagate`,
      icon: ArrowDown,
      colorClass: 'from-success/20 to-success/5',
      iconColor: 'text-success',
      valueColor: 'text-success',
      borderColor: 'border-success/30',
    },
    {
      label: 'Da Incassare',
      value: analytics.pending,
      subtext: `${analytics.byStatus.inviata + analytics.byStatus.parziale} in attesa`,
      icon: Clock,
      colorClass: 'from-warning/20 to-warning/5',
      iconColor: 'text-warning',
      valueColor: 'text-warning',
      borderColor: 'border-warning/30',
    },
    {
      label: 'Anticipi',
      value: analytics.advances,
      subtext: `${analytics.advancesCount} ${analytics.advancesCount === 1 ? 'anticipo' : 'anticipi'}`,
      icon: CreditCard,
      colorClass: analytics.advancesCount > 0 ? 'from-blue-500/20 to-blue-500/5' : 'from-muted/30 to-muted/10',
      iconColor: analytics.advancesCount > 0 ? 'text-blue-500' : 'text-muted-foreground',
      valueColor: analytics.advancesCount > 0 ? 'text-blue-500' : 'text-muted-foreground',
      borderColor: analytics.advancesCount > 0 ? 'border-blue-500/30' : 'border-border/30',
    },
    {
      label: 'Crediti',
      value: analytics.credits,
      subtext: `${analytics.creditsCount} ${analytics.creditsCount === 1 ? 'voce' : 'voci'}`,
      icon: ArrowUp,
      colorClass: analytics.credits > 0 ? 'from-destructive/20 to-destructive/5' : 'from-muted/30 to-muted/10',
      iconColor: analytics.credits > 0 ? 'text-destructive' : 'text-muted-foreground',
      valueColor: analytics.credits > 0 ? 'text-destructive' : 'text-muted-foreground',
      borderColor: analytics.credits > 0 ? 'border-destructive/30' : 'border-border/30',
      formatValue: (v: number) => v > 0 ? `-${formatCurrency(v)}` : formatCurrency(0),
    },
    {
      label: 'Bozze',
      value: analytics.draftsTotal,
      subtext: `${analytics.byStatus.bozza} da inviare`,
      icon: TrendingDown,
      colorClass: 'from-muted/30 to-muted/10',
      iconColor: 'text-muted-foreground',
      valueColor: 'text-muted-foreground',
      borderColor: 'border-border/30',
    },
  ];

  return (
    <div className="neo-glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-border/30 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <ReceiptText className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Riepilogo {year}</h3>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 md:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const displayValue = stat.formatValue 
              ? stat.formatValue(stat.value)
              : formatCurrency(stat.value);

            return (
              <div 
                key={stat.label}
                className={cn(
                  "relative group rounded-xl p-3 md:p-4 overflow-hidden transition-all duration-300",
                  "bg-gradient-to-br backdrop-blur-sm border",
                  stat.colorClass,
                  stat.borderColor,
                  "hover:scale-[1.02] hover:shadow-lg"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Glow effect on hover */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  "bg-gradient-to-br from-white/5 to-transparent"
                )} />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground mb-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", stat.iconColor)} />
                    <span className="truncate font-medium uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <p className={cn(
                    "text-sm md:text-lg font-bold truncate",
                    stat.valueColor
                  )}>
                    {displayValue}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5">
                    {stat.subtext}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
