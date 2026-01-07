import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  display_name: string | null;
  role: string | null;
  subscription_status: string | null;
  plan_name: string | null;
}

// Fetch all users with their profiles and subscriptions
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, created_at');

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get all subscriptions with plan info
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          plan_id,
          subscription_plans (name)
        `);

      if (subsError) throw subsError;

      // Combine data
      const usersMap = new Map<string, UserWithProfile>();

      profiles?.forEach((profile: { user_id: string; display_name: string | null; created_at: string }) => {
        usersMap.set(profile.user_id, {
          id: profile.user_id,
          email: '',
          created_at: profile.created_at,
          display_name: profile.display_name,
          role: null,
          subscription_status: null,
          plan_name: null,
        });
      });

      roles?.forEach((role: { user_id: string; role: string }) => {
        const user = usersMap.get(role.user_id);
        if (user) {
          user.role = role.role;
        }
      });

      subscriptions?.forEach((sub: { user_id: string; status: string; subscription_plans: { name: string } | null }) => {
        const user = usersMap.get(sub.user_id);
        if (user) {
          user.subscription_status = sub.status;
          user.plan_name = sub.subscription_plans?.name || null;
        }
      });

      return Array.from(usersMap.values());
    },
  });
}

// Fetch subscription plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
}

// Create subscription plan
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Piano creato con successo');
    },
    onError: (error) => {
      toast.error('Errore nella creazione del piano: ' + error.message);
    },
  });
}

// Update subscription plan
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Piano aggiornato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });
}

// Delete subscription plan
export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Piano eliminato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });
}

// Assign role to user
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'super_admin' | 'user' }) => {
      // First try to update existing role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Ruolo assegnato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });
}

// Assign subscription to user
export function useAssignSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, planId }: { userId: string; planId: string }) => {
      // Check if user already has subscription
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            status: 'active',
            current_period_start: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            current_period_start: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Abbonamento assegnato');
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    },
  });
}

// Get admin dashboard stats
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: activeSubscriptions },
        { data: planStats },
        { data: recentActivity },
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_subscriptions').select('plan_id, subscription_plans(name, price)').eq('status', 'active'),
        supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      // Calculate revenue
      let monthlyRevenue = 0;
      planStats?.forEach((sub: { subscription_plans: { price: number } | null }) => {
        if (sub.subscription_plans?.price) {
          monthlyRevenue += sub.subscription_plans.price;
        }
      });

      return {
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        monthlyRevenue,
        recentActivity: recentActivity || [],
      };
    },
  });
}
