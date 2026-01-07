import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Sparkles, AlertTriangle, CheckCircle, TrendingUp, Calendar, Target, 
  Loader2, RefreshCw, Clock, Bell, Briefcase, Plus, CalendarPlus, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WorkPlanMonth, FinancialPlanSummary, Invoice, AICalendarEvent } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useAuth } from '@/contexts/AuthContext';

interface AIWorkPlanAnalyzerProps {
  workPlan: WorkPlanMonth[];
  summary: FinancialPlanSummary;
  historicalSummary: {
    totalIncome: number;
    totalWorkDays: number;
    averageWorkDaysPerMonth: number;
    referenceYear: number;
  };
  pendingInvoices: Invoice[];
  settings: {
    dailyRate: number;
    estimatedFixed: number;
    estimatedVariable: number;
    estimatedBills: number;
    paymentDelayDays?: number;
  };
  includeDrafts?: boolean;
}

interface MonthlyPlan {
  month: string;
  status: 'ok' | 'warning' | 'critical';
  suggestion: string;
  actions: string[];
  target: string;
  priorityLevel: number;
}

interface AIWorkPlanResponse {
  monthlyPlans: MonthlyPlan[];
  annualSummary: {
    criticalMonths: string[];
    calmMonths: string[];
    recommendedBuffer: number;
    totalWorkDays: number;
    finalAdvice: string;
  };
}

