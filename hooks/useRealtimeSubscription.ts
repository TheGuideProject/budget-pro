import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetStore } from '@/store/budgetStore';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to subscribe to realtime updates for invoices, expenses, and other budget-related tables.
 * Automatically refetches data when changes are detected.
 */
export function useRealtimeSubscription() {
  const { user } = useAuth();
  const { fetchData } = useBudgetStore();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Debounced fetch to avoid too many refetches
  const debouncedFetch = useCallback(() => {
    const now = Date.now();
    // Minimum 1 second between fetches (reduced from 2s for faster updates)
    if (now - lastFetchRef.current < 1000) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        lastFetchRef.current = Date.now();
        fetchData();
      }, 1000);
      return;
    }
    
    lastFetchRef.current = now;
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user) return;

    console.log('[Realtime] Setting up subscriptions for user:', user.id);

    // Subscribe to invoices changes
    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          console.log('[Realtime] Invoice change:', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Invoices subscription status:', status);
      });

    // Subscribe to expenses changes
    const expensesChannel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Expense change:', payload.eventType, payload);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Expenses subscription status:', status);
      });

    // Subscribe to expected_expenses changes
    const expectedExpensesChannel = supabase
      .channel('expected-expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expected_expenses',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Expected expense change:', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Expected expenses subscription status:', status);
      });

    // Subscribe to budget_transfers changes
    const transfersChannel = supabase
      .channel('transfers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_transfers',
        },
        (payload) => {
          console.log('[Realtime] Transfer change:', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Transfers subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Cleaning up subscriptions');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(expectedExpensesChannel);
      supabase.removeChannel(transfersChannel);
    };
  }, [user, debouncedFetch]);
}
