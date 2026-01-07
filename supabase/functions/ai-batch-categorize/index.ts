import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping AI output → Frontend IDs
const AI_TO_FRONTEND_CATEGORY_MAP: Record<string, string> = {
  'alimentari': 'alimentari',
  'ristorazione': 'ristorazione',
  'trasporti': 'trasporti',
  'casa': 'casa_utenze',
  'utenze': 'casa_utenze',
  'salute': 'salute',
  'abbigliamento': 'persona_cura',
  'svago': 'tempo_libero',
  'tecnologia': 'tecnologia',
  'figli': 'altro',
  'animali': 'animali',
  'finanza': 'finanza_obblighi',
  'altro': 'altro',
  'viaggi': 'viaggi',
  'sport': 'sport_benessere',
  'lavoro': 'lavoro_formazione',
  'abbonamenti': 'abbonamenti_servizi',
  'regali': 'regali_donazioni',
  'extra': 'extra_imprevisti',
  'auto': 'auto_veicoli',
};

const AI_TO_FRONTEND_CHILD_MAP: Record<string, string> = {
  'supermercato': 'supermercato',
  'bar/caffè': 'bar_caffe',
  'bar': 'bar_caffe',
  'caffè': 'bar_caffe',
  'carburante': 'carburante',
  'parcheggio': 'parcheggi',
  'pedaggi': 'pedaggi',
  'ristorante': 'ristorante',
  'pizzeria': 'pizzeria',
  'fast food': 'fast_food',
  'delivery': 'delivery',
  'farmacia': 'farmaci',
  'dentista': 'dentista',
  'manutenzione': 'manutenzione_ordinaria',
  'affitto': 'affitto_mutuo',
  'mutuo': 'affitto_mutuo',
  'luce': 'luce',
  'gas': 'gas',
  'acqua': 'acqua',
  'internet': 'internet_casa',
  'telefono': 'telefonia',
  'varie': 'non_classificato',
};

function normalizeCategory(raw: string): string {
  if (!raw) return 'altro';
  const normalized = raw.toLowerCase().trim();
  
  // Direct mapping
  if (AI_TO_FRONTEND_CATEGORY_MAP[normalized]) {
    return AI_TO_FRONTEND_CATEGORY_MAP[normalized];
  }
  
  // Check if already a valid ID
  const validIds = [
    'casa_utenze', 'alimentari', 'ristorazione', 'trasporti', 'auto_veicoli',
    'animali', 'persona_cura', 'salute', 'tempo_libero', 'sport_benessere',
    'viaggi', 'tecnologia', 'lavoro_formazione', 'finanza_obblighi',
    'abbonamenti_servizi', 'regali_donazioni', 'extra_imprevisti', 'altro'
  ];
  
  if (validIds.includes(normalized)) {
    return normalized;
  }
  
  return 'altro';
}

function normalizeChild(raw: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().trim();
  
  if (AI_TO_FRONTEND_CHILD_MAP[normalized]) {
    return AI_TO_FRONTEND_CHILD_MAP[normalized];
  }
  
  // Convert to ID format
  return normalized.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
}

// Categories for AI prompt - use labels, AI will return these
const EXPENSE_CATEGORIES = {
  "alimentari": ["supermercato", "discount", "mercato", "macelleria_pescheria", "fornaio", "bevande"],
  "ristorazione": ["ristorante", "pizzeria", "bar_caffe", "fast_food", "delivery", "aperitivi"],
  "trasporti": ["carburante", "ricarica_elettrica", "trasporto_pubblico", "taxi_ncc", "pedaggi", "parcheggi", "noleggio"],
  "casa_utenze": ["affitto_mutuo", "condominio", "luce", "gas", "acqua", "rifiuti", "internet_casa", "manutenzione_ordinaria"],
  "salute": ["visite", "analisi", "farmaci", "integratori", "dentista", "ottica"],
  "persona_cura": ["abbigliamento", "scarpe", "accessori_persona", "parrucchiere", "estetica", "cosmetici"],
  "tempo_libero": ["cinema", "eventi", "libri", "videogiochi", "abbonamenti_streaming", "hobby"],
  "tecnologia": ["smartphone", "computer", "accessori_tech", "software", "riparazioni_tech"],
  "animali": ["cibo_animali", "veterinario", "farmaci_animali", "accessori_animali"],
  "auto_veicoli": ["assicurazione_auto", "bollo", "manutenzione_auto", "pneumatici", "revisione", "lavaggio"],
  "finanza_obblighi": ["tasse", "imposte", "commercialista", "spese_bancarie", "commissioni"],
  "viaggi": ["voli", "treni", "alloggi", "noleggio_viaggio"],
  "altro": ["non_classificato"]
};

