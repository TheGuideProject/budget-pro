import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Wallet, 
  FilePlus,
  TrendingUp,
  CalendarDays,
  LogOut,
  FolderOpen,
  Sparkles,
  Zap,
  Receipt,
  Users,
  Mic,
  CalendarPlus,
  Landmark,
  Brain,
  Smartphone,
  BookOpen,
  Shield,
  Settings,
  CreditCard,
  ChevronDown,
  ChevronRight,
  PiggyBank,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AIAssistantSheet } from '@/components/ai/AIAssistantSheet';
import { VoiceExpenseDialog } from '@/components/expense/VoiceExpenseDialog';
import { QuickExpenseDialog } from '@/components/expense/QuickExpenseDialog';
import { OCRScannerDialog } from '@/components/expense/OCRScannerDialog';
import { QuickEventDialog } from '@/components/calendar/QuickEventDialog';
import { BankOCRDialog } from '@/components/expense/BankOCRDialog';
import { generateUserManualPdf } from '@/utils/generateUserManualPdf';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import budgetProLogo from '@/assets/budgetpro-logo.png';

interface SidebarProps {
  onNavigate?: () => void;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isSecondary, incomeType, setAppMode, loading: profileLoading } = useUserProfile();
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const isMobile = useIsMobile();
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    finanze: true,
    gestione: false
  });
  
  const isEmployee = incomeType === 'employee';
  const isFamilyMember = incomeType === 'family_member';

  const handleLogout = async () => {
    await signOut();
  };

  const handleSwitchToSimple = async () => {
    await setAppMode('simple');
    navigate('/simple-home');
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Main navigation items (always visible)
  const mainNav = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Calendario', href: '/calendar', icon: CalendarDays },
  ];

  // Grouped navigation
  const financeGroup: NavGroup = {
    name: 'Finanze',
    icon: PiggyBank,
    items: [
      { name: 'Spese', href: '/spese', icon: Receipt },
      { name: 'Budget', href: '/budget', icon: Wallet },
      ...(!isSecondary && !isFamilyMember ? [{ name: 'Fatture', href: '/invoices', icon: FileText }] : []),
      { name: 'Famiglia', href: '/family-budget', icon: Users },
    ]
  };

  const managementGroup: NavGroup = {
    name: 'Gestione',
    icon: Briefcase,
    items: [
      ...(!isSecondary && !isFamilyMember ? [{ name: 'Bollette', href: '/bollette', icon: Zap }] : []),
      { name: 'Spese Fisse', href: '/spese-fisse', icon: TrendingUp },
      ...(!isSecondary && !isEmployee && !isFamilyMember ? [{ name: 'Progetti', href: '/projects', icon: FolderOpen }] : []),
    ]
  };

  // AI Analysis (standalone)
  const analysisNav = !isSecondary && !isFamilyMember ? [
    { name: 'Analisi AI', href: '/analytics', icon: Brain },
  ] : [];

  // Check if current path is within a group
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.href);
  };

  // Auto-expand group if it contains active route
  const isGroupExpanded = (groupName: string, group: NavGroup) => {
    return expandedGroups[groupName] || isGroupActive(group);
  };

  const renderNavItem = (item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }, indented = false) => {
    const isActive = location.pathname === item.href;
    return (
      <NavLink
        key={item.name}
        to={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
          indented && 'ml-3 pl-6',
          isActive
            ? 'sidebar-indicator bg-sidebar-accent/60 text-sidebar-foreground'
            : 'text-sidebar-foreground/60 sidebar-hover-glow hover:text-sidebar-foreground'
        )}
      >
        <item.icon className={cn(
          "h-4 w-4 transition-colors",
          isActive ? "text-primary" : ""
        )} />
        {item.name}
      </NavLink>
    );
  };

  const renderNavGroup = (group: NavGroup, groupKey: string) => {
    const isExpanded = isGroupExpanded(groupKey, group);
    const hasActiveItem = isGroupActive(group);
    
    if (group.items.length === 0) return null;
    
    return (
      <Collapsible
        key={groupKey}
        open={isExpanded}
        onOpenChange={() => toggleGroup(groupKey)}
        className="sidebar-glass-card overflow-hidden"
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-all duration-200',
              hasActiveItem 
                ? 'text-sidebar-foreground'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <group.icon className={cn(
                "h-4 w-4",
                hasActiveItem ? "text-primary" : "text-sidebar-foreground/50"
              )} />
              {group.name}
            </div>
            <div className={cn(
              "h-5 w-5 rounded flex items-center justify-center transition-all duration-200",
              isExpanded ? "bg-primary/20" : "bg-sidebar-accent/50"
            )}>
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-2">
          <div className="space-y-0.5">
            {group.items.map(item => renderNavItem(item, true))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className="h-screen w-64 sidebar-gradient flex flex-col">
      {/* Premium Logo Header */}
      <div className="flex flex-col items-center gap-3 px-4 py-6 border-b border-sidebar-border/50">
        <div className="relative">
          <img 
            src={budgetProLogo} 
            alt="BudgetPro" 
            className="h-14 w-14 rounded-2xl object-cover"
          />
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-accent border-2 border-sidebar-background" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold gradient-text">BudgetPro</h1>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">Gestione Finanze Pro</p>
        </div>
        <div className="w-full sidebar-fade-line mt-2" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        {/* Main Navigation */}
        <div className="space-y-0.5 mb-4">
          {mainNav.map(item => renderNavItem(item))}
        </div>

        {/* Collapsible Groups */}
        <div className="space-y-3">
          {renderNavGroup(financeGroup, 'finanze')}
          {renderNavGroup(managementGroup, 'gestione')}
        </div>

        {/* Analysis - Standalone */}
        {analysisNav.length > 0 && (
          <div className="pt-4 space-y-0.5">
            {analysisNav.map(item => renderNavItem(item))}
          </div>
        )}
        
        {/* Quick Actions - Only on Desktop */}
        {!isMobile && (
          <div className="pt-4 mt-4">
            <div className="sidebar-fade-line mb-4" />
            <p className="px-2 py-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
              Azioni Rapide
            </p>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <VoiceExpenseDialog 
                trigger={
                  <button className="sidebar-action-card">
                    <Mic className="h-6 w-6 text-purple-400" />
                    <span className="text-xs font-semibold text-sidebar-foreground/70">Voce</span>
                  </button>
                }
              />
              
              <QuickExpenseDialog 
                trigger={
                  <button className="sidebar-action-card">
                    <Receipt className="h-6 w-6 text-emerald-400" />
                    <span className="text-xs font-semibold text-sidebar-foreground/70">Spesa</span>
                  </button>
                }
              />
              
              <OCRScannerDialog 
                trigger={
                  <button className="sidebar-action-card">
                    <Sparkles className="h-6 w-6 text-amber-400" />
                    <span className="text-xs font-semibold text-sidebar-foreground/70">OCR</span>
                  </button>
                }
              />
              
              <QuickEventDialog 
                trigger={
                  <button className="sidebar-action-card">
                    <CalendarPlus className="h-6 w-6 text-sky-400" />
                    <span className="text-xs font-semibold text-sidebar-foreground/70">Evento</span>
                  </button>
                }
              />
            </div>
            
            <div className="mt-3 space-y-1">
              <BankOCRDialog 
                trigger={
                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 sidebar-hover-glow hover:text-sidebar-foreground transition-all duration-200">
                    <Landmark className="h-4 w-4 text-accent" />
                    Import Banca
                  </button>
                }
              />

              {!isSecondary && !isEmployee && !isFamilyMember && (
                <NavLink
                  to="/new-invoice"
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 sidebar-hover-glow hover:text-sidebar-foreground transition-all duration-200"
                >
                  <FilePlus className="h-4 w-4 text-primary" />
                  Nuova Fattura
                </NavLink>
              )}
            </div>
          </div>
        )}

        {/* Admin Section */}
        {!adminLoading && isAdmin && (
          <div className="pt-4 mt-4">
            <div className="sidebar-fade-line mb-4" />
            <p className="px-2 py-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Admin
            </p>
            
            <div className="space-y-0.5">
              {[
                { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
                { name: 'Utenti', href: '/admin/users', icon: Users },
                { name: 'Piani', href: '/admin/plans', icon: CreditCard },
                { name: 'Settings', href: '/admin/settings', icon: Settings },
              ].map(item => renderNavItem(item))}
            </div>
          </div>
        )}
      </nav>

      {/* Premium Footer */}
      <div className="border-t border-sidebar-border/50 p-4 space-y-3">
        {/* AI Assistant CTA */}
        <Button
          onClick={() => setShowAIAssistant(true)}
          className="w-full justify-center gap-2 h-10 sidebar-cta-gradient border-0 text-white font-semibold"
        >
          <Sparkles className="h-4 w-4" />
          Assistente AI
        </Button>
        <AIAssistantSheet 
          open={showAIAssistant} 
          onOpenChange={setShowAIAssistant} 
        />
        
        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-1">
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all',
              location.pathname === '/profile' 
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Users className="h-4 w-4" />
            <span className="text-[9px]">Profilo</span>
          </NavLink>
          
          <button 
            className="flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
            onClick={() => generateUserManualPdf()}
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-[9px]">Manuale</span>
          </button>
          
          <button 
            className="flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
            onClick={handleSwitchToSimple}
          >
            <Smartphone className="h-4 w-4" />
            <span className="text-[9px]">Simple</span>
          </button>
          
          <button 
            className="flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[9px]">Esci</span>
          </button>
        </div>
        
        {/* Version Badge */}
        <div className="text-center pt-1">
          <span className="text-[9px] text-sidebar-foreground/30 font-mono">v1.2.0</span>
        </div>
      </div>
    </aside>
  );
}
