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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const { user, error: authError } = await authenticateRequest(req);
  if (authError) return authError;
  console.log('Authenticated user:', user.id);

  try {
    const { imageBase64, fileType, extractMode } = await req.json();
    
    if (!imageBase64) {
      throw new Error("No file provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing invoice OCR request, fileType:", fileType, "mode:", extractMode || 'full');

    // Build prompt based on extraction mode
    let systemPrompt = `Sei un assistente che estrae informazioni da fatture.
Analizza l'immagine della fattura e restituisci SOLO un JSON valido con questa struttura:
{
  // DATI MITTENTE (chi ha emesso la fattura)
  "senderName": "ragione sociale/nome del mittente che ha emesso la fattura",
  "senderAddress": "indirizzo completo del mittente",
  "senderVat": "P.IVA del mittente",
  "senderIban": "IBAN del mittente (cerca nella sezione pagamento/bank details)",
  "senderBic": "BIC/SWIFT del mittente",
  "senderBankAddress": "nome banca e indirizzo del mittente",
  "senderEmail": "email del mittente se presente",
  
  // DATI CLIENTE/DESTINATARIO
  "clientName": "nome cliente/azienda destinataria",
  "clientAddress": "indirizzo cliente",
  "clientVat": "P.IVA o codice fiscale cliente",
  "clientEmail": "email cliente se presente",
  
  // DATI FATTURA
  "invoiceNumber": "numero fattura",
  "projectName": "descrizione progetto/servizio",
  "invoiceDate": "data fattura in formato YYYY-MM-DD",
  "dueDate": "data scadenza pagamento in formato YYYY-MM-DD",
  "workStartDate": "data inizio lavori in formato YYYY-MM-DD (estrai dal testo se presente, es. 'dal 15/01/2024')",
  "workEndDate": "data fine lavori in formato YYYY-MM-DD (estrai dal testo se presente, es. 'al 20/01/2024')",
  "paymentDays": numero giorni di pagamento (0=immediato, 15, 30, 60, 90 - calcola dalla differenza tra dueDate e invoiceDate),
  "isPaid": boolean (true se la fattura ha scritto PAID, PAGATA, PAGATO o simili ben visibili),
  "status": "pagata" se isPaid è true, altrimenti "inviata",
  "items": [
    {
      "quantity": numero (spesso sono i giorni lavorati),
      "description": "descrizione voce",
      "unitPrice": numero (prezzo unitario/giornaliero),
      "amount": numero (totale voce, può essere negativo per anticipi/sconti)
    }
  ],
  "totalAmount": numero (totale fattura),
  "paidAmount": numero (se isPaid è true E il totale è visibile, metti il totale; se ci sono anticipi parziali metti solo quelli; altrimenti 0)
}

REGOLE CRITICHE:
1. DATI MITTENTE: Estrai attentamente i dati di chi ha EMESSO la fattura (sezione in alto, spesso con logo). Include IBAN, BIC, nome banca.
2. DATI CLIENTE: Estrai i dati del DESTINATARIO della fattura (sezione "Bill To", "Fattura a", "Cliente").
3. STATO PAGATA: Se vedi scritto "PAID", "PAGATA", "PAGATO", "SALDATO" o simili sulla fattura, imposta isPaid=true, status="pagata" e paidAmount=totalAmount
4. DATE CORRETTE: Usa le date ESATTE che vedi sulla fattura, non inventare date. invoiceDate è la data di emissione, dueDate è la scadenza
5. IBAN: Cerca attentamente nella sezione "Payment Details", "Bank Details", "Coordinate Bancarie" - l'IBAN inizia con due lettere (IT, DE, FR, etc.)
6. Se alcuni campi non sono visibili, lascia una stringa vuota o 0 per i numeri

Se non riesci a estrarre informazioni, restituisci: {"error": "descrizione errore"}`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Estrai le informazioni da questa fattura, inclusi i dati bancari del mittente (IBAN, BIC, banca):"
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64
            }
          }
        ]
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
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

    console.log("AI response received:", content?.substring(0, 300));

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
      parsedData = { error: "Impossibile estrarre dati dalla fattura" };
    }

    console.log("Parsed invoice data:", JSON.stringify(parsedData).substring(0, 300));

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Invoice OCR error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
