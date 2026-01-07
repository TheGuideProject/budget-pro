import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const appGuide = `
GUIDA ALL'USO DI BUDGETPRO:

=== MODALITÀ SEMPLICE ===
Per utenti che vogliono solo tracciare le spese personali.
- Home: riepilogo mensile con saldo e grafico categorie
- 4 modi per inserire spese:
  1. Input Vocale: premi il pulsante microfono e dici "Ho speso 50 euro al supermercato ieri". L'AI riconosce automaticamente importo, categoria e data.
  2. Manuale: clicca il pulsante "+" e compila il form con descrizione, importo, categoria e data.
  3. OCR Scontrino: fotografa lo scontrino e l'AI estrae automaticamente tutti i dati.
  4. Import Banca: carica il CSV dell'estratto conto o fotografalo per importare le transazioni.

=== MODALITÀ ESTESA ===
Per professionisti e famiglie.

**DASHBOARD:**
- Panoramica con statistiche: fatturato, incassato, da ricevere, spese
- Alert fatture scadute in evidenza
- Tabella fatture recenti con stato
- Grafici riepilogativi entrate/uscite

**CALENDARIO:**
- Visualizza scadenze fatture, pagamenti attesi, promemoria bollette
- Crea eventi personalizzati cliccando sul giorno o con "Nuovo Evento"
- Puoi generare automaticamente eventi dal Piano Lavoro (Analisi AI)

**FATTURE:**
- Stati: Bozza → Inviata → Pagata (o Parziale/Scaduta)
- Crea fattura: "Nuova Fattura" → compila dati cliente → aggiungi voci → salva
- Registra pagamento: apri fattura → "Registra Pagamento" → inserisci importo → carica screenshot bonifico
- OCR: carica PDF/immagine fattura esistente per importarla
- Export PDF: genera fattura professionale pronta per l'invio

**SPESE:**
- Categorie: Cibo, Trasporti, Utenze, Abbonamenti, Salute, Shopping, Intrattenimento, Altro
- Filtri: periodo, categoria, tipo (privata/aziendale), metodo pagamento
- Modifica/elimina: clicca sulla riga della spesa

**BUDGET:**
- Grafici: torta (categorie), barre (mensile), timeline, waterfall (cash flow)
- Previsioni basate su storico + fatture pending + spese fisse
- OCR Bollette: carica bollette per tracciare consumi e costi utenze
- Imposta stime costi nelle Impostazioni per previsioni più accurate

**ANALISI AI:**
- Piano Mese per Mese: genera piano dettagliato con entrate/uscite/saldo previsto
- Switch "Includi Bozze": considera anche fatture in bozza nelle previsioni (evidenziate in ambra)
- Calendario AI: genera eventi automatici per scadenze e pagamenti attesi
- Obiettivo Pensione: calcola risparmio mensile necessario per target
- What-If: simula scenari (es. "cosa succede se aumento spese del 10%?")

**FAMIGLIA:**
- Invita familiari: vai in Famiglia → copia codice invito → condividi
- Trasferimenti budget: trasferisci fondi dal budget principale al familiare
- Carryover: avanzo/deficit riportato automaticamente al mese successivo
- Utente secondario vede solo proprie spese e budget assegnato

**BOLLETTE:**
- Tipi: Luce, Gas, Acqua, Internet, Telefono, Rifiuti, Condominio
- Carica bolletta: OCR estrae importo, periodo, consumi, fornitore
- Storico: confronta costi e consumi nel tempo per fornitore
- Upload Bulk: carica più bollette contemporaneamente

**SPESE FISSE:**
- Abbonamenti: streaming, palestra, assicurazioni, rate, affitto
- Frequenza: mensile, trimestrale, annuale
- Automaticamente incluse nelle previsioni budget

**PROGETTI:**
- Crea progetti per organizzare lavoro per cliente/commessa
- Collega fatture e spese al progetto per calcolare margine
- Report Pinfabb: genera report strutturati per consulenze

=== AZIONI RAPIDE (SIDEBAR) ===
- Input Vocale: registra spese parlando
- Aggiungi Spesa: form rapido inserimento
- Scansiona OCR: fotografa scontrini/documenti
- Nuovo Evento: crea promemoria veloce
- Import Banca: carica estratto conto
- Nuova Fattura: accesso rapido creazione fattura
- Chiedi all'AI: apri questa chat

=== FUNZIONALITÀ AVANZATE ===
- Switch "Includi Bozze": nelle previsioni, considera fatture bozza come entrate future
- Carryover: riporto automatico avanzo/deficit tra mesi
- Verifica Pagamenti: carica screenshot bonifico come prova
- Export PDF: fatture professionali pronte per invio
- Esclusione dal Budget: escludi fatture straordinarie dai calcoli
`;

