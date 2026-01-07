import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { BillUploader } from '@/components/budget/BillUploader';
import { BillForecast } from '@/components/budget/BillForecast';
import { BulkBillUploader } from '@/components/budget/BulkBillUploader';
import { PortalScreenshotUploader } from '@/components/budget/PortalScreenshotUploader';
import { PendingBills } from '@/components/budget/PendingBills';
import { BillHistory } from '@/components/budget/BillHistory';
import { PendingLoans } from '@/components/budget/PendingLoans';
import { LoanHistory } from '@/components/budget/LoanHistory';
import { ConsumptionTracker } from '@/components/budget/ConsumptionTracker';
import { ConsumptionForecast } from '@/components/budget/ConsumptionForecast';
import { useBudgetStore } from '@/store/budgetStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, List, Zap, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isUtilityBill, isLoanPayment } from '@/utils/expenseClassification';
import { DebugPanel } from '@/components/debug/DebugPanel';

type FilterMode = 'all' | 'next30';

export default function Bollette() {
  const { expenses } = useBudgetStore();
  const [filterMode, setFilterMode] = useState<FilterMode>('next30');
  const [activeTab, setActiveTab] = useState<'utilities' | 'loans'>('utilities');

  // Filter expenses based on mode
  const filteredExpenses = filterMode === 'next30'
    ? expenses.filter(exp => {
        if (!exp.billType && !exp.billProvider) return false;
        const expDate = new Date(exp.date);
        const today = new Date();
        const in30Days = new Date();
        in30Days.setDate(today.getDate() + 30);
        return expDate >= today && expDate <= in30Days;
      })
    : expenses;

  // Count pending utilities using centralized classification
  const pendingUtilitiesCount = expenses.filter(
    (exp) => isUtilityBill(exp) && !isLoanPayment(exp) && exp.isPaid === false
  ).length;

  const paidUtilitiesCount = expenses.filter(
    (exp) => isUtilityBill(exp) && !isLoanPayment(exp) && exp.isPaid === true
  ).length;

  // Count pending loans
  const pendingLoansCount = expenses.filter(
    (exp) => isLoanPayment(exp) && exp.isPaid === false
  ).length;

  const paidLoansCount = expenses.filter(
    (exp) => isLoanPayment(exp) && exp.isPaid === true
  ).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Bollette & Rate</h1>
            <p className="text-muted-foreground">
              Gestisci bollette utenze e rate prestiti separatamente
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm py-1 px-3">
              <span className="text-warning mr-1">●</span>
              {pendingUtilitiesCount + pendingLoansCount} da pagare
            </Badge>
            <Badge variant="outline" className="text-sm py-1 px-3">
              <span className="text-success mr-1">●</span>
              {paidUtilitiesCount + paidLoansCount} pagate
            </Badge>
          </div>
        </div>

        {/* Debug Panel */}
        <DebugPanel
          title="Conteggio Bollette & Rate"
          hookName="useBudgetStore().expenses + isUtilityBill/isLoanPayment"
          calculation={`pendingUtilities = expenses.filter(isUtilityBill && !isLoanPayment && isPaid === false)
paidUtilities = expenses.filter(isUtilityBill && !isLoanPayment && isPaid === true)
pendingLoans = expenses.filter(isLoanPayment && isPaid === false)
paidLoans = expenses.filter(isLoanPayment && isPaid === true)`}
          values={[
            { label: 'Utenze da pagare', value: pendingUtilitiesCount },
            { label: 'Utenze pagate', value: paidUtilitiesCount },
            { label: 'Rate da pagare', value: pendingLoansCount },
            { label: 'Rate pagate', value: paidLoansCount },
            { label: 'Totale da pagare', value: pendingUtilitiesCount + pendingLoansCount },
            { label: 'Totale pagate', value: paidUtilitiesCount + paidLoansCount },
            { label: 'Expenses Totali Store', value: expenses.length, isRaw: true },
          ]}
          dataSource="Supabase: expenses table via useBudgetStore()"
        />

        {/* Tabs: Utilities vs Loans */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'utilities' | 'loans')}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="utilities" className="gap-2">
                <Zap className="h-4 w-4" />
                <span>Utenze</span>
                {pendingUtilitiesCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {pendingUtilitiesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="loans" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Rate/Prestiti</span>
                {pendingLoansCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {pendingLoansCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <span className="text-sm text-muted-foreground mr-2 hidden sm:block">Visualizza:</span>
              <div className="flex items-center rounded-lg border bg-muted/30 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 sm:px-3 rounded-md text-xs sm:text-sm",
                    filterMode === 'next30' && "bg-background shadow-sm"
                  )}
                  onClick={() => setFilterMode('next30')}
                >
                  <Calendar className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Prossimi 30 giorni</span>
                  <span className="sm:hidden">30gg</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 sm:px-3 rounded-md text-xs sm:text-sm",
                    filterMode === 'all' && "bg-background shadow-sm"
                  )}
                  onClick={() => setFilterMode('all')}
                >
                  <List className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Tutte</span>
                  <span className="sm:hidden">Tutte</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Utilities Tab Content */}
          <TabsContent value="utilities" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consumption Tracker - Full width */}
              <div className="lg:col-span-2">
                <ConsumptionTracker />
              </div>

              {/* Pending Bills - Full width */}
              <div className="lg:col-span-2">
                <PendingBills filterMode={filterMode} type="utilities" />
              </div>

              {/* Single Bill Uploader */}
              <BillUploader />

              {/* Bulk Bill Uploader */}
              <BulkBillUploader />

              {/* Portal Screenshot Uploader */}
              <PortalScreenshotUploader />

              {/* Consumption Forecast - Full width */}
              <div className="lg:col-span-2">
                <ConsumptionForecast />
              </div>

              {/* Bill Forecast - Full width */}
              <div className="lg:col-span-2">
                <BillForecast expenses={filteredExpenses} />
              </div>

              {/* Bill History - Full width */}
              <div className="lg:col-span-2">
                <BillHistory filterMode={filterMode} type="utilities" />
              </div>
            </div>
          </TabsContent>

          {/* Loans Tab Content */}
          <TabsContent value="loans" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Loans - Full width */}
              <div className="lg:col-span-2">
                <PendingLoans filterMode={filterMode} />
              </div>

              {/* Loan History - Full width */}
              <div className="lg:col-span-2">
                <LoanHistory filterMode={filterMode} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
