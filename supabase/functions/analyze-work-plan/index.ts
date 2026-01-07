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

interface MonthData {
  month: string;
  monthKey: string;
  expectedIncome: number;
  totalExpenses: number;
  balance: number;
  workDaysNeeded: number;
  historicalWorkDays: number;
  historicalIncome: number;
  status: string;
  deficitAmount: number;
  surplusAmount: number;
}

interface PendingInvoice {
  invoiceNumber: string;
  amount: number;
  client: string;
  dueDate: string;
}

interface RequestBody {
  workPlan: MonthData[];
  historicalSummary: {
    totalIncome: number;
    totalWorkDays: number;
    averageWorkDaysPerMonth: number;
    referenceYear: number;
  };
  pendingInvoices: PendingInvoice[];
  settings: {
    dailyRate: number;
    estimatedMonthlyCosts: number;
  };
  summary: {
    averageWorkDays: number;
    criticalMonths: string[];
    annualDeficit: number;
    annualSurplus: number;
  };
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
    const body: RequestBody = await req.json();
    const { workPlan, historicalSummary, pendingInvoices, settings, summary } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const criticalMonthsList = workPlan
      .filter(m => m.status === 'deficit')
      .map(m => m.month);
    const surplusMonthsList = workPlan
      .filter(m => m.status === 'surplus')
      .map(m => m.month);

    const prompt = `Sei un consulente finanziario esperto per freelancer e liberi professionisti italiani. Analizza questi dati finanziari e crea un piano operativo mese per mese.

SITUAZIONE ATTUALE:
- Fatture da incassare: €${totalPending.toFixed(0)}
- Tariffa giornaliera: €${settings.dailyRate}/giorno
- Costi mensili stimati: €${settings.estimatedMonthlyCosts}
- Giorni lavoro necessari/mese: ${summary.averageWorkDays.toFixed(1)}
- Deficit annuale previsto: €${summary.annualDeficit.toFixed(0)}
- Surplus annuale previsto: €${summary.annualSurplus.toFixed(0)}

STORICO ANNO PRECEDENTE (${historicalSummary.referenceYear || 'ultimo anno'}):
- Giorni lavorati totali: ${historicalSummary.totalWorkDays}
- Entrate totali: €${historicalSummary.totalIncome.toFixed(0)}
- Media mensile: ${historicalSummary.averageWorkDaysPerMonth} giorni

FATTURE IN SOSPESO:
${pendingInvoices.length > 0 
  ? pendingInvoices.map(inv => `- ${inv.invoiceNumber}: €${inv.amount} da ${inv.client} (scadenza: ${inv.dueDate})`).join('\n')
  : '- Nessuna fattura in sospeso'}

PIANO MENSILE 12 MESI:
${workPlan.map(m => 
  `${m.month}: Entrate previste €${m.expectedIncome.toFixed(0)}, Spese €${m.totalExpenses.toFixed(0)}, ` +
  `Bilancio €${m.balance.toFixed(0)}, Status: ${m.status}, ` +
  `GG necessari: ${m.workDaysNeeded}, GG anno scorso: ${m.historicalWorkDays}`
).join('\n')}

MESI CRITICI: ${criticalMonthsList.join(', ') || 'Nessuno'}
MESI IN SURPLUS: ${surplusMonthsList.join(', ') || 'Nessuno'}

Genera un piano operativo in formato JSON con questa struttura esatta:
{
  "monthlyPlans": [
    {
      "month": "nome mese in italiano",
      "status": "ok" | "warning" | "critical",
      "suggestion": "suggerimento principale per questo mese (max 2 frasi)",
      "actions": ["azione concreta 1", "azione concreta 2"],
      "target": "obiettivo misurabile per questo mese",
      "priorityLevel": 1-5
    }
  ],
  "annualSummary": {
    "criticalMonths": ["mese1", "mese2"],
    "calmMonths": ["mese1", "mese2"],
    "recommendedBuffer": numero in euro,
    "totalWorkDays": numero giorni lavoro consigliati anno,
    "finalAdvice": "consiglio finale personalizzato basato sulla situazione (max 3 frasi)"
  }
}

REGOLE:
1. Sii specifico e pratico nelle azioni (es. "Sollecita fattura X" invece di "Gestisci i crediti")
2. Considera la stagionalità (agosto = meno lavoro, settembre-novembre = più lavoro)
3. Se ci sono fatture da incassare, suggerisci azioni specifiche per quelle
4. Il buffer consigliato deve coprire almeno 2 mesi di spese
5. Per i mesi in deficit, suggerisci azioni concrete per compensare
6. Rispondi SOLO con il JSON, senza testo aggiuntivo`;

    console.log("Calling Lovable AI for work plan analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Sei un consulente finanziario esperto. Rispondi sempre e solo in JSON valido, senza markdown o testo aggiuntivo." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    let content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let parsedPlan;
    try {
      parsedPlan = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a fallback plan
      parsedPlan = generateFallbackPlan(workPlan, summary, pendingInvoices, settings);
    }

    return new Response(JSON.stringify(parsedPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-work-plan:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fallback plan generator in case AI fails
function generateFallbackPlan(
  workPlan: MonthData[], 
  summary: any, 
  pendingInvoices: PendingInvoice[],
  settings: any
) {
  const monthlyPlans = workPlan.map((m, index) => {
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    let suggestion = "Mese nella norma, mantieni il ritmo di lavoro attuale.";
    let actions: string[] = [];
    let target = `Lavora almeno ${m.workDaysNeeded} giorni`;

    if (m.status === 'deficit') {
      status = 'critical';
      suggestion = `Attenzione: deficit previsto di €${m.deficitAmount.toFixed(0)}. Considera di anticipare lavori o ridurre spese.`;
      actions = [
        "Cerca nuovi progetti o clienti",
        "Valuta riduzione spese non essenziali"
      ];
      target = `Riduci deficit a meno di €${(m.deficitAmount / 2).toFixed(0)}`;
    } else if (m.balance < m.totalExpenses * 0.5) {
      status = 'warning';
      suggestion = "Margine ridotto questo mese. Monitora attentamente le spese.";
      actions = ["Controlla scadenze fatture", "Pianifica lavori per il mese successivo"];
      target = `Mantieni un margine di almeno €${(m.totalExpenses * 0.3).toFixed(0)}`;
    }

    // Add pending invoice actions for first months
    if (index < 2 && pendingInvoices.length > 0) {
      actions.unshift(`Sollecita incasso delle ${pendingInvoices.length} fatture in sospeso`);
    }

    return {
      month: m.month,
      status,
      suggestion,
      actions,
      target,
      priorityLevel: status === 'critical' ? 5 : status === 'warning' ? 3 : 1
    };
  });

  const criticalMonths = workPlan.filter(m => m.status === 'deficit').map(m => m.month);
  const calmMonths = workPlan.filter(m => m.surplusAmount > m.totalExpenses * 0.5).map(m => m.month);

  return {
    monthlyPlans,
    annualSummary: {
      criticalMonths: criticalMonths.slice(0, 3),
      calmMonths: calmMonths.slice(0, 3),
      recommendedBuffer: settings.estimatedMonthlyCosts * 2,
      totalWorkDays: Math.ceil(summary.averageWorkDays * 12),
      finalAdvice: criticalMonths.length > 2 
        ? "Hai diversi mesi a rischio. Concentrati sul recupero crediti e sulla ricerca di nuovi progetti per i mesi critici."
        : "Situazione complessivamente sotto controllo. Mantieni un buffer di sicurezza e pianifica in anticipo."
    }
  };
}
