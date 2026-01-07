import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserProfileProvider, useUserProfile } from "@/hooks/useUserProfile";
import Index from "./pages/Index";
import Invoices from "./pages/Invoices";
import Budget from "./pages/Budget";
import Projects from "./pages/Projects";
import NewInvoice from "./pages/NewInvoice";
import Calendar from "./pages/Calendar";
import Bollette from "./pages/Bollette";
import SpeseFisse from "./pages/SpeseFisse";
import FamilyBudget from "./pages/FamilyBudget";
import HouseholdBudget from "./pages/HouseholdBudget";
import Spese from "./pages/Spese";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import ModeSelection from "./pages/ModeSelection";
import SimpleHome from "./pages/SimpleHome";
import SimpleExpenses from "./pages/SimpleExpenses";
import SimpleCalendar from "./pages/SimpleCalendar";
import SimpleBudget from "./pages/SimpleBudget";
import SimpleFamily from "./pages/SimpleFamily";
import SimpleAI from "./pages/SimpleAI";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Debug from "./pages/Debug";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminSettings from "./pages/admin/AdminSettings";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <UserProfileProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </UserProfileProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

function AppContent() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/mode-selection" element={<ProtectedRoute><ModeSelection /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/simple-home" element={<ProtectedRoute requireMode="simple"><SimpleHome /></ProtectedRoute>} />
      <Route path="/simple-expenses" element={<ProtectedRoute requireMode="simple"><SimpleExpenses /></ProtectedRoute>} />
      <Route path="/simple-calendar" element={<ProtectedRoute requireMode="simple"><SimpleCalendar /></ProtectedRoute>} />
      <Route path="/simple-budget" element={<ProtectedRoute requireMode="simple"><SimpleBudget /></ProtectedRoute>} />
      <Route path="/simple-family" element={<ProtectedRoute requireMode="simple"><SimpleFamily /></ProtectedRoute>} />
      <Route path="/simple-ai" element={<ProtectedRoute requireMode="simple"><SimpleAI /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute requireMode="extended"><Index /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute requireMode="extended"><Invoices /></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute requireMode="extended"><Budget /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute requireMode="extended"><Projects /></ProtectedRoute>} />
      <Route path="/new-invoice" element={<ProtectedRoute requireMode="extended"><NewInvoice /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute requireMode="extended"><Calendar /></ProtectedRoute>} />
      <Route path="/bollette" element={<ProtectedRoute requireMode="extended"><Bollette /></ProtectedRoute>} />
      <Route path="/spese-fisse" element={<ProtectedRoute requireMode="extended"><SpeseFisse /></ProtectedRoute>} />
      <Route path="/family-budget" element={<ProtectedRoute requireMode="extended"><FamilyBudget /></ProtectedRoute>} />
      <Route path="/household" element={<ProtectedRoute requireMode="extended"><HouseholdBudget /></ProtectedRoute>} />
      <Route path="/spese" element={<ProtectedRoute requireMode="extended"><Spese /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute requireMode="extended"><Analytics /></ProtectedRoute>} />
      <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute><AdminPlans /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMode?: 'simple' | 'extended';
}

function ProtectedRoute({ children, requireMode }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, appMode, profile, incomeType } = useUserProfile();
  const location = useLocation();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // New users without income type should go to onboarding first
  if (profile && !incomeType && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If no mode is set and we're not on mode-selection or onboarding, redirect to mode-selection
  if (requireMode && profile && !appMode && location.pathname !== '/mode-selection' && location.pathname !== '/onboarding') {
    return <Navigate to="/mode-selection" replace />;
  }

  // If mode is set and user is trying to access wrong mode's pages
  if (requireMode && appMode && appMode !== requireMode) {
    if (appMode === 'simple') {
      return <Navigate to="/simple-home" replace />;
    } else if (appMode === 'extended') {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default App;
