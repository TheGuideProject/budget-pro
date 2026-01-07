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

interface MonthlyBreakdown {
  month: string;
  fixed: number;
  variable: number;
  bills: number;
  total: number;
}

interface PersonalData {
  age?: number | null;
  gender?: string | null;
  yearsWorked?: number | null;
  familyStructure?: string | null;
  familyMembersCount?: number | null;
  housingType?: string | null;
  housingSqm?: number | null;
  heatingType?: string | null;
  hasCar?: boolean | null;
  carCount?: number | null;
  citySize?: string | null;
  region?: string | null;
}

interface FinancialData {
  fixedCosts: number;
  variableCosts: number;
  billsCosts: number;
  totalMonthly: number;
  dailyRate: number;
  workDaysNeeded: number;
  pensionAmount: number;
  averageIncome: number;
  lastYearIncome?: number;
  thisYearIncome?: number;
  projectedAnnualIncome?: number;
  // Breakdown dettagliato (classificazione unificata)
  monthlyLoans?: number;
  monthlySubscriptions?: number;
  monthsOfData?: number;
  isEstimated?: boolean;
  // NOTA: monthlyTransfers rimosso - ora inclusi in variableCosts
}

interface RequestBody {
  financialData: FinancialData;
  monthlyBreakdown?: MonthlyBreakdown[];
  personalData?: PersonalData | null;
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
    const { financialData, monthlyBreakdown, personalData } = await req.json() as RequestBody;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build personal context section
    let personalContext = "";
    if (personalData && Object.values(personalData).some(v => v !== null && v !== undefined)) {
      const genderLabels: Record<string, string> = { male: 'uomo', female: 'donna', other: 'altro' };
      const familyLabels: Record<string, string> = { 
        single: 'single', 
        couple: 'coppia senza figli', 
        couple_with_kids: 'coppia con figli', 
        single_parent: 'genitore single' 
      };
      const housingLabels: Record<string, string> = { owned: 'proprietà', rented: 'affitto', family: 'casa familiare' };
      const heatingLabels: Record<string, string> = { 
        gas: 'gas metano', 
        electric: 'elettrico', 
        heat_pump: 'pompa di calore', 
        pellet: 'pellet/legna',
        district: 'teleriscaldamento'
      };
      const cityLabels: Record<string, string> = { 
        small: 'piccola città (<20k)', 
        medium: 'media città (20k-100k)', 
        large: 'grande città (100k-500k)', 
        metropolitan: 'area metropolitana (>500k)' 
      };

      personalContext = `
📋 PROFILO PERSONALE:
${personalData.age ? `- Età: ${personalData.age} anni` : ''}
${personalData.gender ? `- Sesso: ${genderLabels[personalData.gender] || personalData.gender}` : ''}
${personalData.yearsWorked ? `- Anni lavorati: ${personalData.yearsWorked}` : ''}
${personalData.familyStructure ? `- Situazione familiare: ${familyLabels[personalData.familyStructure] || personalData.familyStructure}` : ''}
${personalData.familyMembersCount ? `- Componenti nucleo: ${personalData.familyMembersCount} persone` : ''}
${personalData.housingType ? `- Abitazione: ${housingLabels[personalData.housingType] || personalData.housingType}` : ''}
${personalData.housingSqm ? `- Metratura: ${personalData.housingSqm} mq` : ''}
${personalData.heatingType ? `- Riscaldamento: ${heatingLabels[personalData.heatingType] || personalData.heatingType}` : ''}
${personalData.hasCar !== null ? `- Auto: ${personalData.hasCar ? `sì (${personalData.carCount || 1} veicolo/i)` : 'no'}` : ''}
${personalData.citySize ? `- Tipo città: ${cityLabels[personalData.citySize] || personalData.citySize}` : ''}
${personalData.region ? `- Regione: ${personalData.region}` : ''}
`.split('\n').filter(line => line.trim() && !line.endsWith(': ')).join('\n');
    }

    // Build monthly breakdown section
    let monthlySection = "";
    if (monthlyBreakdown && monthlyBreakdown.length > 0) {
      monthlySection = `
📅 STORICO SPESE ULTIMI 12 MESI:
${monthlyBreakdown.map(m => `${m.month}: €${m.total.toFixed(0)} (fisse: €${m.fixed.toFixed(0)}, variabili: €${m.variable.toFixed(0)}, bollette: €${m.bills.toFixed(0)})`).join('\n')}
`;
    }

