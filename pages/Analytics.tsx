import { Layout } from '@/components/layout/Layout';
import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs';
import { Brain } from 'lucide-react';

export default function Analytics() {
  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Analisi Predittiva AI
          </h1>
          <p className="text-muted-foreground mt-1">
            Financial Planner Operativo - Piano lavoro, spese previste e obiettivo pensione
          </p>
        </div>

        <AnalyticsTabs />
      </div>
    </Layout>
  );
}
