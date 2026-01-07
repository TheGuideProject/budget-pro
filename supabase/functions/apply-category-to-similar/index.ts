import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

interface SimilarExpenseRequest {
  referenceDescription: string;
  categoryParent: string;
  categoryChild: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request - use the authenticated user's ID, not from request body
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  
  const userId = user.id;
  console.log('Authenticated user:', userId);

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Note: userId is now from authenticated user, not from request body
    const { referenceDescription, categoryParent, categoryChild } = await req.json() as SimilarExpenseRequest;

    if (!referenceDescription || !categoryParent) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input validation: description and category limits
    if (referenceDescription.length > 1000 || categoryParent.length > 100 || (categoryChild && categoryChild.length > 100)) {
      return new Response(JSON.stringify({ error: 'Input too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Finding similar expenses for user ${userId}, reference: "${referenceDescription}"`);

    // Recupera tutte le spese dell'utente che potrebbero essere simili
    // Cerca "altro" in modo case-insensitive
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('id, description, category_parent, category_child')
      .eq('user_id', userId)
      .or('category_parent.is.null,category_parent.ilike.altro,category_parent.ilike.Altro');

    if (fetchError) {
      console.error('Error fetching expenses:', fetchError);
      throw fetchError;
    }

    if (!expenses || expenses.length === 0) {
      console.log('No uncategorized expenses found');
      return new Response(JSON.stringify({ updatedCount: 0, updatedExpenses: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${expenses.length} uncategorized expenses to analyze`);

    // Prepara la lista di spese per l'AI
    const expensesList = expenses.map((e, i) => 
      `${i + 1}. ID: ${e.id} | "${e.description}"`
    ).join('\n');

    // Chiedi all'AI quali spese sono simili
    const systemPrompt = `Sei un esperto di categorizzazione spese. L'utente ha categorizzato questa spesa:

"${referenceDescription}" → ${categoryParent}${categoryChild ? ` > ${categoryChild}` : ''}

Analizza le seguenti spese e trova quelle che sono SIMILI e dovrebbero avere la stessa categoria.

CRITERI DI SIMILARITÀ (in ordine di importanza):
1. Stesso esercente/commerciante (es. "Esselunga Genova" ≈ "Esselunga Milano" ≈ "Esselunga SPA")
2. Stesso prefisso/codice identificativo (es. "PV0046" ≈ "PV ENI - 51505" ≈ "PV0022" - tutti distributori ENI)
3. Stesso pattern descrittivo (es. "Amazon* XY123" ≈ "Amazon* AB456")
4. Stessa catena/gruppo (es. "Conad" ≈ "Conad City" ≈ "Conad Superstore")
5. Stesso tipo di servizio riconoscibile (es. "Telepass" in diverse forme)

IMPORTANTE:
- Sii ragionevolmente permissivo: se c'è una buona probabilità che la spesa sia dello stesso tipo, includila
- I codici numerici alla fine sono spesso ID transazione e non sono rilevanti per il matching
- "PV" all'inizio indica quasi sempre distributori di benzina ENI
- Riconosci variazioni comuni: con/senza spazi, maiuscole/minuscole, abbreviazioni

Rispondi SOLO con un JSON array contenente gli ID delle spese simili. Se nessuna spesa è simile, restituisci un array vuoto [].

Esempio di risposta:
["uuid-1", "uuid-2", "uuid-3"]`;

    const userPrompt = `Trova le spese simili a "${referenceDescription}" in questa lista:\n\n${expensesList}`;

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
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    console.log("AI response:", content);

    // Parse la risposta dell'AI
    let similarIds: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        similarIds = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    if (similarIds.length === 0) {
      console.log('No similar expenses found by AI');
      return new Response(JSON.stringify({ updatedCount: 0, updatedExpenses: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`AI found ${similarIds.length} similar expenses:`, similarIds);

    // Aggiorna le spese simili
    const { data: updatedData, error: updateError } = await supabase
      .from('expenses')
      .update({
        category_parent: categoryParent,
        category_child: categoryChild
      })
      .in('id', similarIds)
      .eq('user_id', userId) // Security: ensure we only update user's own expenses
      .select('id, description');

    if (updateError) {
      console.error('Error updating similar expenses:', updateError);
      throw updateError;
    }

    const updatedCount = updatedData?.length || 0;
    console.log(`Updated ${updatedCount} similar expenses`);

    return new Response(JSON.stringify({ 
      updatedCount, 
      updatedExpenses: updatedData || [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in apply-category-to-similar:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
