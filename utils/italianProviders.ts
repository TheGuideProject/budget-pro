/**
 * Lista completa dei fornitori italiani per riconoscimento automatico bollette.
 * Usata da tutto il sito per classificazione coerente.
 */

// LUCE E GAS - Venditori mercato libero italiano
export const ENERGY_PROVIDERS = [
  // Top 30
  'Enel Energia',
  'Eni Plenitude',
  'Edison Energia',
  'A2A Energia',
  'Sorgenia',
  'Hera Comm',
  'Iren Mercato',
  'Acea Energia',
  'AGSM AIM Energia',
  'Alperia Energia',
  'Dolomiti Energia',
  'Estra Energie',
  'Illumia',
  'Wekiwi',
  'NeN',
  'Octopus Energy Italia',
  'Iberdrola Italia',
  'Pulsee Luce e Gas',
  'Vivigas',
  'Metamer',
  'Optima Italia',
  'ABenergie',
  'Bluenergy Group',
  'E.ON Energia Italia',
  'ENGIE Italia',
  'Axpo Energy Italia',
  'Duferco Energia',
  'Green Network',
  'Gritti Energia',
  'Energia Pulita',
  // Altri fornitori
  'Energia Italiana',
  'Energia Futura',
  'Enercom Luce e Gas',
  'Enerxenia',
  'ETRA Energia',
  'Gas Sales Energia',
  'Gas Plus Energia',
  'Gas Intensive',
  'Global Power',
  'H2O Power',
  'Insieme Energia',
  'Italia Gas e Luce',
  'Lenergia',
  'Linea Energia',
  'NORD Energia',
  'Onda Energia',
  'Padania Energia',
  'Power Energia',
  'Primacall Energia',
  'RePower Italia',
  'San Marco Energia',
  'Sinergas',
  'Soenergy',
  'Spigas Clienti',
  'Start Romagna',
  'TATE Energia',
  'Umbria Energy',
  'Valori Energia',
  'VIVIenergia',
  'WePower',
  'Yes Energy',
  // Servizio Elettrico Nazionale e Tutela
  'Servizio Elettrico Nazionale',
  'Servizio Tutela Gas',
];

// SERVIZIO IDRICO INTEGRATO - Gestori per area/ATO
export const WATER_PROVIDERS = [
  'ACEA ATO 2',
  'ACEA ATO',
  'SMAT',
  'Iren Acqua',
  'Hera Acqua',
  'Publiacqua',
  'Acquedotto Pugliese',
  'Abbanoa',
  'AMGA',
  'CAP Holding',
  'BrianzAcque',
  'Acqua Novara VCO',
  'Acque Veronesi',
  'Acque Bresciane',
  'Acque del Chiampo',
  'GESESA',
  'CIIP',
  'ASA Livorno',
  'Acque Toscane',
  'GAIA',
  'ABC Napoli',
  'Lario Reti Holding',
  'Acqua Latina',
  'Alto Calore Servizi',
  'Siciliacque',
  'Caltaqua',
  'Abbanoa Sardegna',
  'Sorical',
  'Acque Potabili',
];

// TELEFONIA E INTERNET
export const TELECOM_PROVIDERS = [
  'TIM',
  'Vodafone Italia',
  'Vodafone',
  'WindTre',
  'Wind Tre',
  'Iliad',
  'Fastweb',
  'Tiscali',
  'Eolo',
  'Linkem',
  'Sky Wifi',
  'PosteMobile',
  'CoopVoce',
  'Kena Mobile',
  'Kena',
  'ho. Mobile',
  'ho Mobile',
  'Very Mobile',
];

// TV E STREAMING
export const STREAMING_PROVIDERS = [
  'Sky',
  'NOW',
  'NOW TV',
  'Netflix',
  'Amazon Prime Video',
  'Amazon Prime',
  'Disney+',
  'Disney Plus',
  'DAZN',
  'Apple TV+',
  'Apple TV',
  'Spotify',
  'YouTube Premium',
];

// RIFIUTI E SERVIZI AMBIENTALI (TARI)
export const WASTE_PROVIDERS = [
  'Hera Ambiente',
  'A2A Ambiente',
  'Iren Ambiente',
  'Veritas',
  'AMSA',
  'ASIA Napoli',
  'AMIU',
  'RAP Palermo',
  'SEI Toscana',
];

// Keywords per CONDOMINIO
export const CONDOMINIUM_KEYWORDS = [
  'condominio',
  'spese condominiali',
  'amministratore',
  'quote condominiali',
];

// Tutti i provider combinati per ricerca rapida
export const ALL_UTILITY_PROVIDERS = [
  ...ENERGY_PROVIDERS,
  ...WATER_PROVIDERS,
  ...TELECOM_PROVIDERS,
  ...WASTE_PROVIDERS,
];

export type UtilityType = 'energy' | 'water' | 'telecom' | 'streaming' | 'waste' | 'condominium' | null;

export interface ProviderDetectionResult {
  provider: string | null;
  type: UtilityType;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Rileva automaticamente il fornitore e il tipo di utenza da un testo.
 * Usato per classificare automaticamente le bollette.
 */
export function detectProvider(text: string): ProviderDetectionResult {
  if (!text) return { provider: null, type: null, confidence: 'low' };
  
  const normalizedText = text.toLowerCase().trim();
  
  // Check energia/gas
  for (const provider of ENERGY_PROVIDERS) {
    const normalizedProvider = provider.toLowerCase();
    // Match esatto o parole chiave principali
    if (normalizedText.includes(normalizedProvider) || 
        normalizedText.split(/\s+/).some(word => normalizedProvider.includes(word) && word.length > 3)) {
      return { provider, type: 'energy', confidence: 'high' };
    }
  }
  
  // Check acqua
  for (const provider of WATER_PROVIDERS) {
    if (normalizedText.includes(provider.toLowerCase())) {
      return { provider, type: 'water', confidence: 'high' };
    }
  }
  
  // Check telefonia/internet
  for (const provider of TELECOM_PROVIDERS) {
    if (normalizedText.includes(provider.toLowerCase())) {
      return { provider, type: 'telecom', confidence: 'high' };
    }
  }
  
  // Check streaming
  for (const provider of STREAMING_PROVIDERS) {
    if (normalizedText.includes(provider.toLowerCase())) {
      return { provider, type: 'streaming', confidence: 'high' };
    }
  }
  
  // Check rifiuti
  for (const provider of WASTE_PROVIDERS) {
    if (normalizedText.includes(provider.toLowerCase())) {
      return { provider, type: 'waste', confidence: 'high' };
    }
  }
  
  // Check condominio
  for (const keyword of CONDOMINIUM_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      return { provider: 'Condominio', type: 'condominium', confidence: 'medium' };
    }
  }
  
  // Keywords generiche per bollette
  if (normalizedText.match(/bolletta|utenza|fornitura|consumo|contatore/)) {
    return { provider: null, type: null, confidence: 'low' };
  }
  
  return { provider: null, type: null, confidence: 'low' };
}

/**
 * Verifica se un testo corrisponde a un fornitore italiano riconosciuto.
 */
export function isItalianUtilityProvider(text: string): boolean {
  const result = detectProvider(text);
  return result.provider !== null || result.confidence !== 'low';
}
