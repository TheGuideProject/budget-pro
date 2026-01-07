import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBudgetStore } from '@/store/budgetStore';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { LogOut, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SimpleBottomNav } from './SimpleBottomNav';
import logoImg from '@/assets/budgetpro-logo.png';

interface SimpleLayoutProps {
  children: ReactNode;
  title?: string;
}

export function SimpleLayout({ children, title }: SimpleLayoutProps) {
  const { user, signOut } = useAuth();
  const { profile, setAppMode, loading } = useUserProfile();
  const { fetchData } = useBudgetStore();

  // Enable realtime subscriptions
  useRealtimeSubscription();

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const navigate = useNavigate();

  const handleSwitchToExtended = async () => {
    const { error } = await setAppMode('extended');
    if (error) {
      toast.error('Errore durante il cambio modalità');
    } else {
      navigate('/');
      toast.success('Modalità completa attivata');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = profile?.displayName?.slice(0, 2).toUpperCase() || 'U';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="simple-header-glass sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="BudgetPro" className="h-7 w-7" />
            {title && <h1 className="text-base font-semibold">{title}</h1>}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 neo-glass">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSwitchToExtended}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Passa a versione completa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <SimpleBottomNav />
    </div>
  );
}