// ============================================
// FORNITORI ITALIANI (stessa lista del frontend)
// ============================================

const ENERGY_PROVIDERS = [
  'Enel Energia', 'Eni Plenitude', 'Edison Energia', 'A2A Energia', 'Sorgenia',
  'Hera Comm', 'Iren Mercato', 'Acea Energia', 'AGSM AIM Energia', 'Alperia Energia',
  'Dolomiti Energia', 'Estra Energie', 'Illumia', 'Wekiwi', 'NeN', 'Octopus Energy Italia',
  'Iberdrola Italia', 'Pulsee Luce e Gas', 'Vivigas', 'Metamer', 'Optima Italia',
  'ABenergie', 'Bluenergy Group', 'E.ON Energia Italia', 'ENGIE Italia', 'Axpo Energy Italia',
  'Duferco Energia', 'Green Network', 'Servizio Elettrico Nazionale', 'Servizio Tutela Gas'
];

const WATER_PROVIDERS = [
  'ACEA ATO', 'SMAT', 'Iren Acqua', 'Hera Acqua', 'Publiacqua', 'Acquedotto Pugliese',
  'Abbanoa', 'AMGA', 'CAP Holding', 'BrianzAcque', 'Acqua Novara VCO', 'Acque Veronesi',
  'ABC Napoli', 'Siciliacque'
];

const TELECOM_PROVIDERS = [
  'TIM', 'Vodafone', 'WindTre', 'Iliad', 'Fastweb', 'Tiscali', 'Eolo', 'Linkem',
  'Sky Wifi', 'PosteMobile', 'CoopVoce', 'Kena', 'ho. Mobile', 'Very Mobile'
];

const STREAMING_PROVIDERS = [
  'Sky', 'NOW', 'Netflix', 'Amazon Prime', 'Disney+', 'DAZN', 'Apple TV+', 'Spotify', 'YouTube Premium'
];

const WASTE_PROVIDERS = [
  'Hera Ambiente', 'A2A Ambiente', 'Iren Ambiente', 'Veritas', 'AMSA', 'ASIA Napoli', 'AMIU', 'RAP Palermo'
];

const ALL_PROVIDERS = [...ENERGY_PROVIDERS, ...WATER_PROVIDERS, ...TELECOM_PROVIDERS, ...STREAMING_PROVIDERS, ...WASTE_PROVIDERS];

function detectProvider(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return ALL_PROVIDERS.some(p => normalized.includes(p.toLowerCase()));
}

// ============================================
// CLASSIFICAZIONE UNIFICATA (stessa logica del frontend)
// ============================================

type UnifiedExpenseType = 'variable' | 'fixed_loan' | 'fixed_sub' | 'utility_bill' | 'credit_card';

interface ExpenseRecord {
  description: string;
  category: string;
  bill_type?: string | null;
  bill_provider?: string | null;
  recurring?: boolean;
  payment_method?: string | null;
}

function classifyExpense(expense: ExpenseRecord): UnifiedExpenseType {
  const desc = (expense.description || '').toLowerCase();
  
  // 1. Carta credito → gestione speciale
  if (expense.payment_method === 'carta_credito') {
    return 'credit_card';
  }
  
  // 2. Bollette → check fornitori italiani o bill_type
  if (expense.bill_type || detectProvider(`${expense.description} ${expense.bill_provider || ''}`)) {
    return 'utility_bill';
  }
  
  // 3. Rate prestiti/mutui
  if (/rata\s*\d+\/\d+|prestito|mutuo|finanziamento|younited|credito|leasing/i.test(desc)) {
    return 'fixed_loan';
  }
  
  // 4. Abbonamenti
  if (expense.category === 'abbonamenti' || expense.recurring === true) {
    return 'fixed_sub';
  }
  
  // 5. TUTTO IL RESTO = VARIABILE (inclusi trasferimenti!)
  return 'variable';
}

