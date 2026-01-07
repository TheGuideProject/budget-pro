import React, { useState } from 'react';
import { Plus, Mic, Camera, FileText, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface FABAction {
  id: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  gradient: string;
}

interface ExpandableFABProps {
  onAddManual: () => void;
  onAddVoice: () => void;
  onAddOCR: () => void;
  onImport: () => void;
}

export function ExpandableFAB({
  onAddManual,
  onAddVoice,
  onAddOCR,
  onImport
}: ExpandableFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const actions: FABAction[] = [
    {
      id: 'manual',
      icon: PenLine,
      label: 'Inserisci manualmente',
      onClick: () => {
        onAddManual();
        setIsOpen(false);
      },
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'voice',
      icon: Mic,
      label: 'Dettatura vocale',
      onClick: () => {
        onAddVoice();
        setIsOpen(false);
      },
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      id: 'ocr',
      icon: Camera,
      label: 'Scansiona scontrino',
      onClick: () => {
        onAddOCR();
        setIsOpen(false);
      },
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      id: 'import',
      icon: FileText,
      label: 'Importa estratto conto',
      onClick: () => {
        onImport();
        setIsOpen(false);
      },
      gradient: 'from-slate-500 to-slate-700'
    },
  ];

  return (
    <>
      {/* Fixed Bottom Bar - Respects sidebar on desktop */}
      <div className={cn(
        "fixed bottom-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border/50 p-4 pb-safe",
        isMobile ? "left-0" : "left-[280px] border-l"
      )}>
        <Button
          onClick={() => setIsOpen(true)}
          className="w-full h-12 gap-2 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg rounded-xl"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Aggiungi spesa
        </Button>
      </div>

      {/* Action Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle>Come vuoi aggiungere la spesa?</SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-3 pb-4">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 p-5 rounded-2xl",
                  "bg-gradient-to-br text-white",
                  "hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200",
                  "shadow-lg",
                  action.gradient
                )}
              >
                <action.icon className="h-7 w-7" />
                <span className="text-sm font-medium text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
