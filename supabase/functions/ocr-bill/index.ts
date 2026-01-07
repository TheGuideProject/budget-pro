import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Prompt for single bill photo
const SINGLE_BILL_PROMPT = `Sei un assistente specializzato nell'analisi di bollette italiane (luce, gas, acqua, telefono, internet, ecc.).
Analizza l'immagine della bolletta e restituisci SOLO un JSON valido con questa struttura:

{
  "provider": "nome fornitore (es. Enel, Eni, A2A, Tim, Vodafone, ecc.)",
  "bill_type": "luce" | "gas" | "acqua" | "telefono" | "internet" | "rifiuti" | "condominio" | "altro",
  "amount": numero (importo totale da pagare in euro),
  "due_date": "data scadenza nel formato YYYY-MM-DD",
  "bill_date": "data emissione bolletta nel formato YYYY-MM-DD",
  "period_start": "inizio periodo di fatturazione YYYY-MM-DD",
  "period_end": "fine periodo di fatturazione YYYY-MM-DD",
  "consumption_value": numero (consumo, es. kWh per luce, m³ per gas/acqua),
  "consumption_unit": "unità di misura (kWh, Smc, m³, ecc.)",
  "address": "indirizzo fornitura se visibile",
  "contract_number": "numero contratto/POD/PDR se visibile",
  "notes": "eventuali note importanti dalla bolletta"
}

IMPORTANTE:
- Estrai tutti i dati che riesci a vedere dalla bolletta
- Se un campo non è visibile, usa null
- Per l'importo, cerca sempre il "TOTALE DA PAGARE" o "IMPORTO DOVUTO"
- Identifica correttamente il tipo di bolletta dal logo/intestazione

Se non riesci a estrarre informazioni, restituisci: {"error": "descrizione errore"}`;

// Prompt for portal screenshot with multiple bills
const SCREENSHOT_PROMPT = `Stai analizzando uno screenshot della pagina "Storico Bollette", "Le mie fatture" o "Archivio documenti" 
dal portale web di un fornitore di utenze italiane (Enel, Eni, A2A, IRETI, Hera, Sorgenia, etc.).

Estrai TUTTE le bollette visibili nella tabella/lista. Per ogni bolletta trovata, estrai:
- provider: nome del fornitore (dal logo o intestazione)
- bill_type: "luce" | "gas" | "acqua" | "telefono" | "internet" | "rifiuti" | "altro"
- amount: importo in euro (numero)
- due_date: data scadenza nel formato YYYY-MM-DD
- period_start: inizio periodo fatturazione YYYY-MM-DD
- period_end: fine periodo fatturazione YYYY-MM-DD
- consumption_value: consumo (numero, se visibile)
- consumption_unit: unità di misura (kWh, Smc, m³)
- status: "pagata" | "da_pagare" (in base a icone, badge, o testo come "Pagata", "Scaduta", "Da pagare")

Restituisci SOLO un JSON valido con questa struttura:
{
  "bills": [
    {
      "provider": "nome fornitore",
      "bill_type": "luce",
      "amount": 85.50,
      "due_date": "2025-02-15",
      "period_start": "2024-12-01",
      "period_end": "2025-01-31",
      "consumption_value": 280,
      "consumption_unit": "kWh",
      "status": "pagata"
    }
  ]
}

IMPORTANTE:
- Estrai TUTTE le bollette visibili, anche parzialmente
- Se un campo non è visibile, usa null
- Riconosci i formati tabellari tipici dei portali italiani
- Le date potrebbero essere in formato italiano (DD/MM/YYYY), convertile in YYYY-MM-DD
- Cerca indicatori di stato: spunte verdi = pagata, triangoli rossi/gialli = da pagare

Se l'immagine non contiene bollette riconoscibili, restituisci: {"error": "Nessuna bolletta trovata"}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { imageBase64, source = 'photo', useOpenAI = false } = await req.json();
    
    if (!imageBase64) {
      throw new Error("No image provided");
    }

    const isScreenshot = source === 'screenshot';
    const systemPrompt = isScreenshot ? SCREENSHOT_PROMPT : SINGLE_BILL_PROMPT;
    const userPrompt = isScreenshot 
      ? "Analizza questo screenshot del portale e estrai tutte le bollette visibili:"
      : "Analizza questa bolletta ed estrai tutte le informazioni:";

    console.log(`Processing ${source} with ${useOpenAI ? 'OpenAI' : 'Lovable AI'}...`);

    let response: Response;

    if (useOpenAI) {
      // Use OpenAI
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY non configurata. Configura la chiave nelle impostazioni.");
      }

      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageBase64 } }
              ]
            }
          ],
          max_tokens: 4096,
        }),
      });
    } else {
      // Use Lovable AI (default)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageBase64 } }
              ]
            }
          ],
        }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite richieste raggiunto, riprova tra poco." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti esauriti, aggiungi fondi al workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("AI response received:", content);

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let parsedData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      parsedData = { error: "Impossibile estrarre dati dalla bolletta" };
    }

    console.log("Parsed bill data:", parsedData);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("OCR bill error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});