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

// NEW MODERN CATEGORIES
const EXPENSE_CATEGORIES = [
  'casa_utenze',
  'alimentari',
  'ristorazione',
  'trasporti',
  'auto_veicoli',
  'animali',
  'persona_cura',
  'salute',
  'tempo_libero',
  'sport_benessere',
  'viaggi',
  'tecnologia',
  'lavoro_formazione',
  'finanza_obblighi',
  'abbonamenti_servizi',
  'regali_donazioni',
  'extra_imprevisti',
  'altro'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('No text provided');
    }

    // Input validation: size limit (10KB max for text)
    if (text.length > 10_000) {
      throw new Error("Text too long. Max 10,000 characters allowed.");
    }

    // Input validation: must be a string
    if (typeof text !== 'string') {
      throw new Error("Invalid input: text must be a string.");
    }

    console.log('Parsing expense from text:', text);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const systemPrompt = `Sei un assistente che estrae informazioni sulle spese da frasi in italiano.
Estrai: importo, descrizione, categoria, data.

=== CATEGORIE VALIDE ===
${EXPENSE_CATEGORIES.join(', ')}

=== REGOLE DI CATEGORIZZAZIONE COMPLETE ===

** CATEGORIA: casa_utenze **
KEYWORDS: affitto, locazione, canone, condominio, spese condominiali, utenze, bolletta, bollette, energia, luce, gas, acqua, elettricità, enel, eni, hera, acea, iren, a2a, internet casa, fibra, adsl, tim casa, fastweb casa, vodafone casa, windtre casa, riscaldamento, caldaia, manutenzione casa, idraulico, elettricista, ikea, leroy merlin, brico

** CATEGORIA: alimentari **
KEYWORDS: supermercato, ipermercato, market, mini market, minimarket, alimentari, grocery, food, spesa, discount, conad, coop, esselunga, carrefour, despar, pam, crai, sigma, bennet, famila, lidl, eurospin, aldi, penny, md, todis, forno, panificio, macelleria, pescheria, ortofrutta, salumeria

** CATEGORIA: ristorazione **
KEYWORDS: bar, ristorante, trattoria, osteria, pizzeria, pizza, pub, tavola calda, ristobar, caffè, coffee, espresso, gelateria, pasticceria, bakery, bistrot, asporto, takeaway, delivery, just eat, deliveroo, glovo, aperitivo, pranzo fuori, cena fuori, mcdonald, burger king

** CATEGORIA: trasporti **
KEYWORDS: trasporti, mezzi pubblici, bus, autobus, metro, metropolitana, tram, treno, trenitalia, italo, biglietto, abbonamento mezzi, taxi, ncc, uber, free now, car sharing, enjoy, share now

** CATEGORIA: auto_veicoli **
KEYWORDS: auto, veicolo, benzina, gasolio, diesel, gpl, metano, rifornimento, distributore, q8, eni station, esso, shell, tamoil, bollo auto, assicurazione auto, rc auto, officina, meccanico, tagliando, revisione, autolavaggio, gommista, autostrada, telepass, pedaggio

** CATEGORIA: animali **
KEYWORDS: pet, petshop, pet shop, animali, cani, gatti, pet food, crocchette, mangimi, arcaplanet, isola dei tesori, petmark, animali che passione, veterinario, clinica veterinaria, ambulatorio veterinario, toelettatura, petstore conad, amici di casa coop

** CATEGORIA: persona_cura **
KEYWORDS: abbigliamento, vestiti, scarpe, calzature, boutique, negozio abbigliamento, intimo, cosmetici, beauty, profumeria, sephora, douglas, trucco, make up, parrucchiere, barbiere, estetista, zara, h&m, primark, ovs, benetton

** CATEGORIA: salute **
KEYWORDS: farmacia, parafarmacia, medicinali, farmaco, ticket, visita medica, specialista, analisi, laboratorio analisi, clinica, ospedale, dentista, odontoiatra, fisioterapia, psicologo, lloyds farmacia

** CATEGORIA: tempo_libero **
KEYWORDS: cinema, teatro, concerto, spettacolo, eventi, videogiochi, gaming, steam, playstation, xbox, nintendo, libri, libreria, fumetti, hobby, amazon (non tech)

** CATEGORIA: sport_benessere **
KEYWORDS: palestra, fitness, abbonamento palestra, personal trainer, crossfit, yoga, pilates, nuoto, piscina, arti marziali, sport, benessere, spa, massaggi, decathlon

** CATEGORIA: viaggi **
KEYWORDS: viaggio, voli, aereo, biglietto aereo, ryanair, easyjet, ita airways, hotel, albergo, booking, airbnb, ostello, resort, agenzia viaggi, noleggio auto, vacanza

** CATEGORIA: tecnologia **
KEYWORDS: tecnologia, elettronica, informatica, pc, computer, notebook, laptop, smartphone, tablet, accessori tech, amazon tech, mediaworld, unieuro, eprice, apple, samsung, iphone, monitor, tastiera, mouse, cuffie, auricolari

** CATEGORIA: lavoro_formazione **
KEYWORDS: lavoro, formazione, corso, master, training, certificazione, software, licenza, abbonamento software, saas, cloud, openai, github, notion, office, fattura, udemy, coursera

** CATEGORIA: finanza_obblighi **
KEYWORDS: tasse, imposte, f24, agenzia entrate, inps, inail, commissioni, banca, interessi, spese bancarie, canone conto, mav, rav, sanzione, commercialista

** CATEGORIA: abbonamenti_servizi **
KEYWORDS: abbonamento, subscription, netflix, spotify, prime video, amazon prime, disney plus, icloud, google one, telefonia, cellulare, tim, vodafone, windtre, fastweb, dazn, now tv, apple music

** CATEGORIA: regali_donazioni **
KEYWORDS: regalo, regali, donazione, beneficenza, charity, onlus, crowdfunding, gift, buono regalo, compleanno regalo

** CATEGORIA: extra_imprevisti **
KEYWORDS: multa, sanzione, penale, urgenza, emergenza, riparazione urgente, spesa imprevista

** CATEGORIA: altro **
KEYWORDS: varie, misc, generico, unknown, non classificato, altro

=== REGOLE DI PRIORITÀ ===

1. Se contiene "PET", "ANIMALI", "CROCCHETTE", "VETERINARIO", "ARCAPLANET", "PETSTORE" → animali
2. Se contiene "PC", "COMPUTER", "LAPTOP", "NOTEBOOK", "SMARTPHONE", "IPHONE", "MEDIAWORLD", "UNIEURO" → tecnologia
3. Se contiene "BAR", "CAFFÈ", "RISTORANTE", "PIZZERIA", "APERITIVO", "PRANZO", "CENA" → ristorazione
4. Se contiene "SUPERMERCATO", "CONAD", "COOP", "ESSELUNGA", "LIDL", "EUROSPIN" (senza PET) → alimentari
5. Se contiene "BENZINA", "Q8", "ENI", "AUTOSTRADA", "TELEPASS" → auto_veicoli
6. Se contiene "FARMACIA", "MEDICO", "DENTISTA" → salute
7. Se contiene "NETFLIX", "SPOTIFY", "TIM", "VODAFONE", "ABBONAMENTO" → abbonamenti_servizi
8. Se contiene "ZARA", "H&M", "VESTITI", "SCARPE", "PARRUCCHIERE" → persona_cura
9. Se contiene "PALESTRA", "FITNESS", "DECATHLON" → sport_benessere
10. Se contiene "HOTEL", "VOLO", "RYANAIR", "BOOKING", "AIRBNB" → viaggi

=== REGOLE PER LA DATA ===
- "oggi" = ${today}
- "ieri" = ${yesterday}
- "l'altro ieri" = 2 giorni fa
- se non specificata, usa oggi: ${today}

Rispondi SOLO tramite la function call extract_expense.`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_expense',
              description: 'Extract expense information from text',
              parameters: {
                type: 'object',
                properties: {
                  amount: { 
                    type: 'number',
                    description: 'The expense amount in euros'
                  },
                  description: { 
                    type: 'string',
                    description: 'Brief description of the expense (max 3-4 words)'
                  },
                  category: { 
                    type: 'string',
                    enum: EXPENSE_CATEGORIES,
                    description: 'Category of the expense - use the modern category names'
                  },
                  date: { 
                    type: 'string',
                    description: 'Date in YYYY-MM-DD format'
                  }
                },
                required: ['amount', 'description', 'category', 'date'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_expense' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract the function call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const expense = JSON.parse(toolCall.function.arguments);
    console.log('Parsed expense:', expense);

    return new Response(
      JSON.stringify({ expense }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Parse expense error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