// Calcola media progressiva spese variabili
function calculateProgressiveVariableAverage(
  expenses: ExpenseRecord[],
  profileCreatedAt: string | null,
  variableMonthsLookback: number | null
): { average: number; monthsConsidered: number } {
  const now = new Date();
  
  // Calcola anzianità profilo
  let profileAgeMonths = 12;
  if (profileCreatedAt) {
    const created = new Date(profileCreatedAt);
    profileAgeMonths = Math.floor((now.getTime() - created.getTime()) / (30 * 24 * 60 * 60 * 1000));
  }
  
  // Usa il valore configurato dall'utente o calcola automaticamente
  const monthsToConsider = variableMonthsLookback ?? Math.min(Math.max(1, profileAgeMonths), 12);
  
  // Filtra solo spese variabili
  const variableExpenses = expenses.filter(exp => classifyExpense(exp) === 'variable');
  
  // Calcola per mese
  const monthlyTotals: Map<string, number> = new Map();
  
  for (let i = 0; i < monthsToConsider; i++) {
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() - i);
    const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    
    const monthTotal = variableExpenses
      .filter(exp => {
        const expDate = new Date((exp as any).date);
        return expDate >= monthStart && expDate <= monthEnd;
      })
      .reduce((sum, exp) => sum + ((exp as any).amount || 0), 0);
    
    monthlyTotals.set(monthKey, monthTotal);
  }
  
  const totalVariable = Array.from(monthlyTotals.values()).reduce((a, b) => a + b, 0);
  const monthsWithData = Array.from(monthlyTotals.values()).filter(v => v > 0).length;
  const divisor = Math.max(monthsWithData, 1);
  
  return {
    average: totalVariable / divisor,
    monthsConsidered: monthsToConsider
  };
}

