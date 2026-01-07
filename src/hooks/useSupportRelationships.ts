import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from './useHousehold';
import { 
  SupportRelationship, 
  PrivacyMode, 
  VisibilityScope,
  HouseholdMember,
} from '@/types/household';

export interface SupportRelationshipWithDetails extends SupportRelationship {
  supporter?: HouseholdMember;
  recipient?: HouseholdMember;
}

export function useSupportRelationships() {
  const { household, currentMember, members } = useHousehold();
  const queryClient = useQueryClient();

  // Fetch all support relationships in the household
  const { data: relationships = [], isLoading } = useQuery({
    queryKey: ['support-relationships', household?.id],
    queryFn: async () => {
      if (!household?.id) return [];

      const { data, error } = await supabase
        .from('support_relationships')
        .select('*')
        .eq('household_id', household.id)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`);

      if (error) throw error;
      
      // Enrich with member details
      return (data as SupportRelationship[]).map(rel => ({
        ...rel,
        supporter: members.find(m => m.id === rel.supporter_member_id),
        recipient: members.find(m => m.id === rel.recipient_member_id),
      })) as SupportRelationshipWithDetails[];
    },
    enabled: !!household?.id && members.length > 0,
  });

  // Get relationships where current user is supporter
  const supportingRelationships = relationships.filter(
    r => r.supporter_member_id === currentMember?.id
  );

  // Get relationships where current user is recipient
  const receivingRelationships = relationships.filter(
    r => r.recipient_member_id === currentMember?.id
  );

  // Create support relationship
  const createRelationship = useMutation({
    mutationFn: async ({
      recipientMemberId,
      privacyMode = 'detailed' as PrivacyMode,
      scopeOfVisibility = 'all_recipient_spend' as VisibilityScope,
    }: {
      recipientMemberId: string;
      privacyMode?: PrivacyMode;
      scopeOfVisibility?: VisibilityScope;
    }) => {
      if (!household?.id || !currentMember?.id) throw new Error('Not in a household');

      const { data, error } = await supabase
        .from('support_relationships')
        .insert({
          household_id: household.id,
          supporter_member_id: currentMember.id,
          recipient_member_id: recipientMemberId,
          privacy_mode: privacyMode,
          scope_of_visibility: scopeOfVisibility,
          start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return data as SupportRelationship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-relationships'] });
    },
  });

  // Update privacy mode (recipient can change this)
  const updatePrivacyMode = useMutation({
    mutationFn: async ({
      relationshipId,
      privacyMode,
    }: {
      relationshipId: string;
      privacyMode: PrivacyMode;
    }) => {
      const { data, error } = await supabase
        .from('support_relationships')
        .update({ privacy_mode: privacyMode })
        .eq('id', relationshipId)
        .select()
        .single();

      if (error) throw error;
      return data as SupportRelationship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-relationships'] });
    },
  });

  // End support relationship
  const endRelationship = useMutation({
    mutationFn: async (relationshipId: string) => {
      const { error } = await supabase
        .from('support_relationships')
        .update({ end_date: new Date().toISOString().split('T')[0] })
        .eq('id', relationshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-relationships'] });
    },
  });

  // Check if current user can view detailed transactions of a member
  const canViewDetails = (memberId: string): boolean => {
    if (!currentMember) return false;
    
    // Own transactions
    if (currentMember.id === memberId) return true;
    
    // Has permission to view all
    if ((currentMember.permissions as any)?.can_view_all_transactions) return true;
    
    // Has support relationship with detailed privacy
    const relationship = relationships.find(
      r => r.supporter_member_id === currentMember.id && 
           r.recipient_member_id === memberId &&
           r.privacy_mode === 'detailed'
    );
    
    return !!relationship;
  };

  // Get privacy mode for a member (from current user's perspective as supporter)
  const getPrivacyModeFor = (memberId: string): PrivacyMode | null => {
    const relationship = relationships.find(
      r => r.supporter_member_id === currentMember?.id && 
           r.recipient_member_id === memberId
    );
    return relationship?.privacy_mode ?? null;
  };

  return {
    relationships,
    supportingRelationships,
    receivingRelationships,
    isLoading,
    createRelationship,
    updatePrivacyMode,
    endRelationship,
    canViewDetails,
    getPrivacyModeFor,
  };
}
