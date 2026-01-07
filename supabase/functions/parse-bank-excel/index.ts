import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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

function detectBankFormat(content: string[][], fileName: string): string {
  const lowerName = fileName.toLowerCase();
  const flatContent = content.flat().join(' ').toLowerCase();
  
  if (flatContent.includes('bbva') || lowerName.includes('bbva')) return 'bbva';
  if (flatContent.includes('intesa') || lowerName.includes('intesa')) return 'intesa';
  if (flatContent.includes('unicredit') || lowerName.includes('unicredit')) return 'unicredit';
  if (flatContent.includes('fineco') || lowerName.includes('fineco')) return 'fineco';
  if (flatContent.includes('n26') || lowerName.includes('n26')) return 'n26';
  if (flatContent.includes('revolut') || lowerName.includes('revolut')) return 'revolut';
  if (flatContent.includes('widiba') || lowerName.includes('widiba')) return 'widiba';
  
  return 'generic';
}

function parseExcelDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  // If it's already a string in date format
  if (typeof value === 'string') {
    // Try DD/MM/YYYY format
    const match = value.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month}-${day}`;
    }
    
    // Try YYYY-MM-DD format
    const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return value;
    }
  }
  
  // If it's an Excel serial date number
  if (typeof value === 'number') {
    // Excel dates are days since 1899-12-30
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
}

function parseAmount(value: any): number {
  if (!value) return 0;
  
  if (typeof value === 'number') {
    return value;
  }
  
  // Handle string amounts
  let cleaned = String(value).replace(/[€$\s]/g, '').trim();
  
  // If comma is last decimal separator (European format)
  if (/,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  
  return parseFloat(cleaned) || 0;
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
    const { excelBase64, fileName } = await req.json();
    
    if (!excelBase64) {
      return new Response(
        JSON.stringify({ error: 'File Excel mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing Excel file:', fileName);
    
    // Decode base64 to binary
    const binaryString = atob(excelBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Parse Excel file
    const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to 2D array
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
    
    console.log('Excel parsed, rows:', rows.length);
    
    // Detect bank format
    const bankFormat = detectBankFormat(rows.map(r => r.map(c => String(c || ''))), fileName || '');
    
    // Find header row and column indices
    let startIdx = 0;
    let dateIdx = -1;
    let dateValutaIdx = -1;
    let descIdx = -1;
    let conceptIdx = -1;  // For BBVA "Concetto"
    let movementIdx = -1; // For BBVA "Movimento"
    let amountIdx = -1;
    let creditIdx = -1;
    let debitIdx = -1;
    
    // Look for header row in first 10 rows
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i] || [];
      const lowerRow = row.map(c => String(c || '').toLowerCase().trim());
      
      console.log('Checking row', i, 'headers:', lowerRow.join(' | '));
      
      // Check if this looks like a header row - expanded keywords
      const hasDateHeader = lowerRow.some(h => 
        h.includes('data') || h.includes('date') || h.includes('valuta') || 
        h.includes('contabile') || h.includes('operazione')
      );
      const hasDescHeader = lowerRow.some(h => 
        h.includes('descrizione') || h.includes('description') || h.includes('causale') || 
        h.includes('beneficiario') || h.includes('moviment') || h.includes('dettagl') ||
        h.includes('operazione') || h.includes('concetto')
      );
      
      if (hasDateHeader || hasDescHeader) {
        startIdx = i + 1;
        
        // Date column - prefer "Data" over "Data valuta"
        // First look for exact "data" (not "data valuta")
        dateIdx = lowerRow.findIndex(h => 
          (h === 'data' || h === 'date' || h.includes('contabile'))
        );
        // Then look for "data valuta" as fallback
        dateValutaIdx = lowerRow.findIndex(h => 
          h.includes('valuta') || h === 'data valuta'
        );
        // If no exact "data" found, use first date-like column that's not "data valuta"
        if (dateIdx < 0) {
          dateIdx = lowerRow.findIndex((h, idx) => 
            (h.includes('data') || h.includes('date')) && idx !== dateValutaIdx
          );
        }
        // Ultimate fallback to data valuta
        if (dateIdx < 0 && dateValutaIdx >= 0) {
          dateIdx = dateValutaIdx;
        }
        
        // BBVA specific: "Concetto" and "Movimento" columns
        conceptIdx = lowerRow.findIndex(h => h === 'concetto' || h === 'concept');
        movementIdx = lowerRow.findIndex(h => h === 'movimento' || h === 'movement');
        
        // Description column - expanded keywords
        descIdx = lowerRow.findIndex(h => 
          h.includes('descrizione') || h.includes('description') || h.includes('causale') || 
          h.includes('beneficiario') || h.includes('dettagl')
        );
        
        // If BBVA format with concetto/movimento, don't override descIdx if those are found
        if (descIdx < 0 && conceptIdx >= 0) {
          descIdx = conceptIdx;
        }
        
        // Amount column - expanded keywords (check for "importo" specifically)
        amountIdx = lowerRow.findIndex(h => 
          h === 'importo' || h === 'amount' || h.includes('euro') || h === 'importe'
        );
        
        // Credit column (income) - expanded keywords
        creditIdx = lowerRow.findIndex(h => 
          h.includes('avere') || h.includes('credit') || h.includes('entrat') || 
          h.includes('accredit') || (h === '+')
        );
        
        // Debit column (expense) - expanded keywords
        debitIdx = lowerRow.findIndex(h => 
          h.includes('dare') || h.includes('debit') || h.includes('uscit') || 
          h.includes('addebit') || (h === '-')
        );
        
        // Fix: if credit and debit point to same column, reset them
        if (creditIdx === debitIdx && creditIdx >= 0) {
          console.log('Credit and debit are same column, resetting');
          creditIdx = -1;
          debitIdx = -1;
        }
        
        // Fallback: if no description found, try column after date
        if (descIdx < 0 && dateIdx >= 0 && dateIdx + 1 < lowerRow.length) {
          descIdx = dateIdx + 1;
          console.log('Using fallback descIdx:', descIdx);
        }
        
        console.log('Header found at row', i, { dateIdx, dateValutaIdx, descIdx, conceptIdx, movementIdx, amountIdx, creditIdx, debitIdx });
        break;
      }
    }
    
    // If no header found, try to auto-detect from first data row
    if (dateIdx < 0) {
      console.log('No header found, trying auto-detection...');
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i] || [];
        
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          // Check if cell looks like a date
          if (typeof cell === 'number' && cell > 30000 && cell < 50000) {
            dateIdx = j;
            break;
          }
          if (typeof cell === 'string' && /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(cell)) {
            dateIdx = j;
            break;
          }
        }
        
        if (dateIdx >= 0) {
          startIdx = i;
          break;
        }
      }
      
      // Default indices if not found
      if (dateIdx < 0) dateIdx = 0;
      if (descIdx < 0) descIdx = 1;
    }
    
    // Fallback: find first numeric column for amount if not set
    if (amountIdx < 0 && creditIdx < 0 && debitIdx < 0) {
      const sampleRow = rows[startIdx] || [];
      for (let j = 0; j < sampleRow.length; j++) {
        if (j === dateIdx || j === descIdx) continue;
        const cell = sampleRow[j];
        const cellStr = String(cell || '');
        // Check if looks like money
        if (typeof cell === 'number' || /^-?[\d.,]+$/.test(cellStr.replace(/[€$\s]/g, ''))) {
          amountIdx = j;
          console.log('Auto-detected amount column at', j);
          break;
        }
      }
      if (amountIdx < 0) amountIdx = 2; // last resort default
    }
    
    console.log('Parsing from row', startIdx, 'with indices:', { dateIdx, descIdx, amountIdx, creditIdx, debitIdx });
    
    // Parse transactions
    const transactions: Transaction[] = [];
    
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.length < 2) continue;
      
      const dateValue = row[dateIdx >= 0 ? dateIdx : 0];
      const date = parseExcelDate(dateValue);
      
      // Get description - handle BBVA format with Concetto + Movimento
      let description = '';
      
      // BBVA specific: combine Concetto and Movimento
      if (conceptIdx >= 0 || movementIdx >= 0) {
        const concept = conceptIdx >= 0 ? String(row[conceptIdx] || '').trim() : '';
        const movement = movementIdx >= 0 ? String(row[movementIdx] || '').trim() : '';
        
        if (concept && movement) {
          description = `${concept} - ${movement}`;
        } else {
          description = concept || movement;
        }
      }
      
      // Fallback to standard description column
      if (!description && descIdx >= 0) {
        description = String(row[descIdx] || '').trim();
      }
      
      // Try to find any text cell that looks like a description
      if (!description) {
        for (let j = 0; j < row.length; j++) {
          if (j === dateIdx || j === amountIdx || j === creditIdx || j === debitIdx) continue;
          const cell = String(row[j] || '').trim();
          if (cell.length > 3 && !/^\d+[,.]?\d*$/.test(cell)) {
            description = cell;
            break;
          }
        }
      }
      if (!description) description = 'Transazione';
      
      // Calculate amount
      let amount: number;
      let type: 'income' | 'expense';
      
      if (creditIdx >= 0 || debitIdx >= 0) {
        const credit = parseAmount(row[creditIdx >= 0 ? creditIdx : -1]);
        const debit = parseAmount(row[debitIdx >= 0 ? debitIdx : -1]);
        
        if (Math.abs(credit) > 0.01) {
          amount = Math.abs(credit);
          type = 'income';
        } else if (Math.abs(debit) > 0.01) {
          amount = Math.abs(debit);
          type = 'expense';
        } else {
          continue; // Skip rows with no amount
        }
      } else if (amountIdx >= 0) {
        const rawAmount = parseAmount(row[amountIdx]);
        amount = Math.abs(rawAmount);
        type = rawAmount < 0 ? 'expense' : 'income';
      } else {
        continue;
      }
      
      if (amount < 0.01) continue;
      
      transactions.push({
        date,
        description: description.substring(0, 200),
        amount,
        type,
        suggestedCategory: suggestCategory(description),
      });
    }

    console.log('Parsed transactions:', transactions.length);

    const bankNames: Record<string, string> = {
      bbva: 'BBVA',
      intesa: 'Intesa Sanpaolo',
      unicredit: 'UniCredit',
      fineco: 'Fineco',
      n26: 'N26',
      revolut: 'Revolut',
      widiba: 'Widiba',
      generic: 'File Excel',
    };

    return new Response(
      JSON.stringify({
        transactions,
        bankName: bankNames[bankFormat] || 'File Excel',
        totalRows: rows.length,
        parsedCount: transactions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Excel parse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore durante il parsing del file Excel';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
