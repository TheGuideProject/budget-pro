import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Household, 
  HouseholdMember, 
  MemberPermissions,
  HouseholdMemberRole,
  DEFAULT_PERMISSIONS 
} from '@/types/household';
import { Json } from '@/integrations/supabase/types';

// Helper to convert DB member to typed member
function dbToHouseholdMember(dbMember: {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Json;
  joined_at: string;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}): HouseholdMember {
  return {
    ...dbMember,
    permissions: dbMember.permissions as unknown as MemberPermissions,
  };
}

export function useHousehold() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current user's household
  const { data: household, isLoading: isLoadingHousehold } = useQuery({
    queryKey: ['household', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('households')
        .select(`
          *,
          household_members!inner(*)
        `)
        .eq('household_members.user_id', user.id)
        .is('household_members.left_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No household found
        throw error;
      }
      
      return {
        ...data,
        household_members: data.household_members.map(dbToHouseholdMember),
      } as Household & { household_members: HouseholdMember[] };
    },
    enabled: !!user?.id,
  });

  // Fetch current user's membership
  const { data: currentMember, isLoading: isLoadingMember } = useQuery({
    queryKey: ['household-member', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return dbToHouseholdMember(data);
    },
    enabled: !!user?.id,
  });

  // Fetch all members of the household
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['household-members', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];
      
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household.id)
        .is('left_at', null)
        .order('role');

      if (error) throw error;
      return data.map(dbToHouseholdMember);
    },
    enabled: !!household?.id,
  });

  // Create household
  const createHousehold = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create household
      const { data: newHousehold, error: householdError } = await supabase
        .from('households')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (householdError) throw householdError;

      // Create owner membership
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: newHousehold.id,
          user_id: user.id,
          display_name: user.email?.split('@')[0] || 'Owner',
          role: 'owner' as HouseholdMemberRole,
          permissions: DEFAULT_PERMISSIONS.owner as unknown as Json,
        });

      if (memberError) throw memberError;

      return newHousehold as Household;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] });
      queryClient.invalidateQueries({ queryKey: ['household-member'] });
    },
  });

  // Update household
  const updateHousehold = useMutation({
    mutationFn: async (updates: Partial<Household>) => {
      if (!household?.id) throw new Error('No household');

      const { data, error } = await supabase
        .from('households')
        .update(updates)
        .eq('id', household.id)
        .select()
        .single();

      if (error) throw error;
      return data as Household;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] });
    },
  });

  // Invite member
  const inviteMember = useMutation({
    mutationFn: async ({ 
      displayName, 
      role = 'member' as HouseholdMemberRole,
      userId 
    }: { 
      displayName: string; 
      role?: HouseholdMemberRole;
      userId?: string;
    }) => {
      if (!household?.id) throw new Error('No household');

      const { data, error } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: userId || null,
          display_name: displayName,
          role,
          permissions: DEFAULT_PERMISSIONS[role] as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return dbToHouseholdMember(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-members'] });
    },
  });

  // Update member
  const updateMember = useMutation({
    mutationFn: async ({ 
      memberId, 
      updates 
    }: { 
      memberId: string; 
      updates: Partial<Pick<HouseholdMember, 'display_name' | 'role' | 'permissions'>>
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.display_name) dbUpdates.display_name = updates.display_name;
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.permissions) dbUpdates.permissions = updates.permissions as unknown as Json;

      const { data, error } = await supabase
        .from('household_members')
        .update(dbUpdates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return dbToHouseholdMember(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-members'] });
    },
  });

  // Remove member (soft delete)
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('household_members')
        .update({ left_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-members'] });
    },
  });

  // Helper to check permissions
  const hasPermission = (permission: keyof MemberPermissions): boolean => {
    if (!currentMember?.permissions) return false;
    return currentMember.permissions[permission] ?? false;
  };

  return {
    household,
    currentMember,
    members,
    isLoading: isLoadingHousehold || isLoadingMember || isLoadingMembers,
    isOwner: currentMember?.role === 'owner',
    isAdmin: currentMember?.role === 'owner' || currentMember?.role === 'admin',
    hasPermission,
    createHousehold,
    updateHousehold,
    inviteMember,
    updateMember,
    removeMember,
  };
}
