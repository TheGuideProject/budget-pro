import { useState } from 'react';
import { SimpleLayout } from '@/components/simple/SimpleLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Send, ArrowRightLeft, Plus, UserPlus, X, Loader2 } from 'lucide-react';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SimpleFamily() {
  const { transfers, createTransfer, loading } = useBudgetTransfers();
  const { profile, linkedProfile } = useUserProfile();
  
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isSending, setIsSending] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Generate next 6 months for selection
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: it }),
    };
  });

  const handleSendTransfer = async () => {
    if (!linkedProfile) {
      toast.error('Nessun familiare collegato');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await createTransfer(
        linkedProfile.userId,
        numAmount,
        selectedMonth,
        description || undefined
      );

      if (error) {
        toast.error('Errore durante l\'invio');
      } else {
        toast.success(`${formatCurrency(numAmount)} inviati!`);
        setShowSendDialog(false);
        setAmount('');
        setDescription('');
      }
    } finally {
      setIsSending(false);
    }
  };

  const recentTransfers = transfers.slice(0, 5);

  return (
    <SimpleLayout title="Famiglia">
      <div className="p-4 space-y-6 pb-24">
        {/* Family Header */}
        <div className="neo-glass p-6 text-center gradient-mesh-bg">
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Users className="h-10 w-10 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-1">Budget Familiare</h2>
            <p className="text-sm text-muted-foreground">
              {linkedProfile 
                ? `Collegato con ${linkedProfile.displayName}`
                : 'Gestisci le spese condivise con la tua famiglia'
              }
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 neo-glass border-border/50"
            onClick={() => setShowSendDialog(true)}
            disabled={!linkedProfile}
          >
            <Send className="h-5 w-5 text-primary" />
            <span className="text-sm">Invia denaro</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 neo-glass border-border/50"
            onClick={() => setShowHistoryDialog(true)}
          >
            <ArrowRightLeft className="h-5 w-5 text-accent" />
            <span className="text-sm">Trasferimenti</span>
          </Button>
        </div>

        {/* No Family Member Warning */}
        {!linkedProfile && (
          <Card className="neo-glass border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Collega un familiare per iniziare a inviare denaro
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Transfers */}
        <Card className="neo-glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Trasferimenti recenti</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => setShowHistoryDialog(true)}
              >
                Vedi tutti
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentTransfers.length === 0 ? (
              <div className="text-center py-8">
                <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm">Nessun trasferimento</p>
                <p className="text-xs text-muted-foreground mt-1">
                  I trasferimenti appariranno qui
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {transfer.description?.slice(0, 2).toUpperCase() || 'TR'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {transfer.description || 'Trasferimento'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transfer.transferDate || transfer.month), 'd MMM', { locale: it })}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">
                      {formatCurrency(transfer.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Family Member */}
        <Card className="neo-glass border-dashed border-2 border-border/50">
          <CardContent className="p-6 text-center">
            <UserPlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-medium mb-1">Invita un familiare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Condividi il budget con i membri della tua famiglia
            </p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Genera codice invito
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Send Money Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="neo-glass-static">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Invia denaro
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {linkedProfile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {linkedProfile.displayName?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">A: {linkedProfile.displayName}</p>
                  <p className="text-xs text-muted-foreground">Familiare collegato</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Mese di riferimento</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione (opzionale)</Label>
              <Textarea
                id="description"
                placeholder="Es: Budget spesa marzo"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleSendTransfer}
              disabled={isSending || !amount}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Invia {amount ? formatCurrency(parseFloat(amount) || 0) : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfers History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="neo-glass-static max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-accent" />
              Storico trasferimenti
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 pt-2">
            {transfers.length === 0 ? (
              <div className="text-center py-8">
                <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm">Nessun trasferimento</p>
              </div>
            ) : (
              transfers.map((transfer) => (
                <div key={transfer.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {transfer.description?.slice(0, 2).toUpperCase() || 'TR'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {transfer.description || 'Trasferimento'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transfer.createdAt), 'd MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(transfer.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SimpleLayout>
  );
}
