import { useState, useEffect } from 'react';
import { UserProfile, PersonalData, Gender, FamilyStructure, HousingType, HeatingType, CitySize } from '@/types/family';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Heart, Home, Users2, Car, MapPin, Flame, Ruler, 
  Pencil, Save, Loader2, User, Building, ThermometerSun 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMonths } from 'date-fns';

const ITALIAN_REGIONS = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
];

const genderLabels: Record<string, string> = {
  male: 'Uomo', female: 'Donna', other: 'Altro',
};

const familyStructureLabels: Record<string, string> = {
  single: 'Single', couple: 'Coppia senza figli',
  couple_with_kids: 'Coppia con figli', single_parent: 'Genitore single',
};

const housingTypeLabels: Record<string, string> = {
  owned: 'Di proprietà', rented: 'In affitto', family: 'Casa familiare',
};

const heatingTypeLabels: Record<string, string> = {
  gas: 'Gas metano', electric: 'Elettrico', heat_pump: 'Pompa di calore',
  pellet: 'Pellet/legna', district: 'Teleriscaldamento',
};

const citySizeLabels: Record<string, string> = {
  small: 'Piccolo (<20k)', medium: 'Medio (20k-100k)',
  large: 'Grande (100k-500k)', metropolitan: 'Metro (>500k)',
};

interface PersonalDataTabProps {
  profile: UserProfile | null;
  userId: string | undefined;
  onUpdatePersonalData: (data: PersonalData) => Promise<{ error?: Error | null }>;
}

