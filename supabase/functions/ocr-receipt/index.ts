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

// Currency symbols and codes mapping
const CURRENCY_PATTERNS: Record<string, string> = {
  '€': 'EUR',
  '$': 'USD',
  '£': 'GBP',
  '¥': 'JPY',
  'CHF': 'CHF',
  'Fr.': 'CHF',
  'fr.': 'CHF',
  'USD': 'USD',
  'EUR': 'EUR',
  'GBP': 'GBP',
  'JPY': 'JPY',
  'CAD': 'CAD',
  'AUD': 'AUD',
  'PLN': 'PLN',
  'zł': 'PLN',
  'CZK': 'CZK',
  'Kč': 'CZK',
  'HUF': 'HUF',
  'Ft': 'HUF',
  'SEK': 'SEK',
  'kr': 'SEK',
  'NOK': 'NOK',
  'DKK': 'DKK',
  'RON': 'RON',
  'lei': 'RON',
  'BGN': 'BGN',
  'лв': 'BGN',
  'HRK': 'HRK',
  'kn': 'HRK',
  'TRY': 'TRY',
  '₺': 'TRY',
};

// Fetch exchange rate from free API
async function getExchangeRate(fromCurrency: string): Promise<number | null> {
  if (fromCurrency === 'EUR') return 1;
  
  try {
    // Using exchangerate-api.com free tier (no API key needed for basic usage)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    
    if (!response.ok) {
      console.error('Exchange rate API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.rates?.EUR || null;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error("No image provided");
    }

    // Input validation: size limit (10MB max for base64)
    if (imageBase64.length > 10_000_000) {
      throw new Error("Image too large. Max 10MB allowed.");
    }

    // Input validation: format check
    if (!/^data:image\/(jpeg|jpg|png|gif|webp|heic|heif);base64,/i.test(imageBase64)) {
      throw new Error("Invalid image format. Supported: JPEG, PNG, GIF, WebP, HEIC.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          {
            role: "system",
            content: `Sei un assistente che estrae informazioni da scontrini e ricevute.
Analizza l'immagine e restituisci SOLO un JSON valido con questa struttura:
{
  "items": [
    {
      "description": "descrizione della spesa",
      "amount": numero (importo nella valuta originale),
      "category": "categoria appropriata"
    }
  ],
  "total": numero (totale nella valuta originale),
  "date": "data se visibile nel formato YYYY-MM-DD",
  "currency": "codice valuta (EUR, USD, GBP, CHF, etc.)",
  "currencySymbol": "simbolo valuta originale (€, $, £, etc.)"
}

IMPORTANTE per la valuta:
- Identifica la valuta dallo scontrino (simboli, codici, paese)
- Se non riesci a identificarla, usa "EUR" come default
- Riporta gli importi esattamente come sono sullo scontrino

Categorie disponibili (usa SOLO queste):
- "cibo": supermercati, ristoranti, bar, alimentari, delivery
- "casa": arredamento, manutenzione casa, detersivi, oggettistica
- "salute": farmacie, visite mediche, medicine, dentista
- "trasporti": benzina, parcheggi, pedaggi, mezzi pubblici, taxi
- "svago": cinema, sport, giochi, hobbies, intrattenimento
- "abbonamenti": Netflix, Spotify, palestra, riviste, servizi online
- "animali": cibo per animali, veterinario, accessori animali
- "viaggi": hotel, voli, vacanze, escursioni
- "fissa": bollette, affitto, utenze, tasse
- "variabile": acquisti vari non categorizzabili altrove
- "carta_credito": usa solo se esplicitamente pagato con carta credito
- "varie": tutto ciò che non rientra nelle altre categorie

=== REGOLE DI CATEGORIZZAZIONE DETTAGLIATE ===

** CATEGORIA "animali" - VERIFICA SEMPRE PRIMA! PRIORITÀ ALTA **
Keywords: pet, petshop, pet shop, negozio animali, animali, zoo, zootecnica, mangimi, crocchette, cibo animali, cani, gatti, toelettatura, pet care, petfood, pet food, veterinario
Brand PETSHOP: Arcaplanet, Arca Planet, Isola dei Tesori, Petmark, Animali che Passione, Elite Pet, Petstore, Pet Store, Zooplus
IMPORTANTE - Brand IBRIDI (supermercato con pet corner) → USA "animali":
- "Petstore Conad" → animali (NON cibo!)
- "Amici di Casa Coop" → animali (NON cibo!)
- Se lo scontrino contiene "PET", "ANIMALI", "CROCCHETTE", "CANI", "GATTI" → usa "animali"

** CATEGORIA "cibo" - Supermercati e GDO **
Keywords: supermercato, ipermercato, market, mini market, minimarket, alimentari, grocery, food, spesa, discount, cash&carry, gdo
Brand GDO: Conad, Superconad, Iperconad, City Conad, Coop, Coop Italia, Coop Alleanza, Ipercoop, Esselunga, Carrefour, Carrefour Market, Carrefour Express, Despar, Eurospar, Interspar, Pam, Superpam, Panorama, Crai, Crai Extra, Sigma, Super Sigma, Bennet, Il Gigante, Famila, A&O, Alì, Decò, Sì Con Te, Tigros, Iperal, MD Market
Brand DISCOUNT: Lidl, Eurospin, Aldi, Penny, Penny Market, MD, MD Discount, Todis, Dpiu, D+
NOTA: Se lo scontrino è di Conad/Coop MA contiene prodotti per animali → verifica se è un Petstore Conad o Amici di Casa Coop

** ALTRE CATEGORIE **
- Farmacia, Parafarmacia, Lloyds Farmacia = "salute"
- Ikea, Leroy Merlin, Brico, Bricocenter = "casa"
- Eni, Q8, IP, Tamoil, Autostrada = "trasporti"
- Amazon, Mediaworld = valuta dal contenuto dello scontrino

Se non riesci a estrarre informazioni, restituisci: {"items": [], "error": "descrizione errore"}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Estrai le informazioni di spesa da questa immagine/scontrino, identificando anche la valuta:"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let parsedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      parsedData = { items: [], error: "Impossibile estrarre dati dall'immagine" };
    }

    // Process currency conversion if needed
    const detectedCurrency = parsedData.currency || 'EUR';
    
    if (detectedCurrency !== 'EUR' && parsedData.total) {
      console.log(`Detected currency: ${detectedCurrency}, fetching exchange rate...`);
      
      const exchangeRate = await getExchangeRate(detectedCurrency);
      
      if (exchangeRate) {
        console.log(`Exchange rate ${detectedCurrency} -> EUR: ${exchangeRate}`);
        
        // Add conversion info to response
        parsedData.originalCurrency = detectedCurrency;
        parsedData.originalCurrencySymbol = parsedData.currencySymbol || detectedCurrency;
        parsedData.originalTotal = parsedData.total;
        parsedData.exchangeRate = exchangeRate;
        parsedData.convertedTotal = Math.round(parsedData.total * exchangeRate * 100) / 100;
        
        // Also convert items
        if (parsedData.items?.length > 0) {
          parsedData.originalItems = [...parsedData.items];
          parsedData.items = parsedData.items.map((item: { amount: number; description: string; category: string }) => ({
            ...item,
            originalAmount: item.amount,
            amount: Math.round(item.amount * exchangeRate * 100) / 100,
          }));
        }
        
        // Update total to converted value
        parsedData.total = parsedData.convertedTotal;
      } else {
        console.log('Could not fetch exchange rate, keeping original values');
        parsedData.currencyWarning = `Impossibile convertire da ${detectedCurrency} a EUR. Importi in valuta originale.`;
      }
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("OCR error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
