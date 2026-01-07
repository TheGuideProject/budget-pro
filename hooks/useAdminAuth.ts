import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'super_admin' | 'user';

interface AdminAuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  role: AppRole | null;
}

export function useAdminAuth(): AdminAuthState {
  const { user } = useAuth();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isSuperAdmin: false,
    isLoading: true,
    role: null,
  });

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setState({ isAdmin: false, isSuperAdmin: false, isLoading: false, role: null });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking admin status:', error);
          setState({ isAdmin: false, isSuperAdmin: false, isLoading: false, role: null });
          return;
        }

        const role = data?.role as AppRole | null;
        setState({
          isAdmin: role === 'admin' || role === 'super_admin',
          isSuperAdmin: role === 'super_admin',
          isLoading: false,
          role,
        });
      } catch (err) {
        console.error('Error in admin auth check:', err);
        setState({ isAdmin: false, isSuperAdmin: false, isLoading: false, role: null });
      }
    }

    checkAdminStatus();
  }, [user]);

  return state;
}

// Hook for admin activity logging
export function useAdminActivityLog() {
  const { user } = useAuth();

  const logActivity = async (
    action: string,
    targetTable?: string,
    targetId?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;

    try {
      // Using rpc or raw SQL would be cleaner but for simplicity we cast
      const insertData = {
        admin_user_id: user.id,
        action,
        target_table: targetTable || null,
        target_id: targetId || null,
        details: details || null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('admin_activity_log') as any).insert([insertData]);
    } catch (err) {
      console.error('Failed to log admin activity:', err);
    }
  };

  return { logActivity };
}
