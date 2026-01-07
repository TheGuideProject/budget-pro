import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Briefcase, FileText, Users, Euro, Clock, Gift, Pencil, Save, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { IncomeType } from '@/types/family';

interface IncomeTabProps {
  incomeType: IncomeType | undefined;
  settings: {
    daily_rate?: number | null;
    payment_delay_days?: number | null;
    monthly_salary?: number | null;
    has_thirteenth?: boolean | null;
    has_fourteenth?: boolean | null;
    thirteenth_month?: number | null;
    fourteenth_month?: number | null;
    production_bonus_amount?: number | null;
    production_bonus_month?: number | null;
  } | null;
  onSwitchIncomeType: (type: IncomeType) => Promise<void>;
  onSaveSettings: (settings: Record<string, unknown>) => Promise<void>;
  isSaving: boolean;
}

const incomeTypeConfig: Record<string, { icon: typeof Briefcase; color: string; label: string; description: string }> = {
  freelancer: { icon: FileText, color: 'text-primary', label: 'Libero Professionista', description: 'Emetti fatture ai clienti' },
  employee: { icon: Briefcase, color: 'text-accent', label: 'Dipendente', description: 'Stipendio mensile fisso' },
  family_member: { icon: Users, color: 'text-muted-foreground', label: 'Familiare', description: 'Ricevi budget da un familiare' },
};

export function IncomeTab({ incomeType = 'freelancer', settings, onSwitchIncomeType, onSaveSettings, isSaving }: IncomeTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    dailyRate: settings?.daily_rate || 500,
    paymentDelay: settings?.payment_delay_days || 60,
    monthlySalary: settings?.monthly_salary || 0,
    hasThirteenth: settings?.has_thirteenth || false,
    hasFourteenth: settings?.has_fourteenth || false,
    productionBonus: settings?.production_bonus_amount || 0,
  });

  const config = incomeTypeConfig[incomeType];
  const Icon = config.icon;

  const handleSave = async () => {
    if (incomeType === 'freelancer') {
      await onSaveSettings({
        daily_rate: form.dailyRate,
        payment_delay_days: form.paymentDelay,
      });
    } else if (incomeType === 'employee') {
      await onSaveSettings({
        monthly_salary: form.monthlySalary,
        has_thirteenth: form.hasThirteenth,
        has_fourteenth: form.hasFourteenth,
        production_bonus_amount: form.productionBonus,
      });
    }
    setIsOpen(false);
  };

  const otherTypes = Object.entries(incomeTypeConfig).filter(([key]) => key !== incomeType);

  return (
    <div className="space-y-4">
      {/* Current Income Type Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-muted/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${incomeType === 'freelancer' ? 'bg-primary/10' : incomeType === 'employee' ? 'bg-accent/10' : 'bg-muted'}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {config.label}
                  <Badge variant={incomeType === 'employee' ? 'secondary' : incomeType === 'family_member' ? 'outline' : 'default'} className="text-xs">
                    Attivo
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">{config.description}</CardDescription>
              </div>
            </div>
            
            {incomeType !== 'family_member' && (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Modifica
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Impostazioni Reddito</SheetTitle>
                    <SheetDescription>Configura i dettagli del tuo reddito</SheetDescription>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    {incomeType === 'freelancer' && (
                      <>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-primary" />
                            Tariffa Giornaliera (€)
                          </Label>
                          <Input
                            type="number"
                            value={form.dailyRate}
                            onChange={(e) => setForm(prev => ({ ...prev, dailyRate: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Giorni per Pagamento
                          </Label>
                          <Input
                            type="number"
                            value={form.paymentDelay}
                            onChange={(e) => setForm(prev => ({ ...prev, paymentDelay: Number(e.target.value) }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Giorni medi tra emissione fattura e incasso
                          </p>
                        </div>
                      </>
                    )}
                    
                    {incomeType === 'employee' && (
                      <>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-primary" />
                            Stipendio Netto Mensile (€)
                          </Label>
                          <Input
                            type="number"
                            value={form.monthlySalary}
                            onChange={(e) => setForm(prev => ({ ...prev, monthlySalary: Number(e.target.value) }))}
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-primary" />
                            Mensilità Extra
                          </Label>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm">13ª Mensilità</span>
                            <Switch
                              checked={form.hasThirteenth}
                              onCheckedChange={(v) => setForm(prev => ({ ...prev, hasThirteenth: v }))}
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm">14ª Mensilità</span>
                            <Switch
                              checked={form.hasFourteenth}
                              onCheckedChange={(v) => setForm(prev => ({ ...prev, hasFourteenth: v }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Premio Produzione (€/anno)</Label>
                          <Input
                            type="number"
                            value={form.productionBonus}
                            onChange={(e) => setForm(prev => ({ ...prev, productionBonus: Number(e.target.value) }))}
                          />
                        </div>
                      </>
                    )}

                    <div className="pt-4 flex gap-2">
                      <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salva
                      </Button>
                      <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                        Annulla
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {incomeType === 'freelancer' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Tariffa giornaliera</p>
                <p className="text-xl font-bold">€{settings?.daily_rate?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Giorni pagamento</p>
                <p className="text-xl font-bold">{settings?.payment_delay_days || 60}</p>
              </div>
            </div>
          )}
          
          {incomeType === 'employee' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Stipendio netto</p>
                <p className="text-xl font-bold">€{settings?.monthly_salary?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Mensilità extra</p>
                <p className="text-xl font-bold">
                  {[settings?.has_thirteenth && '13ª', settings?.has_fourteenth && '14ª'].filter(Boolean).join(' + ') || '-'}
                </p>
              </div>
            </div>
          )}
          
          {incomeType === 'family_member' && (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Collegati a un familiare nella sezione "Famiglia" per ricevere il budget
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Switch Income Type */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cambia tipo reddito</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            {otherTypes.map(([key, cfg]) => {
              const OtherIcon = cfg.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-start gap-2"
                  onClick={() => onSwitchIncomeType(key as IncomeType)}
                >
                  <OtherIcon className={`h-4 w-4 ${cfg.color}`} />
                  <span className="hidden sm:inline">{cfg.label}</span>
                  <span className="sm:hidden">{cfg.label.split(' ')[0]}</span>
                  <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
