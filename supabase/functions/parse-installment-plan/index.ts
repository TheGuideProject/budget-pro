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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { text, imageBase64 } = await req.json();

    if (!text && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Testo o immagine richiesti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI non configurata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

const systemPrompt = `Sei un esperto nell'analisi di documenti finanziari italiani (piani rate, rateizzazioni bollette, finanziamenti).

ISTRUZIONI CRITICHE:
1. Cerca TABELLE con colonne come "Scadenza", "Data", "Importo", "Rata", "€"
2. Le date italiane sono in formato DD/MM/YYYY (es. "24/11/2025") - CONVERTILE in YYYY-MM-DD
3. Gli importi possono avere virgola come separatore decimale (es. "123,45" = 123.45)
4. Estrai SOLO le rate che trovi REALMENTE nel documento - NON inventare dati
5. Se non trovi rate, rispondi con installments vuoto []

FORMATO DATE:
- Input: "24/11/2025" o "24-11-2025" o "24 novembre 2025"
- Output: "2025-11-24" (YYYY-MM-DD)

FORMATO IMPORTI:
- Input: "€ 123,45" o "123,45 €" o "EUR 123.45"
- Output: 123.45 (numero)

Rispondi SOLO con JSON valido (senza markdown):
{
  "provider": "Nome fornitore trovato nel documento o null",
  "planNumber": "Numero piano/pratica o null",
  "customerName": "Nome cliente o null",
  "description": "Descrizione breve del piano o null",
  "totalAmount": 1234.56,
  "installments": [
    {
      "number": 1,
      "amount": 123.45,
      "dueDate": "2025-01-15"
    }
  ]
}

Se NON riesci a trovare rate valide, rispondi:
{"provider": null, "planNumber": null, "customerName": null, "description": null, "totalAmount": null, "installments": []}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Analizza questo documento e estrai il piano rate:" },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `Analizza questo testo estratto da un documento ed estrai il piano rate:\n\n${text}`
      });
    }

    console.log('Calling Lovable AI to parse installment plan...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite richieste AI superato, riprova tra poco' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti AI esauriti' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Errore AI gateway' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Risposta AI vuota' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content);

    // Parse the JSON from the response
    let parsedPlan;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsedPlan = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Impossibile interpretare la risposta AI', rawResponse: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the structure
    if (!parsedPlan.installments || !Array.isArray(parsedPlan.installments)) {
      return new Response(
        JSON.stringify({ error: 'Nessuna rata trovata nel documento', parsedPlan }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully parsed installment plan:', parsedPlan);

    return new Response(
      JSON.stringify({ success: true, plan: parsedPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-installment-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
