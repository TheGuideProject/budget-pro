import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { UnpaidBillsAlert } from './UnpaidBillsAlert';
import { MobileQuickActions } from './MobileQuickActions';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBudgetStore } from '@/store/budgetStore';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { fetchData } = useBudgetStore();

  useRealtimeSubscription();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background">
      {/* Unpaid Bills Alert */}
      <div className={isMobile ? 'fixed top-0 left-0 right-0 z-[60]' : 'fixed top-0 left-64 right-0 z-[60]'}>
        <UnpaidBillsAlert />
      </div>

      {/* Mobile header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur-xl border-b border-border flex items-center px-4 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-6 w-6 text-black dark:text-white" />
          </Button>
          <div className="ml-3 flex items-center gap-2">
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BudgetPro
            </span>
          </div>
        </header>
      )}

      {/* Sidebar overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'fixed left-0 top-0 z-40'
        }
      `}>
        {isMobile && sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 text-[hsl(var(--sidebar-foreground))] z-10"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className={isMobile ? 'pt-14 pb-24' : 'pl-64'}>
        <div className="min-h-screen p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Quick Actions FAB */}
      <MobileQuickActions />
    </div>
  );
}
