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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { imageBase64, expectedAmount, invoiceNumber } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Immagine mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key non configurata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Sei un assistente specializzato nell'analisi di screenshot di pagamenti bancari.
Analizza l'immagine fornita e estrai le seguenti informazioni:
- Importo del pagamento (in formato numerico, es: 1500.00)
- Data del pagamento
- Riferimento/causale del pagamento (se presente)
- Nome del pagante/ordinante (se presente)

Rispondi SOLO con un JSON valido nel seguente formato:
{
  "amount": numero_importo,
  "date": "data_pagamento",
  "reference": "riferimento_causale",
  "payer": "nome_pagante",
  "confidence": numero_da_0_a_100,
  "rawText": "testo_estratto_dallo_screenshot"
}

Se non riesci a estrarre l'importo, usa null per amount.
Il campo confidence indica quanto sei sicuro dell'estrazione (0-100).`;

    const userPrompt = `Analizza questo screenshot di un pagamento bancario.
${expectedAmount ? `L'importo atteso è: €${expectedAmount.toFixed(2)}` : ''}
${invoiceNumber ? `Numero fattura di riferimento: ${invoiceNumber}` : ''}

Estrai le informazioni del pagamento e verifica se corrispondono.`;

    console.log('Calling Lovable AI for OCR analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite richieste superato, riprova più tardi' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti insufficienti' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Errore durante l\'analisi OCR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty AI response');
      return new Response(
        JSON.stringify({ error: 'Risposta vuota dall\'AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Response:', content);

    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Impossibile analizzare lo screenshot',
          rawResponse: content
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the amount matches if expected amount is provided
    let verified = false;
    let amountMatch = false;
    
    if (extractedData.amount !== null && expectedAmount) {
      // Allow 1% tolerance for rounding differences
      const tolerance = expectedAmount * 0.01;
      amountMatch = Math.abs(extractedData.amount - expectedAmount) <= tolerance;
      verified = amountMatch && extractedData.confidence >= 70;
    }

    return new Response(
      JSON.stringify({
        ...extractedData,
        expectedAmount,
        amountMatch,
        verified,
        message: verified 
          ? 'Pagamento verificato correttamente!' 
          : amountMatch 
            ? 'Importo corretto ma confidenza bassa'
            : extractedData.amount 
              ? `Importo estratto (€${extractedData.amount}) non corrisponde all'atteso (€${expectedAmount})`
              : 'Impossibile estrarre l\'importo dallo screenshot'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ocr-payment function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
