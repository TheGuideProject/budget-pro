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
}

// Category keywords for auto-categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cibo: ['supermercato', 'carrefour', 'conad', 'coop', 'esselunga', 'lidl', 'eurospin', 'ristorante', 'pizzeria', 'bar', 'caffè', 'mcdonald', 'burger', 'deliveroo', 'glovo', 'just eat', 'uber eats'],
  trasporti: ['benzina', 'eni', 'q8', 'ip', 'tamoil', 'autostrada', 'telepass', 'trenitalia', 'italo', 'atm', 'metro', 'autobus', 'taxi', 'uber', 'bolt', 'parking', 'parcheggio'],
  casa: ['affitto', 'mutuo', 'condominio', 'ikea', 'leroy merlin', 'bricofer', 'enel', 'eni gas', 'a2a', 'hera', 'acquedotto'],
  abbonamenti: ['netflix', 'spotify', 'amazon prime', 'disney', 'dazn', 'tim', 'vodafone', 'wind', 'iliad', 'fastweb', 'sky', 'now tv', 'apple', 'google', 'microsoft'],
  salute: ['farmacia', 'parafarmacia', 'medico', 'dentista', 'ospedale', 'clinica', 'analisi', 'visita'],
  svago: ['cinema', 'teatro', 'concerto', 'palestra', 'sport', 'amazon', 'zalando', 'shein', 'aliexpress'],
  viaggi: ['hotel', 'booking', 'airbnb', 'ryanair', 'easyjet', 'alitalia', 'aeroporto', 'volo'],
  animali: ['veterinario', 'pet', 'arcaplanet', 'zooplus'],
};

function suggestCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      return category;
    }
  }
  
  return 'varie';
}

function detectBankFormat(content: string, fileName: string): string {
  const lowerContent = content.toLowerCase();
  const lowerName = fileName.toLowerCase();
  
  if (lowerContent.includes('intesa') || lowerName.includes('intesa')) return 'intesa';
  if (lowerContent.includes('unicredit') || lowerName.includes('unicredit')) return 'unicredit';
  if (lowerContent.includes('fineco') || lowerName.includes('fineco')) return 'fineco';
  if (lowerContent.includes('n26') || lowerName.includes('n26')) return 'n26';
  if (lowerContent.includes('revolut') || lowerName.includes('revolut')) return 'revolut';
  if (lowerContent.includes('widiba') || lowerName.includes('widiba')) return 'widiba';
  
  return 'generic';
}

function parseCSV(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  });
}

function parseAmount(value: string): number {
  if (!value) return 0;
  
  // Handle European format (1.234,56) and US format (1,234.56)
  let cleaned = value.replace(/[€$\s]/g, '').trim();
  
  // If comma is last decimal separator (European)
  if (/,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  
  return parseFloat(cleaned) || 0;
}

function parseDate(value: string): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  // Try various date formats
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
  ];
  
  for (const fmt of formats) {
    const match = value.match(fmt);
    if (match) {
      if (fmt === formats[2]) {
        // YYYY-MM-DD
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      // European format DD/MM/YYYY
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  
  return new Date().toISOString().split('T')[0];
}

function parseTransactions(rows: string[][], format: string): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Skip header row(s)
  let startIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const hasDate = row.some(cell => /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4}/.test(cell));
    if (hasDate) {
      startIdx = i;
      break;
    }
    startIdx = i + 1;
  }
  
  // Detect column indices based on format
  let dateIdx = 0;
  let descIdx = 1;
  let amountIdx = 2;
  let creditIdx = -1;
  let debitIdx = -1;
  
  // Try to detect columns from header
  if (startIdx > 0) {
    const header = rows[startIdx - 1].map(h => h.toLowerCase());
    
    dateIdx = header.findIndex(h => h.includes('data') || h.includes('date'));
    descIdx = header.findIndex(h => h.includes('descrizione') || h.includes('description') || h.includes('causale'));
    
    const importoIdx = header.findIndex(h => h.includes('importo') || h.includes('amount'));
    creditIdx = header.findIndex(h => h.includes('avere') || h.includes('credit') || h.includes('entrate'));
    debitIdx = header.findIndex(h => h.includes('dare') || h.includes('debit') || h.includes('uscite'));
    
    if (importoIdx >= 0) amountIdx = importoIdx;
    
    // Use defaults if not found
    if (dateIdx < 0) dateIdx = 0;
    if (descIdx < 0) descIdx = 1;
    if (amountIdx < 0) amountIdx = 2;
  }
  
  // Parse data rows
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;
    
    const date = parseDate(row[dateIdx] || '');
    const description = row[descIdx] || 'Transazione';
    
    let amount: number;
    if (creditIdx >= 0 && debitIdx >= 0) {
      // Separate credit/debit columns
      const credit = parseAmount(row[creditIdx] || '');
      const debit = parseAmount(row[debitIdx] || '');
      amount = credit > 0 ? credit : -debit;
    } else {
      amount = parseAmount(row[amountIdx] || '');
    }
    
    if (amount === 0) continue;
    
    transactions.push({
      date,
      description: description.substring(0, 200),
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
      suggestedCategory: suggestCategory(description),
    });
  }
  
  return transactions;
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
    const { csvContent, fileName } = await req.json();
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: 'Contenuto CSV mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const format = detectBankFormat(csvContent, fileName || '');
    const rows = parseCSV(csvContent);
    const transactions = parseTransactions(rows, format);

    const bankNames: Record<string, string> = {
      intesa: 'Intesa Sanpaolo',
      unicredit: 'UniCredit',
      fineco: 'Fineco',
      n26: 'N26',
      revolut: 'Revolut',
      widiba: 'Widiba',
      generic: 'Formato generico',
    };

    return new Response(
      JSON.stringify({
        transactions,
        bankName: bankNames[format] || 'Formato generico',
        totalRows: rows.length,
        parsedCount: transactions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Parse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore durante il parsing';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
