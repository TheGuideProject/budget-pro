import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Expense } from '@/types';
import { groupLoanPayments, LoanSummary } from '@/utils/fixedExpenseClassification';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface LoanPaymentsListProps {
  expenses: Expense[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function LoanPaymentsList({ expenses }: LoanPaymentsListProps) {
  const loanSummaries = useMemo(() => groupLoanPayments(expenses), [expenses]);
  
  const totalPaid = loanSummaries.reduce((sum, l) => sum + l.totalPaid, 0);
  const totalRemaining = loanSummaries.reduce((sum, l) => sum + l.totalRemaining, 0);
  const totalMonthly = loanSummaries.reduce((sum, l) => sum + l.monthlyAmount, 0);
  const totalPaidCount = loanSummaries.reduce((sum, l) => sum + l.paidCount, 0);
  const totalRemainingCount = loanSummaries.reduce((sum, l) => sum + l.remainingCount, 0);
  const overallPercent = (totalPaid + totalRemaining) > 0 
    ? Math.round((totalPaid / (totalPaid + totalRemaining)) * 100) 
    : 0;

  if (loanSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nessuna rata di prestito o mutuo trovata
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Le rate vengono identificate automaticamente dalla descrizione (es. "Rata YOUNITED", "Mutuo casa")
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
          <div className="space-y-4">
            {/* Row 1: Main stats */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Rata Mensile Totale</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthly)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Prestiti attivi</p>
                <p className="text-2xl font-bold">{loanSummaries.length}</p>
              </div>
            </div>

            {/* Row 2: Versato vs Da Versare */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Versato
                </div>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                <p className="text-xs text-muted-foreground">{totalPaidCount} rate</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Da Versare
                </div>
                <p className="text-xl font-bold text-orange-500">{formatCurrency(totalRemaining)}</p>
                <p className="text-xs text-muted-foreground">{totalRemainingCount} rate</p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-sm text-muted-foreground mb-1">Completamento</p>
                <div className="flex items-center gap-3">
                  <Progress value={overallPercent} className="flex-1 h-3" />
                  <span className="text-lg font-bold">{overallPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans Accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Rate & Prestiti
          </CardTitle>
          <CardDescription>
            Clicca su un prestito per vedere lo storico delle rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {loanSummaries.map((loan, index) => (
              <AccordionItem 
                key={index} 
                value={`loan-${index}`}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-chart-1/10">
                        <CreditCard className="h-4 w-4 text-chart-1" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{loan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {loan.paidCount}/{loan.totalCount} rate pagate
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="hidden sm:block">
                        <Progress value={loan.completionPercent} className="w-20 h-2" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{formatCurrency(loan.monthlyAmount)}</p>
                        <p className="text-xs text-muted-foreground">/mese</p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-4">
                    {/* Loan Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          Versato
                        </div>
                        <p className="font-medium text-green-600">{formatCurrency(loan.totalPaid)}</p>
                        <p className="text-xs text-muted-foreground">{loan.paidCount} rate</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 text-orange-500" />
                          Da versare
                        </div>
                        <p className="font-medium text-orange-500">{formatCurrency(loan.totalRemaining)}</p>
                        <p className="text-xs text-muted-foreground">{loan.remainingCount} rate</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prima rata</p>
                        <p className="font-medium">
                          {format(loan.firstPayment, 'd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ultima rata</p>
                        <p className="font-medium">
                          {format(loan.lastPayment, 'd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                      <Progress value={loan.completionPercent} className="flex-1 h-3" />
                      <span className="font-bold text-sm">{loan.completionPercent}%</span>
                    </div>

                    {/* Payment History - Paid */}
                    {loan.paidPayments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Rate Pagate ({loan.paidPayments.length})
                        </p>
                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                          {loan.paidPayments.slice().reverse().slice(0, 6).map((payment, pIndex) => (
                            <div 
                              key={pIndex}
                              className="flex items-center justify-between py-2 px-3 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                <span className="text-sm">
                                  {format(new Date(payment.date), 'd MMMM yyyy', { locale: it })}
                                </span>
                              </div>
                              <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                {formatCurrency(payment.amount)}
                              </Badge>
                            </div>
                          ))}
                          {loan.paidPayments.length > 6 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                              ... e altre {loan.paidPayments.length - 6} rate pagate
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment History - Future */}
                    {loan.futurePayments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-orange-500 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Rate Programmate ({loan.futurePayments.length})
                        </p>
                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                          {loan.futurePayments.slice(0, 6).map((payment, pIndex) => (
                            <div 
                              key={pIndex}
                              className="flex items-center justify-between py-2 px-3 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-orange-500" />
                                <span className="text-sm">
                                  {format(new Date(payment.date), 'd MMMM yyyy', { locale: it })}
                                </span>
                              </div>
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                {formatCurrency(payment.amount)}
                              </Badge>
                            </div>
                          ))}
                          {loan.futurePayments.length > 6 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                              ... e altre {loan.futurePayments.length - 6} rate in programma
                            </p>
                          )}
                        </div>
                      </div>
                    )}
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
