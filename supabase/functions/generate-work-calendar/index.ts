import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Authentication helper
async function authenticateRequest(req: Request): Promise<{ user: any; error: Response | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Token non valido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user, error: null };
}

interface WorkPlanMonth {
  monthKey: string;
  month: string;
  expectedIncome: number;
  totalExpenses: number;
  balance: number;
  carryover: number;
  workDaysNeeded: number;
  workDaysExtra: number;
  status: string;
}

interface PendingInvoice {
  invoiceNumber: string;
  amount: number;
  client: string;
  dueDate: string;
}

interface RequestBody {
  workPlan: WorkPlanMonth[];
  pendingInvoices: PendingInvoice[];
  settings: {
    dailyRate: number;
    paymentDelayDays: number;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  eventType: 'work_day' | 'invoice_send' | 'payment_reminder' | 'payment_due';
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedInvoiceId?: string;
  monthKey: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { workPlan, pendingInvoices, settings }: RequestBody = await req.json();
    
    console.log('Generating work calendar for', workPlan.length, 'months');
    console.log('Pending invoices:', pendingInvoices.length);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the prompt for AI
    const workPlanSummary = workPlan.slice(0, 6).map(m => 
      `${m.month}: Incassi €${m.expectedIncome.toFixed(0)}, Spese €${m.totalExpenses.toFixed(0)}, ` +
      `Saldo €${m.balance.toFixed(0)}, GG necessari ${m.workDaysNeeded}, Status: ${m.status}`
    ).join('\n');

    const invoicesSummary = pendingInvoices.slice(0, 10).map(inv =>
      `- Fattura ${inv.invoiceNumber}: €${inv.amount.toFixed(0)} da ${inv.client}, scadenza ${inv.dueDate}`
    ).join('\n');

    const prompt = `Sei un assistente finanziario per freelancer. Genera un piano calendario operativo per i prossimi 6 mesi.

SITUAZIONE ATTUALE:
- Tariffa giornaliera: €${settings.dailyRate}
- Ritardo pagamento medio: ${settings.paymentDelayDays} giorni

PIANO LAVORO (prossimi 6 mesi):
${workPlanSummary}

FATTURE DA INCASSARE:
${invoicesSummary || 'Nessuna fattura in sospeso'}

GENERA un JSON con eventi calendario pratici:
1. "work_day" - Giorni di lavoro consigliati per ogni mese (distribuiti nella prima metà del mese per incassare in tempo)
2. "payment_reminder" - Reminder 7 giorni prima delle scadenze fatture
3. "payment_due" - Scadenze fatture importanti
4. "invoice_send" - Quando inviare nuove fatture per garantire cash flow

Per ogni evento includi:
- id: stringa unica
- title: titolo breve
- date: data in formato YYYY-MM-DD
- eventType: uno tra work_day, invoice_send, payment_reminder, payment_due
- description: descrizione dettagliata
- priority: high/medium/low
- monthKey: chiave mese (YYYY-MM)

Rispondi SOLO con un JSON valido nel formato:
{
  "events": [...]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Sei un esperto di pianificazione finanziaria per freelancer. Rispondi sempre in italiano con JSON valido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('Rate limited, using fallback');
        return new Response(JSON.stringify({ events: generateFallbackEvents(workPlan, pendingInvoices, settings) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.log('Payment required, using fallback');
        return new Response(JSON.stringify({ events: generateFallbackEvents(workPlan, pendingInvoices, settings) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing...');

    // Parse the JSON response
    let events: CalendarEvent[] = [];
    try {
      // Clean up markdown if present
      let jsonStr = content;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      events = parsed.events || [];
      console.log('Parsed', events.length, 'events from AI');
    } catch (parseError) {
      console.error('Failed to parse AI response, using fallback:', parseError);
      events = generateFallbackEvents(workPlan, pendingInvoices, settings);
    }

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-work-calendar:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      events: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackEvents(
  workPlan: WorkPlanMonth[], 
  pendingInvoices: PendingInvoice[],
  settings: { dailyRate: number; paymentDelayDays: number }
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  let eventId = 1;

  // Generate work day suggestions for each month
  workPlan.slice(0, 6).forEach(month => {
    if (month.workDaysNeeded > 0) {
      // Suggest work days in first half of month
      const [year, monthNum] = month.monthKey.split('-').map(Number);
      
      // Add work block suggestion
      events.push({
        id: `event-${eventId++}`,
        title: `Lavora ${month.workDaysNeeded} giorni`,
        date: `${month.monthKey}-05`,
        eventType: 'work_day',
        description: `Pianifica ${month.workDaysNeeded} giorni di lavoro per coprire le spese di ${month.month}. ${month.workDaysExtra > 0 ? `+${month.workDaysExtra} giorni extra per recuperare deficit.` : ''}`,
        priority: month.status === 'deficit' ? 'high' : 'medium',
        monthKey: month.monthKey,
      });

      // If deficit, add urgent work reminder
      if (month.status === 'deficit') {
        events.push({
          id: `event-${eventId++}`,
          title: `⚠️ Mese critico: lavora di più`,
          date: `${month.monthKey}-01`,
          eventType: 'work_day',
          description: `${month.month} è a rischio deficit. Considera di anticipare lavori o ridurre spese.`,
          priority: 'high',
          monthKey: month.monthKey,
        });
      }
    }
  });

  // Add payment reminders for pending invoices
  pendingInvoices.forEach(inv => {
    const dueDate = new Date(inv.dueDate);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 7);
    
    // Payment reminder 7 days before
    if (reminderDate > new Date()) {
      events.push({
        id: `event-${eventId++}`,
        title: `Sollecita ${inv.client}`,
        date: reminderDate.toISOString().split('T')[0],
        eventType: 'payment_reminder',
        description: `Fattura ${inv.invoiceNumber}: €${inv.amount.toFixed(0)} in scadenza tra 7 giorni`,
        priority: 'medium',
        monthKey: reminderDate.toISOString().substring(0, 7),
      });
    }

    // Due date reminder
    events.push({
      id: `event-${eventId++}`,
      title: `Scadenza ${inv.invoiceNumber}`,
      date: inv.dueDate,
      eventType: 'payment_due',
      description: `€${inv.amount.toFixed(0)} da ${inv.client}`,
      priority: 'high',
      relatedInvoiceId: inv.invoiceNumber,
      monthKey: inv.dueDate.substring(0, 7),
    });
  });

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
