import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, Wallet, Users, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/simple-home' },
  { icon: CalendarDays, label: 'Calendario', path: '/simple-calendar' },
  { icon: Wallet, label: 'Budget', path: '/simple-budget' },
  { icon: Users, label: 'Famiglia', path: '/simple-family' },
  { icon: Sparkles, label: 'AI', path: '/simple-ai' },
];

export function SimpleBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="simple-bottom-nav">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'simple-nav-item relative flex-1 max-w-16',
                isActive && 'active'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 transition-all duration-300',
                isActive ? 'text-primary scale-110' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-[10px] font-medium transition-all duration-300',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
        
        {/* Add Button - Center FAB */}
        <button
          onClick={() => navigate('/simple-expenses')}
          className="simple-nav-add relative flex-1 max-w-16 flex flex-col items-center justify-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95">
            <Plus className="h-5 w-5 text-primary-foreground" />
          </div>
        </button>
      </div>
    </nav>
  );
}
