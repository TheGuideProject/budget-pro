import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowDownCircle, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBudgetTransfers } from '@/hooks/useBudgetTransfers';
import { useAuth } from '@/contexts/AuthContext';

interface FamilyTransfersListProps {
  selectedYear?: number;
}

export function FamilyTransfersList({ selectedYear }: FamilyTransfersListProps) {
  const { user } = useAuth();
  const { transfers, loading } = useBudgetTransfers();

  // Filter transfers received by current user
  const receivedTransfers = transfers.filter(t => {
    if (!user) return false;
    if (t.toUserId !== user.id) return false;
    if (selectedYear) {
      return new Date(t.createdAt).getFullYear() === selectedYear;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalReceived = receivedTransfers.reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Caricamento...
        </CardContent>
      </Card>
    );
  }

  if (receivedTransfers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nessun bonifico familiare ricevuto</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownCircle className="h-5 w-5 text-success" />
          Bonifici Familiari Ricevuti
        </CardTitle>
        <CardDescription>
          Totale ricevuto: {formatCurrency(totalReceived)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {receivedTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-success/10">
                    <ArrowDownCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">{transfer.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transfer.createdAt), 'dd MMMM yyyy', { locale: it })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mese: {format(new Date(transfer.month + '-01'), 'MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-success">
                    + {formatCurrency(transfer.amount)}
                  </p>
                  <Badge className="bg-success/10 text-success border-success/30">
                    Bonifico Ricevuto
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
