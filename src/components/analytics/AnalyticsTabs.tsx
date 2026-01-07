import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calendar, PiggyBank, TrendingUp, Sliders } from 'lucide-react';
import { WorkPlanTimeline } from './WorkPlanTimeline';
import { ExpectedExpensesTab } from './ExpectedExpensesTab';
import { PensionGoalTab } from './PensionGoalTab';
import { OverviewTab } from './OverviewTab';
import { WhatIfSimulator } from './WhatIfSimulator';
import { useBudgetStore } from '@/store/budgetStore';

export function AnalyticsTabs() {
  const { expenses, invoices } = useBudgetStore();

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-6">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="work-plan" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Piano Lavoro</span>
        </TabsTrigger>
        <TabsTrigger value="expected" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Spese Previste</span>
        </TabsTrigger>
        <TabsTrigger value="pension" className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4" />
          <span className="hidden sm:inline">Pensione</span>
        </TabsTrigger>
        <TabsTrigger value="whatif" className="flex items-center gap-2">
          <Sliders className="h-4 w-4" />
          <span className="hidden sm:inline">What-If</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab expenses={expenses} invoices={invoices} />
      </TabsContent>

      <TabsContent value="work-plan">
        <WorkPlanTimeline invoices={invoices} expenses={expenses} />
      </TabsContent>

      <TabsContent value="expected">
        <ExpectedExpensesTab />
      </TabsContent>

      <TabsContent value="pension">
        <PensionGoalTab />
      </TabsContent>

      <TabsContent value="whatif">
        <WhatIfSimulator />
      </TabsContent>
    </Tabs>
  );
}
