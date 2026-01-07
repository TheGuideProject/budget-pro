import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RotateCcw, Building2, FileText, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInvoiceSettings, DEFAULT_INVOICE_SETTINGS } from '@/hooks/useInvoiceSettings';

interface InvoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceSettingsDialog({ open, onOpenChange }: InvoiceSettingsDialogProps) {
  const { settings, updateSettings, loading, hasCompanyData } = useInvoiceSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleSave = async () => {
    setSaving(true);
    const success = await updateSettings({
      work_start_label: localSettings.work_start_label,
      work_end_label: localSettings.work_end_label,
      project_name_label: localSettings.project_name_label,
      project_location_label: localSettings.project_location_label,
      show_work_dates: localSettings.show_work_dates,
      show_project_location: localSettings.show_project_location,
      show_client_vat: localSettings.show_client_vat,
      default_payment_days: localSettings.default_payment_days,
      default_unit_price: localSettings.default_unit_price,
      company_name: localSettings.company_name,
      company_address: localSettings.company_address,
      company_country: localSettings.company_country,
      company_iban: localSettings.company_iban,
      company_bic: localSettings.company_bic,
      company_bank_address: localSettings.company_bank_address,
      company_vat: localSettings.company_vat,
      company_email: localSettings.company_email,
    });
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setLocalSettings({
      ...localSettings,
      ...DEFAULT_INVOICE_SETTINGS,
    });
  };

  // Validate IBAN format (basic Italian check)
  const validateIban = (iban: string) => {
    if (!iban) return true;
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    // Italian IBAN: IT + 2 check digits + 23 alphanumeric
    return /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleanIban);
  };

  const ibanValid = validateIban(localSettings.company_iban);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Impostazioni Fattura
          </DialogTitle>
          <DialogDescription>
            Configura i tuoi dati contabili e personalizza il form
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dati Contabili
            </TabsTrigger>
            <TabsTrigger value="form" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Form Fattura
            </TabsTrigger>
          </TabsList>

          {/* Company Data Tab */}
          <TabsContent value="company" className="space-y-6 py-4">
            {!hasCompanyData && (
              <Alert className="border-warning/50 bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  Configura i tuoi dati contabili per generare fatture complete. 
                  Puoi importarli automaticamente da una fattura esistente.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Ragione Sociale / Nome</Label>
                <Input
                  value={localSettings.company_name}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="La tua ragione sociale o nome"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Indirizzo Completo</Label>
                <Input
                  value={localSettings.company_address}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, company_address: e.target.value }))}
                  placeholder="Via, numero civico, CAP, città"
                />
              </div>

              <div className="space-y-2">
                <Label>P.IVA / Codice Fiscale</Label>
                <Input
                  value={localSettings.company_vat}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, company_vat: e.target.value }))}
                  placeholder="IT12345678901"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Paese</Label>
                <Input
                  value={localSettings.company_country}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, company_country: e.target.value }))}
                  placeholder="Italia"
                />
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Coordinate Bancarie
              </h4>

              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={localSettings.company_iban}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, company_iban: e.target.value.toUpperCase() }))}
                  placeholder="IT60X0542811101000000123456"
                  className={`font-mono ${!ibanValid ? 'border-destructive' : ''}`}
                />
                {!ibanValid && (
                  <p className="text-xs text-destructive">Formato IBAN non valido</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>BIC / SWIFT</Label>
                  <Input
                    value={localSettings.company_bic}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, company_bic: e.target.value.toUpperCase() }))}
                    placeholder="BPMOIT22XXX"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Fatturazione</Label>
                  <Input
                    type="email"
                    value={localSettings.company_email}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, company_email: e.target.value }))}
                    placeholder="fatture@azienda.it"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome Banca e Sede</Label>
                <Input
                  value={localSettings.company_bank_address}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, company_bank_address: e.target.value }))}
                  placeholder="Banca XYZ - Filiale di Milano"
                />
              </div>
            </div>
          </TabsContent>

          {/* Form Settings Tab */}
          <TabsContent value="form" className="space-y-6 py-4">
            {/* Work Dates Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Date Lavorative</Label>
                <Switch
                  checked={localSettings.show_work_dates}
                  onCheckedChange={(checked) => 
                    setLocalSettings(prev => ({ ...prev, show_work_dates: checked }))
                  }
                />
              </div>
              
              {localSettings.show_work_dates && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Etichetta Inizio</Label>
                    <Input
                      value={localSettings.work_start_label}
                      onChange={(e) => 
                        setLocalSettings(prev => ({ ...prev, work_start_label: e.target.value }))
                      }
                      placeholder="es. Inizio Soggiorno, Check-in..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Etichetta Fine</Label>
                    <Input
                      value={localSettings.work_end_label}
                      onChange={(e) => 
                        setLocalSettings(prev => ({ ...prev, work_end_label: e.target.value }))
                      }
                      placeholder="es. Fine Soggiorno, Check-out..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Project Name */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Etichetta Nome Progetto</Label>
              <Input
                value={localSettings.project_name_label}
                onChange={(e) => 
                  setLocalSettings(prev => ({ ...prev, project_name_label: e.target.value }))
                }
                placeholder="es. Nome Nave, Descrizione Servizio..."
              />
            </div>

            {/* Project Location */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Luogo</Label>
                <Switch
                  checked={localSettings.show_project_location}
                  onCheckedChange={(checked) => 
                    setLocalSettings(prev => ({ ...prev, show_project_location: checked }))
                  }
                />
              </div>
              
              {localSettings.show_project_location && (
                <div className="pl-4 border-l-2 border-muted">
                  <Label className="text-sm text-muted-foreground">Etichetta Luogo</Label>
                  <Input
                    value={localSettings.project_location_label}
                    onChange={(e) => 
                      setLocalSettings(prev => ({ ...prev, project_location_label: e.target.value }))
                    }
                    placeholder="es. Porto, Indirizzo..."
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {/* Client VAT */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">P.IVA Cliente</Label>
                <p className="text-sm text-muted-foreground">Mostra campo P.IVA/C.F. cliente</p>
              </div>
              <Switch
                checked={localSettings.show_client_vat}
                onCheckedChange={(checked) => 
                  setLocalSettings(prev => ({ ...prev, show_client_vat: checked }))
                }
              />
            </div>

            {/* Default Values */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Giorni Pagamento Default</Label>
                <Input
                  type="number"
                  value={localSettings.default_payment_days}
                  onChange={(e) => 
                    setLocalSettings(prev => ({ ...prev, default_payment_days: parseInt(e.target.value) || 60 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Tariffa Default (€)</Label>
                <Input
                  type="number"
                  value={localSettings.default_unit_price}
                  onChange={(e) => 
                    setLocalSettings(prev => ({ ...prev, default_unit_price: parseFloat(e.target.value) || 500 }))
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving || loading || !ibanValid} className="gradient-button">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