export function PersonalDataTab({ profile, userId, onUpdatePersonalData }: PersonalDataTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingLookback, setSavingLookback] = useState(false);
  const [variableMonthsLookback, setVariableMonthsLookback] = useState<number | null>(null);
  
  const profileAgeMonths = profile?.createdAt 
    ? Math.max(1, differenceInMonths(new Date(), profile.createdAt))
    : 1;

  const [form, setForm] = useState<PersonalData>({
    age: profile?.age || null,
    gender: profile?.gender || null,
    yearsWorked: profile?.yearsWorked || null,
    familyStructure: profile?.familyStructure || null,
    familyMembersCount: profile?.familyMembersCount || 1,
    housingType: profile?.housingType || null,
    housingSqm: profile?.housingSqm || null,
    heatingType: profile?.heatingType || null,
    hasCar: profile?.hasCar || false,
    carCount: profile?.carCount || 0,
    citySize: profile?.citySize || null,
    region: profile?.region || null,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        age: profile.age || null,
        gender: profile.gender || null,
        yearsWorked: profile.yearsWorked || null,
        familyStructure: profile.familyStructure || null,
        familyMembersCount: profile.familyMembersCount || 1,
        housingType: profile.housingType || null,
        housingSqm: profile.housingSqm || null,
        heatingType: profile.heatingType || null,
        hasCar: profile.hasCar || false,
        carCount: profile.carCount || 0,
        citySize: profile.citySize || null,
        region: profile.region || null,
      });
    }
  }, [profile]);

  useEffect(() => {
    const loadLookback = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('variable_months_lookback')
        .eq('user_id', userId)
        .single();
      if (data) {
        setVariableMonthsLookback(data.variable_months_lookback);
      }
    };
    loadLookback();
  }, [userId]);

  const handleSaveLookback = async (value: string) => {
    if (!userId) return;
    setSavingLookback(true);
    const newValue = value === 'auto' ? null : parseInt(value);
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        variable_months_lookback: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    setSavingLookback(false);
    if (!error) {
      setVariableMonthsLookback(newValue);
      toast.success(`Impostazione salvata: ${value === 'auto' ? 'automatico' : `${value} mesi`}`);
    } else {
      toast.error('Errore nel salvataggio');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await onUpdatePersonalData(form);
    setSaving(false);
    
    if (!error) {
      setIsOpen(false);
      toast.success('Dati personali salvati');
    } else {
      toast.error('Errore nel salvataggio');
    }
  };

  // Quick stats cards
  const stats = [
    { icon: Home, label: 'Abitazione', value: profile?.housingSqm ? `${profile.housingSqm}mq` : '-', sub: profile?.housingType ? housingTypeLabels[profile.housingType] : '' },
    { icon: Car, label: 'Auto', value: profile?.hasCar ? `${profile.carCount || 1}` : '0', sub: profile?.hasCar ? 'veicoli' : '' },
    { icon: Users2, label: 'Famiglia', value: profile?.familyMembersCount || 1, sub: profile?.familyStructure ? familyStructureLabels[profile.familyStructure]?.split(' ')[0] : '' },
    { icon: MapPin, label: 'Regione', value: profile?.region?.slice(0, 3) || '-', sub: profile?.citySize ? citySizeLabels[profile.citySize]?.split(' ')[0] : '' },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4 transition-all hover:shadow-md">
            <stat.icon className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground truncate">{stat.sub || stat.label}</p>
          </div>
        ))}
      </div>

      {/* Personal Data Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Dati Personali</CardTitle>
                <CardDescription className="text-xs">Per consigli AI personalizzati</CardDescription>
              </div>
            </div>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Modifica
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Modifica Dati Personali</SheetTitle>
                  <SheetDescription>Questi dati aiutano l'AI a fornirti consigli personalizzati</SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Anagrafica */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4 text-primary" />
                      Anagrafica
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Età</Label>
                        <Input
                          type="number"
                          value={form.age || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, age: parseInt(e.target.value) || null }))}
                          placeholder="35"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Sesso</Label>
                        <Select value={form.gender || ''} onValueChange={(v) => setForm(prev => ({ ...prev, gender: v as Gender }))}>
                          <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Uomo</SelectItem>
                            <SelectItem value="female">Donna</SelectItem>
                            <SelectItem value="other">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Famiglia */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users2 className="h-4 w-4 text-primary" />
                      Famiglia
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Struttura</Label>
                        <Select value={form.familyStructure || ''} onValueChange={(v) => setForm(prev => ({ ...prev, familyStructure: v as FamilyStructure }))}>
                          <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="couple">Coppia</SelectItem>
                            <SelectItem value="couple_with_kids">Con figli</SelectItem>
                            <SelectItem value="single_parent">Genitore single</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Componenti</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.familyMembersCount || 1}
                          onChange={(e) => setForm(prev => ({ ...prev, familyMembersCount: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Abitazione */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building className="h-4 w-4 text-primary" />
                      Abitazione
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={form.housingType || ''} onValueChange={(v) => setForm(prev => ({ ...prev, housingType: v as HousingType }))}>
                          <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owned">Di proprietà</SelectItem>
                            <SelectItem value="rented">In affitto</SelectItem>
                            <SelectItem value="family">Familiare</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Metratura</Label>
                        <Input
                          type="number"
                          value={form.housingSqm || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, housingSqm: parseInt(e.target.value) || null }))}
                          placeholder="80"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Riscaldamento</Label>
                      <Select value={form.heatingType || ''} onValueChange={(v) => setForm(prev => ({ ...prev, heatingType: v as HeatingType }))}>
                        <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gas">Gas metano</SelectItem>
                          <SelectItem value="electric">Elettrico</SelectItem>
                          <SelectItem value="heat_pump">Pompa di calore</SelectItem>
                          <SelectItem value="pellet">Pellet/legna</SelectItem>
                          <SelectItem value="district">Teleriscaldamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Auto */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Car className="h-4 w-4 text-primary" />
                      Veicoli
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label>Possiedi un'auto?</Label>
                      <Switch
                        checked={form.hasCar || false}
                        onCheckedChange={(v) => setForm(prev => ({ ...prev, hasCar: v, carCount: v ? 1 : 0 }))}
                      />
                    </div>
                    {form.hasCar && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quante auto?</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.carCount || 1}
                          onChange={(e) => setForm(prev => ({ ...prev, carCount: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Località */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      Località
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Città</Label>
                        <Select value={form.citySize || ''} onValueChange={(v) => setForm(prev => ({ ...prev, citySize: v as CitySize }))}>
                          <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Piccolo</SelectItem>
                            <SelectItem value="medium">Medio</SelectItem>
                            <SelectItem value="large">Grande</SelectItem>
                            <SelectItem value="metropolitan">Metro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Regione</Label>
                        <Select value={form.region || ''} onValueChange={(v) => setForm(prev => ({ ...prev, region: v }))}>
                          <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                          <SelectContent>
                            {ITALIAN_REGIONS.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Salva
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                      Annulla
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              { label: 'Età', value: profile?.age ? `${profile.age} anni` : '-' },
              { label: 'Sesso', value: profile?.gender ? genderLabels[profile.gender] : '-' },
              { label: 'Anni lavorati', value: profile?.yearsWorked ?? '-' },
              { label: 'Riscaldamento', value: profile?.heatingType ? heatingTypeLabels[profile.heatingType] : '-' },
              { label: 'Città', value: profile?.citySize ? citySizeLabels[profile.citySize] : '-' },
              { label: 'Regione', value: profile?.region || '-' },
            ].map((item, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expense Calculation Settings */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <ThermometerSun className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">Calcolo Spese</CardTitle>
              <CardDescription className="text-xs">Mesi per la media delle spese variabili</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select 
            value={variableMonthsLookback?.toString() || 'auto'}
            onValueChange={handleSaveLookback}
            disabled={savingLookback}
          >
            <SelectTrigger>
              <SelectValue placeholder="Automatico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto (età profilo: {profileAgeMonths} {profileAgeMonths === 1 ? 'mese' : 'mesi'})
              </SelectItem>
              {[1, 2, 3, 6, 12].map(n => (
                <SelectItem key={n} value={n.toString()}>
                  Ultimi {n} {n === 1 ? 'mese' : 'mesi'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {variableMonthsLookback 
              ? `Media calcolata sugli ultimi ${variableMonthsLookback} mesi.`
              : `Automatico: profili nuovi (1-3 mesi), consolidati (fino a 12 mesi).`
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
