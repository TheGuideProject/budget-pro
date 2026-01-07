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

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  suggestedCategory: string;
  merchant?: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cibo: ['supermercato', 'carrefour', 'conad', 'esselunga', 'coop', 'lidl', 'eurospin', 'penny', 'aldi', 'pam', 'despar', 'ristorante', 'pizzeria', 'bar', 'mcdonald', 'burger', 'just eat', 'deliveroo', 'glovo'],
  trasporti: ['benzina', 'eni', 'q8', 'ip', 'tamoil', 'shell', 'autostrada', 'telepass', 'trenitalia', 'italo', 'atm', 'metro', 'taxi', 'uber', 'bolt', 'parcheggio'],
  casa: ['enel', 'eni gas', 'a2a', 'acea', 'iren', 'sorgenia', 'edison', 'affitto', 'condominio', 'ikea', 'leroy merlin', 'brico'],
  abbonamenti: ['netflix', 'spotify', 'amazon prime', 'disney', 'dazn', 'tim', 'vodafone', 'wind', 'iliad', 'fastweb', 'sky', 'apple', 'google', 'microsoft', 'dropbox', 'icloud'],
  salute: ['farmacia', 'farmaco', 'medico', 'ospedale', 'dentista', 'oculista', 'fisioterapia', 'palestra', 'gym'],
  svago: ['cinema', 'teatro', 'concerto', 'museo', 'biglietto', 'evento', 'playstation', 'xbox', 'steam', 'gaming'],
  viaggi: ['hotel', 'booking', 'airbnb', 'volo', 'ryanair', 'easyjet', 'alitalia', 'ita airways', 'aeroporto', 'agenzia viaggi'],
  animali: ['pet', 'veterinario', 'zooplus', 'arcaplanet'],
  varie: ['amazon', 'ebay', 'zalando', 'shein', 'aliexpress', 'bancomat', 'prelievo', 'bonifico'],
};

function suggestCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'varie';
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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    // Input validation: size limit (10MB max for base64)
    if (imageBase64.length > 10_000_000) {
      throw new Error("Image too large. Max 10MB allowed.");
    }

    // Input validation: basic format check (allow raw base64 or data URI)
    if (imageBase64.includes('data:') && !/^data:image\/(jpeg|jpg|png|gif|webp|heic|heif);base64,/i.test(imageBase64)) {
      throw new Error("Invalid image format. Supported: JPEG, PNG, GIF, WebP, HEIC.");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Processing bank statement with Gemini 2.5 Flash via Lovable AI...');
    console.log('Image base64 length:', imageBase64.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Sei un esperto nell'analizzare screenshot e PDF di estratti conto bancari italiani.
Estrai tutte le transazioni visibili nell'immagine.

Per ogni transazione, identifica:
- Data (formato YYYY-MM-DD)
- Descrizione/beneficiario
- Importo (numero positivo, senza simboli valuta)
- Tipo: "expense" per uscite/pagamenti, "income" per entrate/accrediti
- Nome merchant/esercente se identificabile

IMPORTANTE: Se ci sono più di 50 transazioni visibili, estrai solo le prime 50 in ordine cronologico.

Rispondi SEMPRE con un JSON valido in questo formato:
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "Pagamento POS Supermercato Carrefour",
      "amount": 45.50,
      "type": "expense",
      "merchant": "Carrefour"
    }
  ],
  "bankName": "Nome banca se identificabile",
  "accountInfo": "Ultime cifre conto se visibili"
}

Se non riesci a identificare transazioni, rispondi con:
{"transactions": [], "error": "Motivo"}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analizza questo screenshot/immagine di estratto conto bancario ed estrai tutte le transazioni visibili:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    console.log('Lovable AI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Troppe richieste. Attendi qualche secondo e riprova.',
          transactions: [] 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Crediti AI esauriti. Contatta il supporto.',
          transactions: [] 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Nessuna risposta dall\'AI');
    }

    console.log('AI Response length:', content.length);

    // Parse JSON response
    let parsed;
    try {
      let jsonStr = content;
      // Handle markdown code blocks if present
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content preview:', content.substring(0, 500));
      // Attempt to fix truncated JSON
      try {
        let fixed = content;
        fixed = fixed.replace(/,\s*$/, '');
        if (!fixed.includes('"transactions"')) {
          throw new Error('JSON non contiene transactions');
        }
        if (fixed.lastIndexOf('[') > fixed.lastIndexOf(']')) {
          fixed += ']}';
        } else if (fixed.lastIndexOf('{') > fixed.lastIndexOf('}')) {
          fixed += '}';
        }
        parsed = JSON.parse(fixed);
        console.log('JSON fixed successfully');
      } catch (fixError) {
        console.error('JSON fix failed:', fixError);
        throw new Error('Formato risposta non valido - riprova con un\'immagine più chiara');
      }
    }

    // Add suggested categories to transactions
    const transactions: Transaction[] = (parsed.transactions || []).map((t: any) => ({
      date: t.date || new Date().toISOString().split('T')[0],
      description: t.description || 'Transazione',
      amount: Math.abs(Number(t.amount) || 0),
      type: t.type === 'income' ? 'income' : 'expense',
      merchant: t.merchant,
      suggestedCategory: suggestCategory(t.description || t.merchant || ''),
    }));

    console.log('Parsed transactions:', transactions.length);

    return new Response(JSON.stringify({
      transactions,
      bankName: parsed.bankName,
      accountInfo: parsed.accountInfo,
      error: parsed.error,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OCR Bank Statement error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Errore durante l\'analisi',
        transactions: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
