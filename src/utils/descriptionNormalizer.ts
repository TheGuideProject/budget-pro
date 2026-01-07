/**
 * Normalizza una descrizione di spesa per il matching
 * Rimuove parti variabili come date, numeri carta, ID transazione
 */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .trim()
    // Rimuovi riferimenti geografici comuni
    .replace(/\b(genova|roma|milano|torino|napoli|bologna|firenze|venezia|palermo|bari)\s*(it|italy)?\b/gi, '')
    // Rimuovi numeri carta
    .replace(/carta\s*n\.?\s*\*+\s*\d+/gi, '')
    // Rimuovi date operazione
    .replace(/data\s*operazione\s*\d{1,2}\/\d{1,2}\/\d{2,4}/gi, '')
    // Rimuovi codici transazione lunghi
    .replace(/\b[a-z0-9]{8,}\b/gi, '')
    // Rimuovi spazi multipli
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Estrae il nome dell'esercente da una descrizione
 * Utile per creare regole di matching
 */
export function extractMerchantName(description: string): string {
  const normalized = normalizeDescription(description);
  
  // Split su separatori comuni e prendi la prima parte significativa
  const parts = normalized.split(/\s*[-|\/]\s*/);
  const firstPart = parts[0]?.trim() || normalized;
  
  // Rimuovi numeri finali (spesso ID)
  return firstPart.replace(/\s*\d+\s*$/, '').trim();
}

/**
 * Calcola un punteggio di similarità tra due descrizioni
 * Ritorna un valore tra 0 e 1
 */
export function calculateSimilarity(desc1: string, desc2: string): number {
  const norm1 = normalizeDescription(desc1);
  const norm2 = normalizeDescription(desc2);
  
  // Match esatto dopo normalizzazione
  if (norm1 === norm2) return 1;
  
  // Estrai nomi esercente
  const merchant1 = extractMerchantName(desc1);
  const merchant2 = extractMerchantName(desc2);
  
  // Match esatto esercente
  if (merchant1 === merchant2 && merchant1.length > 2) return 0.95;
  
  // Uno contiene l'altro
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
  if (merchant1.includes(merchant2) || merchant2.includes(merchant1)) return 0.75;
  
  // Calcola overlap parole
  const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union;
}
