import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface DeleteExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseDescription: string;
  onConfirm: () => void;
}

const CORRECT_PIN = '0000';

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expenseDescription,
  onConfirm,
}: DeleteExpenseDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleConfirm = () => {
    if (pin === CORRECT_PIN) {
      onConfirm();
      setPin('');
      setError(false);
      onOpenChange(false);
      toast.success('Spesa eliminata');
    } else {
      setError(true);
      toast.error('PIN non corretto');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPin('');
      setError(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Conferma Eliminazione
          </DialogTitle>
          <DialogDescription>
            Inserisci il PIN per eliminare la spesa: <strong>"{expenseDescription}"</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={(value) => {
              setPin(value);
              setError(false);
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-sm text-destructive">PIN non corretto, riprova</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annulla
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={pin.length !== 4}
          >
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
