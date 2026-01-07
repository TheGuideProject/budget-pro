/**
 * FORMATTERS CENTRALIZZATI
 * 
 * Questo file è l'UNICA fonte di verità per la formattazione dei valori.
 * Usa il formatter corretto per ogni tipo di dato:
 * - formatCurrency() per importi in euro
 * - formatCount() per conteggi (numeri interi)
 * - formatPercent() per percentuali
 * - formatMonths() per mesi/periodi
 */

/**
 * Formatta un importo come valuta EUR.
 * Usa questo per TUTTI gli importi monetari.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '€ 0,00';
  }
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatta un importo come valuta compatta (senza centesimi se interi).
 */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '€ 0';
  }
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Formatta un numero come conteggio (intero, senza simbolo valuta).
 * Usa questo per contare transazioni, mesi, giorni, etc.
 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('it-IT', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/**
 * Formatta un numero con decimali (es. giorni lavoro 12.5).
 */
export function formatNumber(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('it-IT', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatta una percentuale.
 * @param value Il valore (es. 0.15 per 15%)
 * @param alreadyPercent Se true, il valore è già in percentuale (es. 15 per 15%)
 */
export function formatPercent(value: number | null | undefined, alreadyPercent: boolean = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  const pctValue = alreadyPercent ? value / 100 : value;
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(pctValue);
}

/**
 * Formatta un numero di mesi come testo leggibile.
 */
export function formatMonths(months: number | null | undefined): string {
  if (months === null || months === undefined || isNaN(months)) {
    return '0 mesi';
  }
  const rounded = Math.round(months);
  if (rounded === 1) return '1 mese';
  return `${rounded} mesi`;
}

/**
 * Formatta un numero di giorni come testo leggibile.
 */
export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined || isNaN(days)) {
    return '0 giorni';
  }
  const rounded = Math.round(days * 10) / 10; // 1 decimale
  if (rounded === 1) return '1 giorno';
  return `${rounded} giorni`;
}

/**
 * Formatta un valore per il DebugPanel.
 * Determina automaticamente il tipo di formattazione.
 */
export function formatForDebug(value: unknown, isRaw: boolean = false): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (isRaw) {
    return String(value);
  }
  
  if (typeof value === 'number') {
    // Valori grandi (>1000) probabilmente sono valuta
    if (Math.abs(value) >= 100) {
      return formatCurrency(value);
    }
    // Valori piccoli potrebbero essere conteggi o percentuali
    if (Number.isInteger(value)) {
      return formatCount(value);
    }
    // Decimali
    return formatNumber(value, 2);
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Sì' : 'No';
  }
  
  return String(value);
}
