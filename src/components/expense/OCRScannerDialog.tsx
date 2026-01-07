import { useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { OCRScanner } from '@/components/budget/OCRScanner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OCRScannerDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OCRScannerDialog({ trigger, open: controlledOpen, onOpenChange }: OCRScannerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const dialogContent = (
    <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <DialogHeader className="px-6 pt-6 pb-4">
        <DialogTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Camera className="h-5 w-5 text-white" />
          </div>
          Scanner Scontrino
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh]">
        <div className="px-6 pb-6">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <OCRScanner />
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Riconoscimento AI automatico</span>
          </div>
        </div>
      </ScrollArea>
    </DialogContent>
  );

  // If controlled, render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start gap-3 h-14 px-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
              <Camera className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <div className="font-medium">Scansiona</div>
              <div className="text-xs text-muted-foreground">Foto scontrino</div>
            </div>
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
