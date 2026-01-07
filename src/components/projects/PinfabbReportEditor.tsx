import { useState, useEffect } from 'react';
import { Download, Save, X, Ship, Clock, Wrench, FileText, PenTool, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PinfabbReport, defaultPinfabbReport, FLAG_OPTIONS } from '@/types/pinfabb';
import { generatePinfabbReportPdf } from '@/utils/generatePinfabbReportPdf';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PinfabbReportEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<PinfabbReport>;
  onSave?: (report: PinfabbReport) => void;
}

const steps = [
  { id: 'info', label: 'Info', icon: FileText },
  { id: 'ship', label: 'Nave', icon: Ship },
  { id: 'time', label: 'Orari', icon: Clock },
  { id: 'service', label: 'Servizio', icon: Wrench },
  { id: 'sign', label: 'Firme', icon: PenTool },
];

export function PinfabbReportEditor({ 
  open, 
  onOpenChange, 
  initialData,
  onSave 
}: PinfabbReportEditorProps) {
  const [report, setReport] = useState<PinfabbReport>({
    ...defaultPinfabbReport,
    ...initialData,
  });
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (open) {
      setReport({
        ...defaultPinfabbReport,
        ...initialData,
      });
      setCurrentStep(0);
    }
  }, [open, initialData]);

  const updateField = <K extends keyof PinfabbReport>(
    field: K, 
    value: PinfabbReport[K]
  ) => {
    setReport(prev => ({ ...prev, [field]: value }));
  };

  const handleDownloadPdf = () => {
    try {
      generatePinfabbReportPdf(report);
      toast.success('PDF scaricato con successo');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Errore nella generazione del PDF');
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(report);
    }
    toast.success('Report salvato');
    onOpenChange(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'info':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Report N°</Label>
                <Input
                  value={report.reportNumber}
                  onChange={(e) => updateField('reportNumber', e.target.value)}
                  placeholder="Q29082025"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data</Label>
                <Input
                  type="date"
                  value={report.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Order N°</Label>
                <Input
                  value={report.orderNumber}
                  onChange={(e) => updateField('orderNumber', e.target.value)}
                  placeholder="2025-XXX"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pagina</Label>
                <Input
                  value={report.page}
                  onChange={(e) => updateField('page', e.target.value)}
                  placeholder="1"
                  className="h-12"
                />
              </div>
            </div>
          </div>
        );
      
      case 'ship':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome Nave</Label>
                <Input
                  value={report.shipName}
                  onChange={(e) => updateField('shipName', e.target.value)}
                  placeholder="GNV ALLEGRA"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">IMO Number</Label>
                <Input
                  value={report.imoNumber}
                  onChange={(e) => updateField('imoNumber', e.target.value)}
                  placeholder="8506311"
                  className="h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bandiera</Label>
                <Select 
                  value={report.flag} 
                  onValueChange={(value) => updateField('flag', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleziona bandiera" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLAG_OPTIONS.map((flag) => (
                      <SelectItem key={flag} value={flag}>
                        {flag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Impianto Stabilizzazione</Label>
                <Input
                  value={report.stabilizationPlant}
                  onChange={(e) => updateField('stabilizationPlant', e.target.value)}
                  placeholder="PINFABB/SK40 Stabilizers"
                  className="h-12"
                />
              </div>
            </div>
          </div>
        );
      
      case 'time':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Porto</Label>
                <Input
                  value={report.port}
                  onChange={(e) => updateField('port', e.target.value)}
                  placeholder="Genova"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">N° Tecnici</Label>
                <Input
                  type="number"
                  min={1}
                  value={report.numberOfTechnicians}
                  onChange={(e) => updateField('numberOfTechnicians', parseInt(e.target.value) || 1)}
                  className="h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Inizio</Label>
                <Input
                  type="date"
                  value={report.dateStart}
                  onChange={(e) => updateField('dateStart', e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Fine</Label>
                <Input
                  type="date"
                  value={report.dateEnd}
                  onChange={(e) => updateField('dateEnd', e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ore Straordinario</Label>
                <Input
                  type="number"
                  min={0}
                  value={report.overtimeHours}
                  onChange={(e) => updateField('overtimeHours', parseInt(e.target.value) || 0)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ore Notturne</Label>
                <Input
                  type="number"
                  min={0}
                  value={report.nightHours}
                  onChange={(e) => updateField('nightHours', parseInt(e.target.value) || 0)}
                  className="h-12"
                />
              </div>
            </div>
          </div>
        );
      
      case 'service':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ricambi Utilizzati</Label>
              <Textarea
                value={report.spareParts}
                onChange={(e) => updateField('spareParts', e.target.value)}
                placeholder="Elenco dei ricambi utilizzati..."
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Report Servizio</Label>
              <Textarea
                value={report.serviceReport}
                onChange={(e) => updateField('serviceReport', e.target.value)}
                placeholder="Descrizione dettagliata del servizio eseguito..."
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {report.serviceReport.length} caratteri
              </p>
            </div>
          </div>
        );
      
      case 'sign':
        return (
          <div className="space-y-6">
            <div className="neo-glass p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Ship className="h-4 w-4 text-primary" />
                Direttore Macchine
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome</Label>
                  <Input
                    value={report.chiefEngineerName}
                    onChange={(e) => updateField('chiefEngineerName', e.target.value)}
                    placeholder="Nome Direttore Macchine"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data</Label>
                  <Input
                    type="date"
                    value={report.chiefEngineerDate}
                    onChange={(e) => updateField('chiefEngineerDate', e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
            
            <div className="neo-glass p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                Tecnico Servizio
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome</Label>
                  <Input
                    value={report.serviceEngineerName}
                    onChange={(e) => updateField('serviceEngineerName', e.target.value)}
                    placeholder="Nome Tecnico Servizio"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data</Label>
                  <Input
                    type="date"
                    value={report.serviceEngineerDate}
                    onChange={(e) => updateField('serviceEngineerDate', e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col p-0 gap-0 max-h-[100dvh] sm:max-h-[90vh] sm:max-w-2xl">
        {/* Header */}
        <div className="sheet-header-glass shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Ship className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">PINFABB Service Report</h2>
              <p className="text-sm text-muted-foreground">Step {currentStep + 1} di {steps.length}</p>
            </div>
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="px-6 py-4 shrink-0 overflow-x-auto">
          <div className="wizard-steps min-w-max">
            {/* Connection Line */}
            <div className="wizard-step-line">
              <div 
                className="wizard-step-line-fill"
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>
            
            {steps.map((step, index) => (
              <button
                key={step.id}
                className={cn(
                  "wizard-step",
                  index <= currentStep && "active",
                  index < currentStep && "completed"
                )}
                onClick={() => goToStep(index)}
              >
                <div className="wizard-step-circle">
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs mt-2 font-medium text-muted-foreground">
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t p-4 pb-safe shrink-0">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="h-12 flex-1"
              >
                Indietro
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button 
                onClick={nextStep}
                className="h-12 flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                Avanti
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex gap-3 flex-1">
                {onSave && (
                  <Button 
                    variant="outline" 
                    onClick={handleSave}
                    className="h-12 flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salva
                  </Button>
                )}
                <Button 
                  onClick={handleDownloadPdf}
                  className="h-12 flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Scarica PDF
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
