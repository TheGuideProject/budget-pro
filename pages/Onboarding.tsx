import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useHousehold } from '@/hooks/useHousehold';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, FileText, Briefcase, ArrowRight, ArrowLeft, ChevronDown, Euro, Gift, 
  Calendar, Users, Home, UserPlus, Link2, Eye, EyeOff, Shield, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { IncomeType } from '@/types/family';
import { DEFAULT_PERMISSIONS } from '@/types/household';
import { Json } from '@/integrations/supabase/types';

const months = [
  { value: 1, label: 'Gennaio' },
  { value: 2, label: 'Febbraio' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Aprile' },
  { value: 5, label: 'Maggio' },
  { value: 6, label: 'Giugno' },
  { value: 7, label: 'Luglio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Settembre' },
  { value: 10, label: 'Ottobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Dicembre' },
];

type OnboardingStep = 
  | 'usage-type'      // Step 1: Solo o Famiglia?
  | 'income-type'     // Step 2: Tipo di reddito
  | 'income-config'   // Step 3: Configurazione reddito
  | 'household-setup' // Step 4: Configurazione household (se famiglia)
  | 'support-config'  // Step 5: Configurazione supporto (se riceve supporto)
  | 'privacy-config'  // Step 6: Privacy settings (se riceve supporto)
  | 'complete';       // Step finale

type UsageType = 'personal' | 'family';
type HouseholdAction = 'create' | 'join';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setIncomeType, loading: profileLoading, profile } = useUserProfile();
  const { upsertSettings, defaultSettings } = useFinancialSettings();
  const { createHousehold } = useHousehold();
  
  const [step, setStep] = useState<OnboardingStep>('usage-type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  
  // Step 1: Usage type
  const [usageType, setUsageType] = useState<UsageType | null>(null);
  
  // Step 2: Income type
  const [incomeType, setIncomeTypeState] = useState<IncomeType>(null);
  
  // Step 3: Income config - Freelancer
  const [dailyRate, setDailyRate] = useState(defaultSettings.daily_rate);
  const [paymentDelay, setPaymentDelay] = useState(defaultSettings.payment_delay_days);
  
  // Step 3: Income config - Employee
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [hasThirteenth, setHasThirteenth] = useState(true);
  const [hasFourteenth, setHasFourteenth] = useState(false);
  const [thirteenthMonth, setThirteenthMonth] = useState(12);
  const [fourteenthMonth, setFourteenthMonth] = useState(7);
  const [productionBonus, setProductionBonus] = useState(0);
  const [productionBonusMonth, setProductionBonusMonth] = useState<number | null>(null);
  const [salesBonus, setSalesBonus] = useState(0);
  const [salesBonusMonths, setSalesBonusMonths] = useState<number[]>([]);
  
  // Step 4: Household setup
  const [householdAction, setHouseholdAction] = useState<HouseholdAction | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // Step 5: Support config
  const [receivesSupport, setReceivesSupport] = useState(false);
  const [supporterName, setSupporterName] = useState('');
  
  // Step 6: Privacy config
  const [privacyMode, setPrivacyMode] = useState<'detailed' | 'summary'>('detailed');

  const getStepNumber = () => {
    const steps: OnboardingStep[] = ['usage-type', 'income-type', 'income-config', 'household-setup', 'support-config', 'privacy-config', 'complete'];
    return steps.indexOf(step) + 1;
  };

  const getTotalSteps = () => {
    let total = 3; // usage-type, income-type, income-config
    if (usageType === 'family') total += 1; // household-setup
    if (receivesSupport) total += 2; // support-config, privacy-config
    return total;
  };

  const goBack = () => {
    switch (step) {
      case 'income-type':
        setStep('usage-type');
        break;
      case 'income-config':
        setStep('income-type');
        break;
      case 'household-setup':
        setStep('income-config');
        break;
      case 'support-config':
        setStep(usageType === 'family' ? 'household-setup' : 'income-config');
        break;
      case 'privacy-config':
        setStep('support-config');
        break;
    }
  };

  const handleUsageType = (type: UsageType) => {
    setUsageType(type);
    setStep('income-type');
  };

  const handleIncomeType = (type: IncomeType) => {
    setIncomeTypeState(type);
    
    if (type === 'family_member') {
      // Family members likely receive support
      setReceivesSupport(true);
      if (usageType === 'family') {
        setStep('household-setup');
      } else {
        setStep('support-config');
      }
    } else {
      setStep('income-config');
    }
  };

  const handleIncomeConfigComplete = () => {
    if (usageType === 'family') {
      setStep('household-setup');
    } else if (receivesSupport) {
      setStep('support-config');
    } else {
      handleComplete();
    }
  };

  const handleHouseholdSetupComplete = async () => {
    if (receivesSupport) {
      setStep('support-config');
    } else {
      handleComplete();
    }
  };

  const handleSupportConfigComplete = () => {
    if (receivesSupport) {
      setStep('privacy-config');
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // 1. Save income type
      if (incomeType) {
        const { error: profileError } = await setIncomeType(incomeType);
        if (profileError) throw profileError;
      }
      
      // 2. Save financial settings
      if (incomeType === 'freelancer') {
        await upsertSettings.mutateAsync({
          daily_rate: dailyRate,
          payment_delay_days: paymentDelay,
        });
      } else if (incomeType === 'employee') {
        await upsertSettings.mutateAsync({
          monthly_salary: monthlySalary,
          has_thirteenth: hasThirteenth,
          has_fourteenth: hasFourteenth,
          thirteenth_month: thirteenthMonth,
          fourteenth_month: fourteenthMonth,
          production_bonus_amount: productionBonus,
          production_bonus_month: productionBonusMonth,
          sales_bonus_amount: salesBonus,
          sales_bonus_months: salesBonusMonths,
        });
      }
      
      // 3. Create or join household if family mode
      if (usageType === 'family' && householdAction === 'create' && householdName) {
        // Create household
        const { data: newHousehold, error: householdError } = await supabase
          .from('households')
          .insert({ 
            name: householdName, 
            created_by: user.id 
          })
          .select()
          .single();

        if (householdError) throw householdError;

        // Create owner membership
        const { data: membership, error: memberError } = await supabase
          .from('household_members')
          .insert({
            household_id: newHousehold.id,
            user_id: user.id,
            display_name: profile?.displayName || user.email?.split('@')[0] || 'Utente',
            role: 'owner',
            permissions: DEFAULT_PERMISSIONS.owner as unknown as Json,
          })
          .select()
          .single();

        if (memberError) throw memberError;

        // Update user profile with household_id
        await supabase
          .from('user_profiles')
          .update({ household_id: newHousehold.id })
          .eq('user_id', user.id);

        // 4. Create income source if applicable
        if (incomeType === 'employee' && monthlySalary > 0) {
          await supabase
            .from('income_sources')
            .insert({
              member_id: membership.id,
              type: 'salary',
              name: 'Stipendio',
              amount: monthlySalary,
              frequency: 'monthly',
            });
        } else if (incomeType === 'freelancer' && dailyRate > 0) {
          await supabase
            .from('income_sources')
            .insert({
              member_id: membership.id,
              type: 'freelance',
              name: 'Attività Freelance',
              amount: dailyRate * 20, // Stima mensile
              frequency: 'monthly',
            });
        }

        // 5. If user receives support, note it for later (supporter needs to be invited)
        if (receivesSupport && supporterName) {
          // Create a placeholder support relationship note in audit log
          await supabase
            .from('budget_audit_log')
            .insert({
              user_id: user.id,
              action: 'SUPPORT_SETUP_PENDING',
              details: {
                supporter_name: supporterName,
                privacy_mode: privacyMode,
                household_id: newHousehold.id,
              },
            });
        }
      }
      
      toast.success('Configurazione completata!');
      navigate('/mode-selection');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: getTotalSteps() }).map((_, i) => (
            <div 
              key={i}
              className={`h-2 w-12 rounded-full transition-colors ${
                i < getStepNumber() ? 'bg-primary' : 'bg-muted'
              }`} 
            />
          ))}
        </div>

        {/* Step 1: Usage Type */}
        {step === 'usage-type' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Come userai l'app?</h1>
              <p className="text-muted-foreground">Scegli in base alle tue esigenze</p>
            </div>

            <div className="space-y-4">
              <Card 
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                onClick={() => handleUsageType('personal')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Solo per me</CardTitle>
                      <CardDescription>Gestione personale</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Gestisci le tue finanze personali senza condivisione.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                onClick={() => handleUsageType('family')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                      <Home className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Famiglia / Gruppo</CardTitle>
                      <CardDescription>Condividi con altri</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Condividi budget, trasferimenti e spese con familiari o partner.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Step 2: Income Type */}
        {step === 'income-type' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Come guadagni?</h1>
              <p className="text-muted-foreground">Questo ci aiuta a personalizzare l'esperienza</p>
            </div>

            <div className="space-y-4">
              <Card 
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                onClick={() => handleIncomeType('freelancer')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Libero Professionista</CardTitle>
                      <CardDescription>Emetto fatture ai clienti</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                onClick={() => handleIncomeType('employee')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                      <Briefcase className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Dipendente</CardTitle>
                      <CardDescription>Ricevo uno stipendio fisso</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                onClick={() => handleIncomeType('family_member')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                      <Users className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Ricevo supporto</CardTitle>
                      <CardDescription>Qualcuno mi trasferisce soldi</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Puoi comunque aggiungere entrate personali in seguito.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button variant="ghost" onClick={goBack} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
            </Button>
          </>
        )}

        {/* Step 3: Income Config - Freelancer */}
        {step === 'income-config' && incomeType === 'freelancer' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Configura la tua tariffa</h1>
              <p className="text-muted-foreground">Potrai modificarla in seguito</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Tariffa giornaliera (€)</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dailyRate"
                      type="number"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(Number(e.target.value))}
                      className="pl-10"
                      placeholder="500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDelay">Giorni per incasso fatture</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="paymentDelay"
                      type="number"
                      value={paymentDelay}
                      onChange={(e) => setPaymentDelay(Number(e.target.value))}
                      className="pl-10"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                  </Button>
                  <Button onClick={handleIncomeConfigComplete} className="flex-1">
                    Continua <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 3: Income Config - Employee */}
        {step === 'income-config' && incomeType === 'employee' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Configura il tuo stipendio</h1>
              <p className="text-muted-foreground">Potrai modificarlo in seguito</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlySalary">Stipendio netto mensile (€)</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="monthlySalary"
                      type="number"
                      value={monthlySalary || ''}
                      onChange={(e) => setMonthlySalary(Number(e.target.value))}
                      className="pl-10"
                      placeholder="1500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>13esima</Label>
                    <p className="text-xs text-muted-foreground">Mensilità aggiuntiva</p>
                  </div>
                  <Switch checked={hasThirteenth} onCheckedChange={setHasThirteenth} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>14esima</Label>
                    <p className="text-xs text-muted-foreground">Mensilità estiva</p>
                  </div>
                  <Switch checked={hasFourteenth} onCheckedChange={setHasFourteenth} />
                </div>

                <Collapsible open={bonusOpen} onOpenChange={setBonusOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Bonus e Premi
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${bonusOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Premio Produzione (€)</Label>
                      <Input
                        type="number"
                        value={productionBonus || ''}
                        onChange={(e) => setProductionBonus(Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                  </Button>
                  <Button onClick={handleIncomeConfigComplete} className="flex-1">
                    Continua <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 4: Household Setup */}
        {step === 'household-setup' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Configura il gruppo</h1>
              <p className="text-muted-foreground">Crea o unisciti a un gruppo familiare</p>
            </div>

            <div className="space-y-4">
              <Card 
                className={`cursor-pointer transition-all hover:border-primary ${
                  householdAction === 'create' ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
                onClick={() => setHouseholdAction('create')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Crea nuovo gruppo</CardTitle>
                      <CardDescription className="text-sm">Sarai il proprietario</CardDescription>
                    </div>
                    {householdAction === 'create' && (
                      <Check className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:border-primary ${
                  householdAction === 'join' ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
                onClick={() => setHouseholdAction('join')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <Link2 className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Unisciti con codice</CardTitle>
                      <CardDescription className="text-sm">Hai un codice invito</CardDescription>
                    </div>
                    {householdAction === 'join' && (
                      <Check className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                </CardHeader>
              </Card>

              {householdAction === 'create' && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="householdName">Nome del gruppo</Label>
                      <Input
                        id="householdName"
                        value={householdName}
                        onChange={(e) => setHouseholdName(e.target.value)}
                        placeholder="es. Famiglia Rossi"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {householdAction === 'join' && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Codice invito</Label>
                      <Input
                        id="inviteCode"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Inserisci il codice"
                      />
                      <p className="text-xs text-muted-foreground">
                        Chiedi il codice al proprietario del gruppo
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                </Button>
                <Button 
                  onClick={handleHouseholdSetupComplete} 
                  disabled={!householdAction || (householdAction === 'create' && !householdName)}
                  className="flex-1"
                >
                  Continua <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 5: Support Config */}
        {step === 'support-config' && (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Supporto economico</h1>
              <p className="text-muted-foreground">Ricevi soldi da qualcun altro?</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base">Ricevo supporto economico</Label>
                    <p className="text-sm text-muted-foreground">
                      Qualcuno mi trasferisce soldi regolarmente
                    </p>
                  </div>
                  <Switch 
                    checked={receivesSupport} 
                    onCheckedChange={setReceivesSupport} 
                  />
                </div>

                {receivesSupport && (
                  <div className="space-y-2">
                    <Label htmlFor="supporterName">Chi ti supporta?</Label>
                    <Input
                      id="supporterName"
                      value={supporterName}
                      onChange={(e) => setSupporterName(e.target.value)}
                      placeholder="es. Marco, Papà, Partner..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Potrai invitarlo nel gruppo in seguito
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                  </Button>
                  <Button onClick={handleSupportConfigComplete} className="flex-1">
                    {receivesSupport ? 'Continua' : 'Completa'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 6: Privacy Config */}
        {step === 'privacy-config' && (
          <>
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Privacy delle spese</h1>
              <p className="text-muted-foreground">
                Vuoi che {supporterName || 'chi ti supporta'} veda i dettagli delle tue spese?
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <RadioGroup value={privacyMode} onValueChange={(v) => setPrivacyMode(v as 'detailed' | 'summary')}>
                  <div 
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      privacyMode === 'detailed' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setPrivacyMode('detailed')}
                  >
                    <RadioGroupItem value="detailed" id="detailed" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="detailed" className="flex items-center gap-2 cursor-pointer">
                        <Eye className="h-4 w-4" />
                        Mostra i dettagli
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Potrà vedere cosa compri, dove e quanto spendi per categoria
                      </p>
                    </div>
                  </div>

                  <div 
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      privacyMode === 'summary' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setPrivacyMode('summary')}
                  >
                    <RadioGroupItem value="summary" id="summary" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="summary" className="flex items-center gap-2 cursor-pointer">
                        <EyeOff className="h-4 w-4" />
                        Solo totali
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vedrà solo quanto hai speso in totale, senza dettagli
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    💡 Potrai cambiare questa impostazione in qualsiasi momento nelle impostazioni privacy.
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                  </Button>
                  <Button onClick={handleComplete} disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Completa <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
