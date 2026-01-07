import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

const CONFIRM_PIN = '1234';

interface DeleteAllExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseCount: number;
  totalAmount: number;
  monthLabel: string;
  onConfirm: () => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function DeleteAllExpensesDialog({
  open,
  onOpenChange,
  expenseCount,
  totalAmount,
  monthLabel,
  onConfirm,
  formatCurrency,
}: DeleteAllExpensesDialogProps) {
  const [pin, setPin] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPin('');
      setConfirmed(false);
      setError('');
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = async () => {
    if (pin !== CONFIRM_PIN) {
      setError('PIN errato. Inserisci il PIN corretto.');
      return;
    }
    if (!confirmed) {
      setError('Devi confermare di voler eliminare le spese.');
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      await onConfirm();
      handleOpenChange(false);
    } catch (e) {
      setError('Errore durante l\'eliminazione.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isValid = pin === CONFIRM_PIN && confirmed;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminare tutte le spese?
          </DialogTitle>
          <DialogDescription>
            Stai per eliminare <strong>{expenseCount} spese</strong> del mese di <strong>{monthLabel}</strong>.
            Questa azione non può essere annullata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Numero spese:</span>
              <span className="font-bold">{expenseCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Totale da eliminare:</span>
              <span className="font-bold text-destructive">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* PIN Display */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">PIN di conferma:</span>{' '}
              <span className="font-mono text-lg font-bold tracking-widest">{CONFIRM_PIN}</span>
            </AlertDescription>
          </Alert>

          {/* PIN Input */}
          <div className="space-y-2">
            <Label>Inserisci il PIN per confermare</Label>
            <div className="flex justify-center">
              <InputOTP maxLength={4} value={pin} onChange={setPin}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <Label htmlFor="confirm-delete" className="text-sm leading-tight cursor-pointer">
              Confermo di voler eliminare definitivamente tutte le {expenseCount} spese del mese
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina Definitivamente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
