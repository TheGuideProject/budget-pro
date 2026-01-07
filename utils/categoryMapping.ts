/**
 * Mapping bidirezionale tra output AI e ID categorie frontend.
 * L'AI restituisce nomi come "Alimentari", "Casa", "Ristorazione"
 * mentre il frontend usa ID come "alimentari", "casa_utenze", "ristorazione".
 */

// Mapping da output AI → ID frontend (case-insensitive)
export const AI_TO_FRONTEND_CATEGORY_MAP: Record<string, string> = {
  // Mapping principali (output AI → ID frontend)
  'alimentari': 'alimentari',
  'ristorazione': 'ristorazione',
  'trasporti': 'trasporti',
  'casa': 'casa_utenze',
  'utenze': 'casa_utenze',
  'casa & utenze': 'casa_utenze',
  'salute': 'salute',
  'abbigliamento': 'persona_cura',
  'persona': 'persona_cura',
  'persona & cura': 'persona_cura',
  'svago': 'tempo_libero',
  'tempo libero': 'tempo_libero',
  'tecnologia': 'tecnologia',
  'figli': 'altro',
  'animali': 'animali',
  'finanza': 'finanza_obblighi',
  'finanza & obblighi': 'finanza_obblighi',
  'altro': 'altro',
  'viaggi': 'viaggi',
  'sport': 'sport_benessere',
  'sport & benessere': 'sport_benessere',
  'lavoro': 'lavoro_formazione',
  'lavoro & formazione': 'lavoro_formazione',
  'abbonamenti': 'abbonamenti_servizi',
  'abbonamenti & servizi': 'abbonamenti_servizi',
  'regali': 'regali_donazioni',
  'regali & donazioni': 'regali_donazioni',
  'extra': 'extra_imprevisti',
  'extra & imprevisti': 'extra_imprevisti',
  'auto': 'auto_veicoli',
  'auto & veicoli': 'auto_veicoli',
};

// Mapping subcategorie AI → ID frontend
export const AI_TO_FRONTEND_CHILD_MAP: Record<string, string> = {
  // Alimentari
  'supermercato': 'supermercato',
  'frutta/verdura': 'mercato',
  'macelleria': 'macelleria_pescheria',
  'panetteria': 'fornaio',
  'bevande': 'bevande',
  'surgelati': 'supermercato',
  
  // Ristorazione
  'ristorante': 'ristorante',
  'bar/caffè': 'bar_caffe',
  'bar': 'bar_caffe',
  'caffè': 'bar_caffe',
  'fast food': 'fast_food',
  'pizzeria': 'pizzeria',
  'delivery': 'delivery',
  'mensa': 'ristorante',
  
  // Trasporti
  'carburante': 'carburante',
  'parcheggio': 'parcheggi',
  'mezzi pubblici': 'trasporto_pubblico',
  'taxi': 'taxi_ncc',
  'pedaggi': 'pedaggi',
  'noleggio': 'noleggio',
  
  // Casa
  'affitto': 'affitto_mutuo',
  'mutuo': 'affitto_mutuo',
  'manutenzione': 'manutenzione_ordinaria',
  'arredamento': 'arredamento',
  'elettrodomestici': 'elettrodomestici',
  'giardinaggio': 'manutenzione_ordinaria',
  
  // Utenze
  'elettricità': 'luce',
  'luce': 'luce',
  'gas': 'gas',
  'acqua': 'acqua',
  'internet': 'internet_casa',
  'telefono': 'telefonia',
  'rifiuti': 'rifiuti',
  
  // Salute
  'farmacia': 'farmaci',
  'visite mediche': 'visite',
  'dentista': 'dentista',
  'ottico': 'ottica',
  'palestra': 'palestra',
  'integratori': 'integratori',
  
  // Abbigliamento
  'vestiti': 'abbigliamento',
  'scarpe': 'scarpe',
  'accessori': 'accessori_persona',
  'sportivo': 'abbigliamento_sportivo',
  'bambini': 'abbigliamento',
  
  // Svago
  'cinema': 'cinema',
  'concerti': 'eventi',
  'sport': 'attrezzatura_sport',
  'hobbies': 'hobby',
  'abbonamenti': 'abbonamenti_streaming',
  
  // Tecnologia
  'smartphone': 'smartphone',
  'computer': 'computer',
  'software': 'software',
  'accessori tech': 'accessori_tech',
  'riparazioni': 'riparazioni_tech',
  
  // Animali
  'cibo animali': 'cibo_animali',
  'veterinario': 'veterinario',
  'accessori pet': 'accessori_animali',
  
  // Finanza
  'assicurazioni': 'assicurazione_auto',
  'tasse': 'tasse',
  'commissioni': 'commissioni',
  'investimenti': 'spese_bancarie',
  
  // Altro
  'regali': 'regali',
  'beneficenza': 'beneficenza',
  'varie': 'non_classificato',
};

/**
 * Normalizza un ID categoria dall'output AI al formato frontend.
 * @param rawCategory - La categoria come viene restituita dall'AI
 * @returns L'ID della categoria nel formato frontend
 */
export function normalizeAICategoryParent(rawCategory: string): string {
  if (!rawCategory) return 'altro';
  
  const normalized = rawCategory.toLowerCase().trim();
  
  // Prima prova il mapping diretto
  if (AI_TO_FRONTEND_CATEGORY_MAP[normalized]) {
    return AI_TO_FRONTEND_CATEGORY_MAP[normalized];
  }
  
  // Poi prova senza caratteri speciali
  const cleaned = normalized.replace(/[^a-z]/g, '');
  for (const [key, value] of Object.entries(AI_TO_FRONTEND_CATEGORY_MAP)) {
    if (key.replace(/[^a-z]/g, '') === cleaned) {
      return value;
    }
  }
  
  // Se la categoria è già un ID valido (lowercase), la restituisce
  const validIds = [
    'casa_utenze', 'alimentari', 'ristorazione', 'trasporti', 'auto_veicoli',
    'animali', 'persona_cura', 'salute', 'tempo_libero', 'sport_benessere',
    'viaggi', 'tecnologia', 'lavoro_formazione', 'finanza_obblighi',
    'abbonamenti_servizi', 'regali_donazioni', 'extra_imprevisti', 'altro'
  ];
  
  if (validIds.includes(normalized)) {
    return normalized;
  }
  
  // Se esiste con underscore convertiti
  const withUnderscores = normalized.replace(/\s+/g, '_');
  if (validIds.includes(withUnderscores)) {
    return withUnderscores;
  }
  
  return 'altro';
}

/**
 * Normalizza un ID subcategoria dall'output AI al formato frontend.
 * @param rawChild - La subcategoria come viene restituita dall'AI
 * @returns L'ID della subcategoria nel formato frontend, o null
 */
export function normalizeAICategoryChild(rawChild: string | null | undefined): string | null {
  if (!rawChild) return null;
  
  const normalized = rawChild.toLowerCase().trim();
  
  // Prima prova il mapping diretto
  if (AI_TO_FRONTEND_CHILD_MAP[normalized]) {
    return AI_TO_FRONTEND_CHILD_MAP[normalized];
  }
  
  // Converti in formato ID (lowercase con underscore)
  const asId = normalized.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  return asId || null;
}

/**
 * Normalizza sia parent che child insieme.
 */
export function normalizeAICategories(
  categoryParent: string, 
  categoryChild: string | null
): { parent: string; child: string | null } {
  return {
    parent: normalizeAICategoryParent(categoryParent),
    child: normalizeAICategoryChild(categoryChild)
  };
}
