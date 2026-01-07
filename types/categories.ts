import {
  Home,
  ShoppingCart,
  UtensilsCrossed,
  Car,
  CarFront,
  PawPrint,
  User,
  Heart,
  Gamepad2,
  Dumbbell,
  Plane,
  Smartphone,
  Briefcase,
  Landmark,
  Wifi,
  Gift,
  AlertTriangle,
  CircleEllipsis,
  LucideIcon
} from 'lucide-react';

export interface CategoryParent {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export interface CategoryChild {
  id: string;
  parentId: string;
  label: string;
}

export const CATEGORY_PARENTS: CategoryParent[] = [
  { id: 'casa_utenze', label: 'Casa & Utenze', icon: Home, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'alimentari', label: 'Alimentari & Spesa', icon: ShoppingCart, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { id: 'ristorazione', label: 'Ristorazione', icon: UtensilsCrossed, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'trasporti', label: 'Trasporti', icon: Car, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'auto_veicoli', label: 'Auto & Veicoli', icon: CarFront, color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800/50' },
  { id: 'animali', label: 'Animali', icon: PawPrint, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  { id: 'persona_cura', label: 'Persona & Cura', icon: User, color: 'text-fuchsia-600 dark:text-fuchsia-400', bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
  { id: 'salute', label: 'Salute', icon: Heart, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
  { id: 'tempo_libero', label: 'Tempo Libero', icon: Gamepad2, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'sport_benessere', label: 'Sport & Benessere', icon: Dumbbell, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'viaggi', label: 'Viaggi', icon: Plane, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  { id: 'tecnologia', label: 'Tecnologia', icon: Smartphone, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { id: 'lavoro_formazione', label: 'Lavoro & Formazione', icon: Briefcase, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800/50' },
  { id: 'finanza_obblighi', label: 'Finanza & Obblighi', icon: Landmark, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { id: 'abbonamenti_servizi', label: 'Abbonamenti', icon: Wifi, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  { id: 'regali_donazioni', label: 'Regali & Donazioni', icon: Gift, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'extra_imprevisti', label: 'Extra & Imprevisti', icon: AlertTriangle, color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'altro', label: 'Altro', icon: CircleEllipsis, color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800/50' },
];

export const CATEGORY_CHILDREN: Record<string, CategoryChild[]> = {
  casa_utenze: [
    { id: 'affitto_mutuo', parentId: 'casa_utenze', label: 'Affitto / Mutuo' },
    { id: 'condominio', parentId: 'casa_utenze', label: 'Condominio' },
    { id: 'luce', parentId: 'casa_utenze', label: 'Luce' },
    { id: 'gas', parentId: 'casa_utenze', label: 'Gas' },
    { id: 'acqua', parentId: 'casa_utenze', label: 'Acqua' },
    { id: 'rifiuti', parentId: 'casa_utenze', label: 'Rifiuti' },
    { id: 'internet_casa', parentId: 'casa_utenze', label: 'Internet casa' },
    { id: 'tv_streaming', parentId: 'casa_utenze', label: 'TV / Streaming' },
    { id: 'manutenzione_ordinaria', parentId: 'casa_utenze', label: 'Manutenzione ordinaria' },
    { id: 'manutenzione_straordinaria', parentId: 'casa_utenze', label: 'Manutenzione straordinaria' },
    { id: 'arredamento', parentId: 'casa_utenze', label: 'Arredamento' },
    { id: 'elettrodomestici', parentId: 'casa_utenze', label: 'Elettrodomestici' },
  ],
  alimentari: [
    { id: 'supermercato', parentId: 'alimentari', label: 'Supermercato' },
    { id: 'discount', parentId: 'alimentari', label: 'Discount' },
    { id: 'mercato', parentId: 'alimentari', label: 'Mercato' },
    { id: 'macelleria_pescheria', parentId: 'alimentari', label: 'Macelleria / Pescheria' },
    { id: 'fornaio', parentId: 'alimentari', label: 'Fornaio' },
    { id: 'prodotti_speciali', parentId: 'alimentari', label: 'Prodotti speciali' },
    { id: 'bevande', parentId: 'alimentari', label: 'Bevande' },
    { id: 'alcolici', parentId: 'alimentari', label: 'Alcolici' },
  ],
  ristorazione: [
    { id: 'ristorante', parentId: 'ristorazione', label: 'Ristorante' },
    { id: 'pizzeria', parentId: 'ristorazione', label: 'Pizzeria' },
    { id: 'bar_caffe', parentId: 'ristorazione', label: 'Bar / Caffè' },
    { id: 'fast_food', parentId: 'ristorazione', label: 'Fast food' },
    { id: 'delivery', parentId: 'ristorazione', label: 'Delivery' },
    { id: 'aperitivi', parentId: 'ristorazione', label: 'Aperitivi' },
  ],
  trasporti: [
    { id: 'carburante', parentId: 'trasporti', label: 'Carburante' },
    { id: 'ricarica_elettrica', parentId: 'trasporti', label: 'Ricarica elettrica' },
    { id: 'trasporto_pubblico', parentId: 'trasporti', label: 'Trasporto pubblico' },
    { id: 'taxi_ncc', parentId: 'trasporti', label: 'Taxi / NCC' },
    { id: 'pedaggi', parentId: 'trasporti', label: 'Pedaggi' },
    { id: 'parcheggi', parentId: 'trasporti', label: 'Parcheggi' },
    { id: 'noleggio', parentId: 'trasporti', label: 'Noleggio' },
    { id: 'sharing', parentId: 'trasporti', label: 'Sharing' },
  ],
  auto_veicoli: [
    { id: 'assicurazione_auto', parentId: 'auto_veicoli', label: 'Assicurazione' },
    { id: 'bollo', parentId: 'auto_veicoli', label: 'Bollo' },
    { id: 'manutenzione_auto', parentId: 'auto_veicoli', label: 'Manutenzione' },
    { id: 'pneumatici', parentId: 'auto_veicoli', label: 'Pneumatici' },
    { id: 'revisione', parentId: 'auto_veicoli', label: 'Revisione' },
    { id: 'lavaggio', parentId: 'auto_veicoli', label: 'Lavaggio' },
    { id: 'accessori_auto', parentId: 'auto_veicoli', label: 'Accessori' },
  ],
  animali: [
    { id: 'cibo_animali', parentId: 'animali', label: 'Cibo' },
    { id: 'veterinario', parentId: 'animali', label: 'Veterinario' },
    { id: 'farmaci_animali', parentId: 'animali', label: 'Farmaci' },
    { id: 'toelettatura', parentId: 'animali', label: 'Toelettatura' },
    { id: 'accessori_animali', parentId: 'animali', label: 'Accessori' },
    { id: 'assicurazione_animali', parentId: 'animali', label: 'Assicurazione' },
  ],
  persona_cura: [
    { id: 'abbigliamento', parentId: 'persona_cura', label: 'Abbigliamento' },
    { id: 'scarpe', parentId: 'persona_cura', label: 'Scarpe' },
    { id: 'accessori_persona', parentId: 'persona_cura', label: 'Accessori' },
    { id: 'parrucchiere', parentId: 'persona_cura', label: 'Parrucchiere' },
    { id: 'estetica', parentId: 'persona_cura', label: 'Estetica' },
    { id: 'cosmetici', parentId: 'persona_cura', label: 'Cosmetici' },
    { id: 'profumi', parentId: 'persona_cura', label: 'Profumi' },
  ],
  salute: [
    { id: 'visite', parentId: 'salute', label: 'Visite' },
    { id: 'analisi', parentId: 'salute', label: 'Analisi' },
    { id: 'farmaci', parentId: 'salute', label: 'Farmaci' },
    { id: 'integratori', parentId: 'salute', label: 'Integratori' },
    { id: 'dentista', parentId: 'salute', label: 'Dentista' },
    { id: 'ottica', parentId: 'salute', label: 'Ottica' },
    { id: 'terapia', parentId: 'salute', label: 'Terapia' },
  ],
  tempo_libero: [
    { id: 'cinema', parentId: 'tempo_libero', label: 'Cinema' },
    { id: 'eventi', parentId: 'tempo_libero', label: 'Eventi' },
    { id: 'libri', parentId: 'tempo_libero', label: 'Libri' },
    { id: 'videogiochi', parentId: 'tempo_libero', label: 'Videogiochi' },
    { id: 'abbonamenti_streaming', parentId: 'tempo_libero', label: 'Abbonamenti' },
    { id: 'hobby', parentId: 'tempo_libero', label: 'Hobby' },
  ],
  sport_benessere: [
    { id: 'palestra', parentId: 'sport_benessere', label: 'Palestra' },
    { id: 'corsi_sport', parentId: 'sport_benessere', label: 'Corsi' },
    { id: 'attrezzatura_sport', parentId: 'sport_benessere', label: 'Attrezzatura' },
    { id: 'abbigliamento_sportivo', parentId: 'sport_benessere', label: 'Abbigliamento sportivo' },
    { id: 'personal_trainer', parentId: 'sport_benessere', label: 'Personal trainer' },
  ],
  viaggi: [
    { id: 'voli', parentId: 'viaggi', label: 'Voli' },
    { id: 'treni', parentId: 'viaggi', label: 'Treni' },
    { id: 'alloggi', parentId: 'viaggi', label: 'Alloggi' },
    { id: 'noleggio_viaggio', parentId: 'viaggi', label: 'Noleggio' },
    { id: 'spese_varie_viaggio', parentId: 'viaggi', label: 'Spese varie' },
    { id: 'assicurazione_viaggio', parentId: 'viaggi', label: 'Assicurazioni' },
  ],
  tecnologia: [
    { id: 'smartphone', parentId: 'tecnologia', label: 'Smartphone' },
    { id: 'computer', parentId: 'tecnologia', label: 'Computer' },
    { id: 'accessori_tech', parentId: 'tecnologia', label: 'Accessori' },
    { id: 'software', parentId: 'tecnologia', label: 'Software' },
    { id: 'cloud', parentId: 'tecnologia', label: 'Cloud' },
    { id: 'riparazioni_tech', parentId: 'tecnologia', label: 'Riparazioni' },
  ],
  lavoro_formazione: [
    { id: 'corsi_formazione', parentId: 'lavoro_formazione', label: 'Corsi' },
    { id: 'libri_lavoro', parentId: 'lavoro_formazione', label: 'Libri' },
    { id: 'software_pro', parentId: 'lavoro_formazione', label: 'Software professionali' },
    { id: 'trasferte', parentId: 'lavoro_formazione', label: 'Trasferte' },
    { id: 'rappresentanza', parentId: 'lavoro_formazione', label: 'Rappresentanza' },
  ],
  finanza_obblighi: [
    { id: 'tasse', parentId: 'finanza_obblighi', label: 'Tasse' },
    { id: 'imposte', parentId: 'finanza_obblighi', label: 'Imposte' },
    { id: 'commercialista', parentId: 'finanza_obblighi', label: 'Commercialista' },
    { id: 'spese_bancarie', parentId: 'finanza_obblighi', label: 'Spese bancarie' },
    { id: 'interessi', parentId: 'finanza_obblighi', label: 'Interessi' },
    { id: 'commissioni', parentId: 'finanza_obblighi', label: 'Commissioni' },
  ],
  abbonamenti_servizi: [
    { id: 'telefonia', parentId: 'abbonamenti_servizi', label: 'Telefonia' },
    { id: 'internet_mobile', parentId: 'abbonamenti_servizi', label: 'Internet mobile' },
    { id: 'streaming_abbonamenti', parentId: 'abbonamenti_servizi', label: 'Streaming' },
    { id: 'saas', parentId: 'abbonamenti_servizi', label: 'SaaS' },
    { id: 'membership', parentId: 'abbonamenti_servizi', label: 'Membership' },
  ],
  regali_donazioni: [
    { id: 'regali', parentId: 'regali_donazioni', label: 'Regali' },
    { id: 'beneficenza', parentId: 'regali_donazioni', label: 'Beneficenza' },
    { id: 'eventi_regali', parentId: 'regali_donazioni', label: 'Eventi' },
  ],
  extra_imprevisti: [
    { id: 'imprevisti', parentId: 'extra_imprevisti', label: 'Imprevisti' },
    { id: 'multe', parentId: 'extra_imprevisti', label: 'Multe' },
    { id: 'penali', parentId: 'extra_imprevisti', label: 'Penali' },
    { id: 'urgenze', parentId: 'extra_imprevisti', label: 'Urgenze' },
  ],
  altro: [
    { id: 'non_classificato', parentId: 'altro', label: 'Non classificato' },
  ],
};

// Helper functions
export function getCategoryParent(id: string): CategoryParent | undefined {
  return CATEGORY_PARENTS.find(cat => cat.id === id);
}

export function getCategoryChildren(parentId: string): CategoryChild[] {
  return CATEGORY_CHILDREN[parentId] || [];
}

export function getCategoryChild(parentId: string, childId: string): CategoryChild | undefined {
  return CATEGORY_CHILDREN[parentId]?.find(child => child.id === childId);
}

export function getCategoryLabel(parentId: string, childId?: string | null): string {
  const parent = getCategoryParent(parentId);
  if (!parent) return 'Altro';
  
  if (childId) {
    const child = getCategoryChild(parentId, childId);
    if (child) return child.label;
  }
  
  return parent.label;
}

// Legacy category mapping for backwards compatibility
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'casa': 'casa_utenze',
  'cibo': 'alimentari',
  'trasporti': 'trasporti',
  'salute': 'salute',
  'svago': 'tempo_libero',
  'abbonamenti': 'abbonamenti_servizi',
  'animali': 'animali',
  'viaggi': 'viaggi',
  'varie': 'altro',
  'fissa': 'finanza_obblighi',
  'variabile': 'altro',
  'carta_credito': 'finanza_obblighi',
};

export function mapLegacyCategory(oldCategory: string): string {
  return LEGACY_CATEGORY_MAP[oldCategory] || 'altro';
}