interface ExpenseToCategories {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface CategorySuggestion {
  id: string;
  categoryParent: string;
  categoryChild: string | null;
  confidence: number;
  reason: string;
}

interface LearnedCategory {
  description: string;
  category_parent: string;
  category_child: string | null;
  usage_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not set');
    }

    const { expenses, userId } = await req.json() as { expenses: ExpenseToCategories[], userId?: string };

    if (!expenses || expenses.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${expenses.length} expenses for categorization`);

    // Recupera le categorizzazioni apprese dell'utente (se userId fornito)
    let learnedExamples = '';
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: learnedCategories } = await supabase
        .from('learned_categories')
        .select('description, category_parent, category_child, usage_count')
        .eq('user_id', userId)
        .order('usage_count', { ascending: false })
        .limit(100);

      if (learnedCategories && learnedCategories.length > 0) {
        console.log(`Found ${learnedCategories.length} learned categories for user`);
        learnedExamples = learnedCategories.map((lc: LearnedCategory) => 
          `"${lc.description}" → ${lc.category_parent}${lc.category_child ? ` > ${lc.category_child}` : ''} (usato ${lc.usage_count}x)`
        ).join('\n');
      }
    }

    const categoriesJson = JSON.stringify(EXPENSE_CATEGORIES, null, 2);
    
    const expensesList = expenses.map((e, i) => 
      `${i + 1}. ID: ${e.id} | "${e.description}" | €${e.amount} | ${e.date}`
    ).join('\n');

    // Prompt system con esempi appresi
    const learnedSection = learnedExamples ? `
CATEGORIZZAZIONI PRECEDENTI DELL'UTENTE (usa come riferimento!):
${learnedExamples}

IMPORTANTE - APPRENDIMENTO DAI PATTERN:
- Se vedi una spesa SIMILE a un esempio precedente, assegna la STESSA categoria con alta confidence (0.95+)
- Riconosci pattern comuni:
  * "PV" all'inizio = distributori ENI (Trasporti > Carburante)
  * Stesso esercente con città/ID diversi = stessa categoria
  * Stessa catena (es. Esselunga, Conad) = stessa categoria
- I numeri alla fine sono spesso ID transazione, ignorali per il matching

` : '';

    const systemPrompt = `Sei un esperto di categorizzazione spese finanziarie italiane.
Analizza le spese fornite e assegna la categoria più appropriata.

CATEGORIE DISPONIBILI:
${categoriesJson}
${learnedSection}
Per ogni spesa, restituisci un JSON array con oggetti che hanno:
- id: l'ID della spesa originale
- categoryParent: la categoria principale (es. "Alimentari", "Ristorazione")
- categoryChild: la sottocategoria (es. "Supermercato", "Bar/Caffè") o null se non applicabile
- confidence: un valore da 0.0 a 1.0 che indica quanto sei sicuro
- reason: breve spiegazione in italiano del perché hai scelto questa categoria

REGOLE:
- "Conad", "Esselunga", "Lidl", "Eurospin", "Coop" → Alimentari > Supermercato
- "Autostrade", "Telepass" → Trasporti > Pedaggi
- "ENI", "Q8", "IP", "Tamoil", "PV" (inizio) → Trasporti > Carburante
- "bar", "caffè", "colazione" → Ristorazione > Bar/Caffè
- "ristorante", "pizzeria", "trattoria" → Ristorazione > Ristorante
- "Amazon", "eBay" → valuta dal contesto della descrizione
- "bolletta", "fattura" + nome utility → Utenze
- "farmacia", "medicina" → Salute > Farmacia
- Se non sei sicuro, usa "Altro" > "Varie" con confidence basso

Rispondi SOLO con il JSON array, senza altri commenti.`;

    const userPrompt = `Categorizza queste ${expenses.length} spese:\n\n${expensesList}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite di richieste superato, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log("AI response received:", content.substring(0, 200));

    // Parse JSON response and normalize categories
    let suggestions: CategorySuggestion[] = [];
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const rawSuggestions = JSON.parse(jsonMatch[0]);
        // Normalize all categories to frontend IDs
        suggestions = rawSuggestions.map((s: CategorySuggestion) => ({
          ...s,
          categoryParent: normalizeCategory(s.categoryParent),
          categoryChild: normalizeChild(s.categoryChild)
        }));
      } else {
        console.error("No JSON array found in AI response");
        throw new Error("Invalid AI response format");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return empty suggestions instead of failing
      suggestions = [];
    }

    console.log(`Generated ${suggestions.length} category suggestions (normalized)`);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in ai-batch-categorize function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