    // Build income comparison section
    let incomeSection = "";
    if (financialData.lastYearIncome !== undefined || financialData.projectedAnnualIncome !== undefined) {
      const growth = financialData.lastYearIncome && financialData.projectedAnnualIncome 
        ? ((financialData.projectedAnnualIncome - financialData.lastYearIncome) / financialData.lastYearIncome * 100).toFixed(1)
        : null;
      incomeSection = `
💰 CONFRONTO REDDITO ANNUALE:
- Reddito anno scorso: €${(financialData.lastYearIncome || 0).toFixed(0)}
- Reddito quest'anno (YTD): €${(financialData.thisYearIncome || 0).toFixed(0)}
- Proiezione annuale: €${(financialData.projectedAnnualIncome || 0).toFixed(0)}
${growth ? `- Variazione: ${parseFloat(growth) >= 0 ? '+' : ''}${growth}%` : ''}
`;
    }

    // Build detailed expenses breakdown (classificazione unificata)
    let expensesBreakdown = "";
    if (financialData.monthlyLoans !== undefined) {
      expensesBreakdown = `
📊 DETTAGLIO SPESE (Classificazione Unificata):
- Rate/Prestiti: €${(financialData.monthlyLoans || 0).toFixed(0)}
- Abbonamenti: €${(financialData.monthlySubscriptions || 0).toFixed(0)}
- TOTALE SPESE FISSE: €${financialData.fixedCosts.toFixed(0)}
  (NON include trasferimenti familiari - ora sono variabili)

📈 MEDIA SPESE VARIABILI: €${financialData.variableCosts.toFixed(0)}
- Include: spese giornaliere + trasferimenti al secondario
- Calcolata su: ${financialData.monthsOfData || 0} mesi di storico
- Affidabilità: ${financialData.isEstimated ? 'STIMA (meno di 3 mesi di dati)' : 'BUONA (3+ mesi di dati)'}
`;
    }

    const systemPrompt = `Sei un consulente finanziario esperto italiano. Analizza i dati finanziari dell'utente e fornisci consigli pratici e personalizzati.
    
Regole:
- Rispondi sempre in italiano
- Sii conciso ma utile (max 5-6 punti)
- Usa numeri concreti quando possibile
- Concentrati su azioni pratiche che l'utente può intraprendere
- Non essere troppo formale, usa un tono amichevole
- Se hai dati sul profilo personale, usa queste informazioni per personalizzare i consigli (es. se ha figli, se è in affitto, tipo di riscaldamento per le bollette)
- Analizza lo storico dei 12 mesi se disponibile per identificare trend
- Confronta il reddito dell'anno scorso con la proiezione di quest'anno per dare consigli bidirezionali
- IMPORTANTE: Classificazione Unificata:
  - Spese fisse = rate/prestiti + abbonamenti (NO trasferimenti!)
  - Spese variabili = spese giornaliere + trasferimenti familiari
  - Bollette = separate per tracciare consumi
- La media delle spese variabili è calcolata progressivamente in base allo storico disponibile`;

    const userPrompt = `Ecco la mia situazione finanziaria:

${personalContext}

${expensesBreakdown}

📊 RIEPILOGO SPESE MENSILI:
- Costi fissi totali: €${financialData.fixedCosts.toFixed(2)}
- Media costi variabili: €${financialData.variableCosts.toFixed(2)}
- Bollette: €${financialData.billsCosts.toFixed(2)}
- TOTALE MENSILE: €${financialData.totalMonthly.toFixed(2)}

💼 LAVORO:
- Tariffa giornaliera: €${financialData.dailyRate}
- Giorni di lavoro necessari per coprire le spese: ${financialData.workDaysNeeded}

💰 RISPARMIO:
- Accantonamento pensione mensile: €${financialData.pensionAmount}
- Entrate medie mensili: €${financialData.averageIncome.toFixed(2)}

${incomeSection}

${monthlySection}

Fornisci 5-6 consigli pratici considerando:
1. Se i miei costi sono sostenibili rispetto alle entrate
2. Come ottimizzare i giorni di lavoro
3. Se l'accantonamento pensionistico è adeguato per il mio profilo
4. Confronto tra reddito anno scorso e proiezione quest'anno - cosa significa per me?
5. Eventuali rischi o opportunità che vedi considerando il mio profilo personale
6. Suggerimenti specifici basati sulla mia situazione abitativa, familiare e geografica`;

    console.log("Calling Lovable AI for financial analysis...");
    console.log("Has personal data:", !!personalContext);
    console.log("Has monthly breakdown:", !!monthlySection);
    console.log("Has expenses breakdown:", !!expensesBreakdown);
    console.log("Fixed costs:", financialData.fixedCosts, "Variable avg:", financialData.variableCosts);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Troppe richieste. Riprova tra qualche minuto." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti. Contatta il supporto." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "Non sono riuscito a generare un'analisi.";

    console.log("AI analysis completed successfully");

    return new Response(
      JSON.stringify({ analysis: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-finances:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