export function AIWorkPlanAnalyzer({
  workPlan,
  summary,
  historicalSummary,
  pendingInvoices,
  settings,
  includeDrafts = false,
}: AIWorkPlanAnalyzerProps) {
  const { user } = useAuth();
  const { createEvent } = useCalendarEvents();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'plan' | 'calendar'>('plan');
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<AIWorkPlanResponse | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<AICalendarEvent[]>([]);
  const [addingEventId, setAddingEventId] = useState<string | null>(null);
  const [eventsAddedCount, setEventsAddedCount] = useState(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const generateAIPlan = async () => {
    setIsLoading(true);
    try {
      const workPlanData = workPlan.map(m => ({
        month: format(m.month, 'MMMM yyyy', { locale: it }),
        monthKey: m.monthKey,
        expectedIncome: m.expectedIncome,
        totalExpenses: m.totalExpenses,
        balance: m.balance,
        carryover: m.carryover || 0,
        workDaysNeeded: m.workDaysNeeded,
        workDaysExtra: m.workDaysExtra,
        historicalWorkDays: m.historicalWorkDays,
        historicalIncome: m.historicalIncome,
        status: m.status,
        deficitAmount: m.deficitAmount,
        surplusAmount: m.surplusAmount,
      }));

      const pendingData = pendingInvoices
        .filter(inv => inv.status !== 'pagata' && (includeDrafts || inv.status !== 'bozza'))
        .map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.remainingAmount || inv.totalAmount,
          client: inv.clientName,
          dueDate: format(new Date(inv.dueDate), 'yyyy-MM-dd'),
          isDraft: inv.status === 'bozza',
        }));

      const { data, error } = await supabase.functions.invoke('analyze-work-plan', {
        body: {
          workPlan: workPlanData,
          historicalSummary,
          pendingInvoices: pendingData,
          settings: {
            dailyRate: settings.dailyRate,
            estimatedMonthlyCosts: settings.estimatedFixed + settings.estimatedVariable + settings.estimatedBills,
          },
          summary: {
            averageWorkDays: summary.averageWorkDays,
            criticalMonths: summary.criticalMonths,
            annualDeficit: summary.annualDeficit,
            annualSurplus: summary.annualSurplus,
          },
        },
      });

      if (error) throw error;
      
      setAiPlan(data);
      toast.success('Piano AI generato con successo!');
    } catch (error) {
      console.error('Error generating AI plan:', error);
      toast.error('Errore nella generazione del piano AI');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCalendarEvents = async () => {
    setIsCalendarLoading(true);
    try {
      const workPlanData = workPlan.map(m => ({
        month: format(m.month, 'MMMM yyyy', { locale: it }),
        monthKey: m.monthKey,
        expectedIncome: m.expectedIncome,
        totalExpenses: m.totalExpenses,
        balance: m.balance,
        carryover: m.carryover || 0,
        workDaysNeeded: m.workDaysNeeded,
        workDaysExtra: m.workDaysExtra,
        status: m.status,
      }));

      const pendingData = pendingInvoices
        .filter(inv => inv.status !== 'pagata' && (includeDrafts || inv.status !== 'bozza'))
        .map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.remainingAmount || inv.totalAmount,
          client: inv.clientName,
          dueDate: format(new Date(inv.dueDate), 'yyyy-MM-dd'),
          isDraft: inv.status === 'bozza',
        }));

      const { data, error } = await supabase.functions.invoke('generate-work-calendar', {
        body: {
          workPlan: workPlanData,
          pendingInvoices: pendingData,
          settings: {
            dailyRate: settings.dailyRate,
            paymentDelayDays: settings.paymentDelayDays || 60,
          },
        },
      });

      if (error) throw error;
      
      setCalendarEvents(data.events || []);
      toast.success(`${data.events?.length || 0} eventi generati!`);
    } catch (error) {
      console.error('Error generating calendar:', error);
      toast.error('Errore nella generazione del calendario');
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const addEventToCalendar = async (event: AICalendarEvent) => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setAddingEventId(event.id);
    try {
      await createEvent({
        title: event.title,
        eventDate: new Date(event.date),
        eventType: event.eventType === 'work_day' ? 'appuntamento' : 
                   event.eventType === 'payment_due' ? 'scadenza' : 'promemoria',
        description: event.description,
        color: event.priority === 'high' ? '#ef4444' : 
               event.priority === 'medium' ? '#f59e0b' : '#22c55e',
      });
      
      // Remove from list after adding and track count
      setCalendarEvents(prev => prev.filter(e => e.id !== event.id));
      setEventsAddedCount(prev => prev + 1);
      toast.success('Evento aggiunto al calendario!', {
        action: {
          label: 'Vai al Calendario',
          onClick: () => navigate('/calendar'),
        },
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Errore nell\'aggiunta dell\'evento');
    } finally {
      setAddingEventId(null);
    }
  };

  const addAllEventsToCalendar = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setIsCalendarLoading(true);
    let added = 0;
    
    try {
      for (const event of calendarEvents) {
        await createEvent({
          title: event.title,
          eventDate: new Date(event.date),
          eventType: event.eventType === 'work_day' ? 'appuntamento' : 
                     event.eventType === 'payment_due' ? 'scadenza' : 'promemoria',
          description: event.description,
          color: event.priority === 'high' ? '#ef4444' : 
                 event.priority === 'medium' ? '#f59e0b' : '#22c55e',
        });
        added++;
      }
      
      setCalendarEvents([]);
      setEventsAddedCount(prev => prev + added);
      toast.success(`${added} eventi aggiunti al calendario!`, {
        action: {
          label: 'Vai al Calendario',
          onClick: () => navigate('/calendar'),
        },
        duration: 5000,
      });
    } catch (error) {
      console.error('Error adding events:', error);
      toast.error(`Errore: ${added} eventi aggiunti su ${calendarEvents.length}`);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <TrendingUp className="h-5 w-5 text-amber-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive">CRITICO</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/30">ATTENZIONE</Badge>;
      default:
        return <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/30">OK</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'work_day':
        return <Briefcase className="h-4 w-4 text-primary" />;
      case 'payment_reminder':
        return <Bell className="h-4 w-4 text-amber-500" />;
      case 'payment_due':
        return <Clock className="h-4 w-4 text-destructive" />;
      case 'invoice_send':
        return <Target className="h-4 w-4 text-green-600" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'work_day':
        return 'Lavoro';
      case 'payment_reminder':
        return 'Promemoria';
      case 'payment_due':
        return 'Scadenza';
      case 'invoice_send':
        return 'Fattura';
      default:
        return 'Evento';
    }
  };

  // Calculate current situation
  const confirmedPending = pendingInvoices
    .filter(inv => inv.status !== 'pagata' && inv.status !== 'bozza')
    .reduce((sum, inv) => sum + (inv.remainingAmount || inv.totalAmount), 0);

  const draftPending = includeDrafts 
    ? pendingInvoices
        .filter(inv => inv.status === 'bozza')
        .reduce((sum, inv) => sum + (inv.remainingAmount || inv.totalAmount), 0)
    : 0;

  const totalPending = confirmedPending + draftPending;

  const avgMonthlyExpenses = workPlan.length > 0
    ? workPlan.reduce((sum, m) => sum + m.totalExpenses, 0) / workPlan.length
    : 0;

  const avgWorkDaysNeeded = summary.averageWorkDays;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Piano Lavoro AI</CardTitle>
              <CardDescription>
                Analisi personalizzata con suggerimenti operativi e calendario
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tabs for Plan and Calendar */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'plan' | 'calendar')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plan" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Piano Mese per Mese
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendario AI
            </TabsTrigger>
          </TabsList>

          {/* Plan Tab */}
          <TabsContent value="plan" className="space-y-6 mt-6">
            {/* Current Situation Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-background border text-center">
                <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Da Incassare</p>
                <p className={`text-xl font-bold ${draftPending > 0 ? 'text-amber-500' : ''}`}>
                  {formatCurrency(totalPending)}
                </p>
                {draftPending > 0 && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    (incl. {formatCurrency(draftPending)} bozze)
                  </span>
                )}
              </div>
              <div className="p-4 rounded-lg bg-background border text-center group relative">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-red-500" />
                <p className="text-sm text-muted-foreground">Spese/Mese</p>
                <p className="text-xl font-bold">{formatCurrency(avgMonthlyExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  (Fisse: {formatCurrency(settings.estimatedFixed)} + Var: {formatCurrency(settings.estimatedVariable)} + Boll: {formatCurrency(settings.estimatedBills)})
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background border text-center">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">GG Necessari/Mese</p>
                <p className="text-xl font-bold">{avgWorkDaysNeeded.toFixed(1)}</p>
              </div>
              <div className="p-4 rounded-lg bg-background border text-center">
                <AlertTriangle className={`h-5 w-5 mx-auto mb-2 ${summary.annualDeficit > 0 ? 'text-destructive' : 'text-green-600'}`} />
                <p className="text-sm text-muted-foreground">Deficit Annuale</p>
                <p className={`text-xl font-bold ${summary.annualDeficit > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {summary.annualDeficit > 0 ? formatCurrency(summary.annualDeficit) : 'Nessuno'}
                </p>
              </div>
            </div>

            {/* Generate Plan Button */}
            <Button 
              onClick={generateAIPlan} 
              disabled={isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisi in corso...
                </>
              ) : aiPlan ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Rigenera Piano
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Genera Piano Personalizzato
                </>
              )}
            </Button>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {/* AI Generated Plan */}
            {aiPlan && !isLoading && (
              <>
                {/* Annual Summary */}
                <Card className="bg-muted/50 border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div className="space-y-3 w-full">
                        <h4 className="font-semibold">Riepilogo Annuale AI</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Mesi critici:</span>
                            <p className="font-medium text-destructive">
                              {aiPlan.annualSummary.criticalMonths.length > 0 
                                ? aiPlan.annualSummary.criticalMonths.join(', ') 
                                : 'Nessuno'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mesi tranquilli:</span>
                            <p className="font-medium text-green-600">
                              {aiPlan.annualSummary.calmMonths.length > 0 
                                ? aiPlan.annualSummary.calmMonths.join(', ') 
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Buffer consigliato:</span>
                            <p className="font-medium">{formatCurrency(aiPlan.annualSummary.recommendedBuffer)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">GG lavoro totali:</span>
                            <p className="font-medium">{aiPlan.annualSummary.totalWorkDays}/anno</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-sm italic">"{ aiPlan.annualSummary.finalAdvice }"</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Plans */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Piano Mese per Mese
                  </h4>
                  <Accordion type="single" collapsible className="space-y-2">
                    {aiPlan.monthlyPlans.map((plan, index) => (
                      <AccordionItem 
                        key={index} 
                        value={`month-${index}`}
                        className={`border rounded-lg px-4 ${
                          plan.status === 'critical' 
                            ? 'border-destructive/50 bg-destructive/5' 
                            : plan.status === 'warning'
                            ? 'border-amber-500/50 bg-amber-500/5'
                            : 'border-green-500/30 bg-green-500/5'
                        }`}
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 w-full">
                            {getStatusIcon(plan.status)}
                            <span className="font-semibold flex-1 text-left">{plan.month}</span>
                            {getStatusBadge(plan.status)}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-4 pt-2">
                            <div className="flex gap-3">
                              <div className="p-1.5 rounded bg-primary/10 h-fit">
                                <Sparkles className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Suggerimento</p>
                                <p className="text-sm text-muted-foreground">{plan.suggestion}</p>
                              </div>
                            </div>

                            {plan.actions.length > 0 && (
                              <div className="flex gap-3">
                                <div className="p-1.5 rounded bg-green-500/10 h-fit">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Azioni Consigliate</p>
                                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-1">
                                    {plan.actions.map((action, i) => (
                                      <li key={i}>{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-3">
                              <div className="p-1.5 rounded bg-amber-500/10 h-fit">
                                <Target className="h-4 w-4 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Obiettivo</p>
                                <p className="text-sm text-muted-foreground">{plan.target}</p>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </>
            )}

            {/* Empty State */}
            {!aiPlan && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Clicca "Genera Piano Personalizzato" per ricevere un'analisi AI</p>
                <p className="text-sm mt-1">del tuo piano lavoro con suggerimenti mese per mese.</p>
              </div>
            )}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6 mt-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Genera eventi calendario basati sul tuo piano lavoro: giorni di lavoro consigliati, 
                promemoria pagamenti e scadenze fatture.
              </p>

              <Button 
                onClick={generateCalendarEvents} 
                disabled={isCalendarLoading}
                className="w-full gap-2"
                size="lg"
              >
                {isCalendarLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generazione in corso...
                  </>
                ) : calendarEvents.length > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Rigenera Calendario
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4" />
                    Genera Calendario AI
                  </>
                )}
              </Button>

              {/* Loading */}
              {isCalendarLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}

              {/* Generated Events */}
              {calendarEvents.length > 0 && !isCalendarLoading && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Badge variant="secondary">
                      {calendarEvents.length} eventi generati
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={addAllEventsToCalendar}
                      disabled={isCalendarLoading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi tutti
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] rounded-lg border">
                    <div className="p-2 space-y-2">
                      {calendarEvents.map((event) => (
                        <div 
                          key={event.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            event.priority === 'high' 
                              ? 'border-destructive/30 bg-destructive/5' 
                              : event.priority === 'medium'
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-border bg-muted/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded bg-background border">
                              {getEventIcon(event.eventType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{event.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{event.date}</span>
                                <Badge variant="outline" className="text-xs">
                                  {getEventTypeLabel(event.eventType)}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    event.priority === 'high' ? 'border-destructive text-destructive' :
                                    event.priority === 'medium' ? 'border-amber-500 text-amber-600' :
                                    'border-green-500 text-green-600'
                                  }`}
                                >
                                  {event.priority}
                                </Badge>
                              </div>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addEventToCalendar(event)}
                              disabled={addingEventId === event.id}
                            >
                              {addingEventId === event.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}

              {/* Empty State - with success state if events were added */}
              {calendarEvents.length === 0 && !isCalendarLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  {eventsAddedCount > 0 ? (
                    <>
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-green-600 font-medium">{eventsAddedCount} eventi aggiunti al calendario!</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 gap-2"
                        onClick={() => navigate('/calendar')}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Vai al Calendario
                      </Button>
                    </>
                  ) : (
                    <>
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Clicca "Genera Calendario AI" per creare eventi</p>
                      <p className="text-sm mt-1">basati sul tuo piano lavoro e scadenze fatture.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