// Calcola totali spese fisse con classificazione unificata
function calculateFixedExpensesTotals(
  expenses: Array<ExpenseRecord & { date: string; amount: number }>
): { loans: number; subscriptions: number; utilities: number; total: number } {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filtra spese del mese corrente
  const currentMonthExpenses = expenses.filter(exp => {
    const date = new Date(exp.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  let loans = 0, subscriptions = 0, utilities = 0;
  
  currentMonthExpenses.forEach(exp => {
    const type = classifyExpense(exp);
    switch (type) {
      case 'fixed_loan': loans += exp.amount; break;
      case 'fixed_sub': subscriptions += exp.amount; break;
      case 'utility_bill': utilities += exp.amount; break;
      // variable e credit_card non sono fisse
    }
  });
  
  return {
    loans,
    subscriptions,
    utilities,
    total: loans + subscriptions // Bollette separate!
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation: message size limit (10KB max)
    if (!message || typeof message !== 'string' || message.length > 10_000) {
      return new Response(JSON.stringify({ error: "Messaggio non valido o troppo lungo (max 10,000 caratteri)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation: conversation history limit (max 50 messages, 100KB total)
    if (!Array.isArray(conversationHistory) || conversationHistory.length > 50) {
      return new Response(JSON.stringify({ error: "Cronologia conversazione non valida (max 50 messaggi)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const historySize = JSON.stringify(conversationHistory).length;
    if (historySize > 100_000) {
      return new Response(JSON.stringify({ error: "Cronologia conversazione troppo grande (max 100KB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user data from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Utente non trovato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's financial data and profile (include variable_months_lookback)
    const [invoicesRes, expensesRes, projectsRes, profileRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("user_id", user.id),
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("user_profiles").select("created_at, variable_months_lookback").eq("user_id", user.id).single(),
    ]);

    const invoices = invoicesRes.data || [];
    const expenses = expensesRes.data || [];
    const projects = projectsRes.data || [];
    const profileCreatedAt = profileRes.data?.created_at || null;
    const variableMonthsLookback = profileRes.data?.variable_months_lookback || null;

    // Calculate summary stats with unified classification
    const now = new Date();
    const currentYear = now.getFullYear();

    // Invoices stats
    const yearInvoices = invoices.filter(inv => new Date(inv.invoice_date).getFullYear() === currentYear);
    const totalInvoiced = yearInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalReceived = yearInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalPending = yearInvoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);
    const overdueInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && new Date(inv.due_date) < now
    );

    // NUOVA LOGICA: Calcola spese con classificazione unificata
    const fixedTotals = calculateFixedExpensesTotals(expenses);
    const variableData = calculateProgressiveVariableAverage(expenses, profileCreatedAt, variableMonthsLookback);

    // Spese totali
    const totalMonthExpenses = fixedTotals.total + variableData.average + fixedTotals.utilities;
    const yearExpenses = expenses.filter(exp => new Date(exp.date).getFullYear() === currentYear);
    const totalYearExpenses = yearExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Category breakdown (per compatibilità)
    const categoryBreakdown: Record<string, number> = {};
    yearExpenses.forEach(exp => {
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
    });

    const financialContext = `
DATI FINANZIARI DELL'UTENTE (aggiornati a ${now.toLocaleDateString('it-IT')}):

📊 SPESE MENSILI (Classificazione Unificata):
- Rate/Prestiti: €${fixedTotals.loans.toFixed(2)}
- Abbonamenti: €${fixedTotals.subscriptions.toFixed(2)}
- TOTALE SPESE FISSE: €${fixedTotals.total.toFixed(2)}
- Media spese variabili (su ${variableData.monthsConsidered} mesi): €${variableData.average.toFixed(2)}
  (include trasferimenti familiari che ora sono spese variabili)
- Bollette stimate: €${fixedTotals.utilities.toFixed(2)}
- TOTALE STIMATO MENSILE: €${totalMonthExpenses.toFixed(2)}

FATTURE ANNO ${currentYear}:
- Totale fatturato: €${totalInvoiced.toFixed(2)}
- Totale incassato: €${totalReceived.toFixed(2)}
- Ancora da ricevere: €${totalPending.toFixed(2)}
- Fatture scadute non pagate: ${overdueInvoices.length}

SPESE ANNO:
- Spese anno ${currentYear}: €${totalYearExpenses.toFixed(2)}
- Ripartizione per categoria: ${Object.entries(categoryBreakdown).map(([cat, amt]) => `${cat}: €${amt.toFixed(2)}`).join(', ') || 'nessuna spesa'}

PROGETTI ATTIVI: ${projects.length}

BILANCIO STIMATO ANNO:
- Entrate: €${totalReceived.toFixed(2)}
- Uscite: €${totalYearExpenses.toFixed(2)}
- Margine: €${(totalReceived - totalYearExpenses).toFixed(2)}
- Entrate attese (fatture non pagate): €${totalPending.toFixed(2)}

Dettaglio fatture recenti:
${invoices.slice(0, 10).map(inv => 
  `- ${inv.invoice_number}: ${inv.client_name} - €${inv.total_amount} (${inv.status}, pagato: €${inv.paid_amount})`
).join('\n')}

Dettaglio spese recenti:
${expenses.slice(0, 10).map(exp => 
  `- ${exp.description}: €${exp.amount} (${exp.category}, ${new Date(exp.date).toLocaleDateString('it-IT')})`
).join('\n')}
`;

    const systemPrompt = `Sei un assistente AI per BudgetPro, un'app di gestione finanziaria per professionisti e famiglie italiane.

HAI DUE COMPITI PRINCIPALI:
1. Rispondere a domande sui DATI FINANZIARI dell'utente usando il contesto fornito
2. Spiegare COME USARE L'APP con istruzioni chiare e strutturate

REGOLE DI FORMATTAZIONE (SEGUI SEMPRE):
- Usa ## per titoli di sezione
- Usa numeri (1. 2. 3.) per passi sequenziali - MAX 5-6 passi
- Usa - per liste puntate
- Usa **grassetto** per enfatizzare parole chiave importanti
- Usa > per suggerimenti/tips importanti (inizia la riga con >)
- Rispondi SEMPRE in italiano
- Sii conciso ma completo - risposte brevi e utili
- Per domande sui dati: formatta numeri in euro con simbolo €
- Per domande su come fare: dai istruzioni passo-passo chiare
- IMPORTANTE: I dati delle spese sono calcolati con CLASSIFICAZIONE UNIFICATA:
  - Spese fisse = rate/prestiti + abbonamenti (NO trasferimenti!)
  - Spese variabili = spese giornaliere + trasferimenti familiari
  - Bollette = separate per tracciare consumi

${appGuide}

${financialContext}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurata");
    }

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
          ...conversationHistory,
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Errore nel servizio AI");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Mi dispiace, non sono riuscito a elaborare la risposta.";

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ask-ai function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
