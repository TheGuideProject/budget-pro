import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { Expense } from '@/types';
import { groupFamilyTransfers, TransferSummary } from '@/utils/fixedExpenseClassification';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FamilyTransfersListProps {
  expenses: Expense[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function FamilyTransfersList({ expenses }: FamilyTransfersListProps) {
  const transferSummaries = useMemo(() => groupFamilyTransfers(expenses), [expenses]);
  
  const totalMonthly = transferSummaries.reduce((sum, t) => sum + t.monthlyAmount, 0);
  const totalTransferred = transferSummaries.reduce((sum, t) => sum + t.totalTransferred, 0);

  if (transferSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nessun trasferimento familiare trovato
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              I trasferimenti vengono identificati automaticamente dalla descrizione (es. "Trasferimento Mamy", "Bonifico moglie")
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Totale Trasferimenti Mensili</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthly)}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Destinatari</p>
                <p className="text-2xl font-bold">{transferSummaries.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Totale trasferito</p>
                <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(totalTransferred)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers by Recipient */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trasferimenti Familiari
          </CardTitle>
          <CardDescription>
            Bonifici e trasferimenti verso familiari
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {transferSummaries.map((transfer, index) => (
              <AccordionItem 
                key={index} 
                value={`transfer-${index}`}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-chart-2/10">
                        <Users className="h-4 w-4 text-chart-2" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{transfer.recipient}</p>
                        <p className="text-sm text-muted-foreground">
                          {transfer.transfersCount} trasferimenti
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(transfer.monthlyAmount)}</p>
                      <p className="text-xs text-muted-foreground">/mese (media)</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-4">
                    {/* Transfer Stats */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-xs text-muted-foreground">Numero trasferimenti</p>
                        <p className="font-medium">{transfer.transfersCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Totale trasferito</p>
                        <p className="font-medium text-primary">{formatCurrency(transfer.totalTransferred)}</p>
                      </div>
                    </div>

                    {/* Transfer History */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Storico Trasferimenti
                      </p>
                      {transfer.transfers.slice(0, 12).map((t, tIndex) => (
                        <div 
                          key={tIndex}
                          className="flex items-center justify-between py-2 px-3 rounded bg-background border"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(t.date), 'd MMMM yyyy', { locale: it })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline">{formatCurrency(t.amount)}</Badge>
                          </div>
                        </div>
                      ))}
                      {transfer.transfers.length > 12 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          ... e altri {transfer.transfers.length - 12} trasferimenti precedenti
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
