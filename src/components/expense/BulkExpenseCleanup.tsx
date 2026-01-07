import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface MonthStats {
  month: string;
  count: number;
  total: number;
  isAnomaly: boolean;
}

interface BulkExpenseCleanupProps {
  onCleanupComplete: () => void;
}

export function BulkExpenseCleanup({ onCleanupComplete }: BulkExpenseCleanupProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [monthStats, setMonthStats] = useState<MonthStats[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const fetchMonthStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('id, date, amount')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(15000);

      if (error) throw error;

      // Group by month
      const monthMap = new Map<string, { count: number; total: number }>();
      
      expenses?.forEach(exp => {
        const date = new Date(exp.date);
        const monthKey = format(date, 'yyyy-MM');
        const existing = monthMap.get(monthKey) || { count: 0, total: 0 };
        monthMap.set(monthKey, {
          count: existing.count + 1,
          total: existing.total + Number(exp.amount)
        });
      });

      // Convert to array and mark anomalies (>100 expenses per month)
      const stats: MonthStats[] = Array.from(monthMap.entries())
        .map(([month, data]) => ({
          month,
          count: data.count,
          total: data.total,
          isAnomaly: data.count > 100
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      setMonthStats(stats);
    } catch (error) {
      console.error('Error fetching month stats:', error);
      toast.error('Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMonthStats();
      setSelectedMonths([]);
    }
  }, [open, user]);

  const handleDeleteSelectedMonths = async () => {
    if (!user || selectedMonths.length === 0) return;

    setDeleting(true);
    try {
      let totalDeleted = 0;

      for (const month of selectedMonths) {
        const startDate = `${month}-01T00:00:00`;
        const [year, monthNum] = month.split('-').map(Number);
        const nextMonth = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, '0')}`;
        const endDate = `${nextMonth}-01T00:00:00`;

        const { error, count } = await supabase
          .from('expenses')
          .delete()
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lt('date', endDate);

        if (error) throw error;
        totalDeleted += count || 0;
      }

      toast.success(`Eliminate ${totalDeleted} spese`);
      setSelectedMonths([]);
      onCleanupComplete();
      setOpen(false);
    } catch (error) {
      console.error('Error deleting expenses:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const selectAllAnomalies = () => {
    const anomalyMonths = monthStats.filter(m => m.isAnomaly).map(m => m.month);
    setSelectedMonths(anomalyMonths);
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return format(date, 'MMMM yyyy', { locale: it });
  };

  const anomalyCount = monthStats.filter(m => m.isAnomaly).length;
  const selectedCount = selectedMonths.reduce((acc, month) => {
    const stat = monthStats.find(m => m.month === month);
    return acc + (stat?.count || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          Pulizia spese
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pulizia Spese in Blocco
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {anomalyCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Rilevati {anomalyCount} mesi con numero anomalo di spese</strong> (più di 100 spese/mese).
                  Questi potrebbero essere errori di importazione.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={selectAllAnomalies}
                >
                  Seleziona tutti i mesi anomali
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Mese</TableHead>
                  <TableHead className="text-right">N° Spese</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthStats.map((stat) => (
                  <TableRow 
                    key={stat.month}
                    className={stat.isAnomaly ? 'bg-destructive/5' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedMonths.includes(stat.month)}
                        onCheckedChange={() => toggleMonth(stat.month)}
                      />
                    </TableCell>
                    <TableCell className="font-medium capitalize">
                      {formatMonthLabel(stat.month)}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.count.toLocaleString('it-IT')}
                    </TableCell>
                    <TableCell className="text-right">
                      €{stat.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {stat.isAnomaly && (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Anomalo
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {selectedMonths.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm">
                  <strong>{selectedMonths.length} mesi selezionati</strong> ({selectedCount.toLocaleString('it-IT')} spese)
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelectedMonths}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Eliminazione...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina spese selezionate
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
