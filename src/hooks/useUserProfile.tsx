import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole, AppMode, IncomeType, PersonalData } from '@/types/family';
import { useAuth } from '@/contexts/AuthContext';

type PrivacyMode = 'detailed' | 'summary';

interface UserProfileContextType {
  profile: UserProfile | null;
  linkedProfile: UserProfile | null;
  loading: boolean;
  isPrimary: boolean;
  isSecondary: boolean;
  appMode: AppMode | undefined;
  incomeType: IncomeType | undefined;
  privacyMode: PrivacyMode;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: Error | null }>;
  updatePersonalData: (data: PersonalData) => Promise<{ error?: Error | null }>;
  linkWithInviteCode: (inviteCode: string) => Promise<{ error: Error | null }>;
  setAppMode: (mode: AppMode) => Promise<{ error?: Error | null }>;
  setIncomeType: (type: IncomeType) => Promise<{ error?: Error | null }>;
  unlinkFromFamily: () => Promise<{ error: Error | null }>;
  updatePrivacyMode: (mode: PrivacyMode) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [linkedProfile, setLinkedProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('detailed');

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLinkedProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        const displayName = user.email?.split('@')[0] || 'Utente';
        const inviteCode = crypto.randomUUID().slice(0, 8).toUpperCase();
        
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: displayName,
            role: 'primary',
            invite_code: inviteCode,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
        } else if (newProfile) {
          setProfile(mapDbToProfile(newProfile));
        }
      } else if (profileData) {
        setProfile(mapDbToProfile(profileData));

        if (profileData.role === 'primary') {
          const { data: linkedData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('linked_to_user_id', user.id);

          if (linkedData && linkedData.length > 0) {
            setLinkedProfile(mapDbToProfile(linkedData[0]));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_profiles')
      .update({
        display_name: updates.displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (!error && updates.displayName) {
      setProfile(prev => prev ? { ...prev, displayName: updates.displayName! } : null);
    }

    return { error };
  };

  const updatePersonalData = async (data: PersonalData) => {
    if (!user || !profile) return { error: new Error('Not authenticated') };

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.age !== undefined) updateData.age = data.age;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.yearsWorked !== undefined) updateData.years_worked = data.yearsWorked;
    if (data.familyStructure !== undefined) updateData.family_structure = data.familyStructure;
    if (data.familyMembersCount !== undefined) updateData.family_members_count = data.familyMembersCount;
    if (data.housingType !== undefined) updateData.housing_type = data.housingType;
    if (data.housingSqm !== undefined) updateData.housing_sqm = data.housingSqm;
    if (data.heatingType !== undefined) updateData.heating_type = data.heatingType;
    if (data.hasCar !== undefined) updateData.has_car = data.hasCar;
    if (data.carCount !== undefined) updateData.car_count = data.carCount;
    if (data.citySize !== undefined) updateData.city_size = data.citySize;
    if (data.region !== undefined) updateData.region = data.region;

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
    }

    return { error };
  };

  const linkWithInviteCode = async (inviteCode: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Use secure RPC function to lookup profile by invite code
    // This prevents users from listing all profiles - they must know the exact code
    const { data: profiles, error: findError } = await supabase
      .rpc('get_profile_by_invite_code', { _invite_code: inviteCode.toUpperCase() });

    const primaryProfile = profiles?.[0];
    
    if (findError || !primaryProfile) {
      return { error: new Error('Codice invito non valido') };
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        role: 'secondary',
        linked_to_user_id: primaryProfile.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      return { error: new Error('Errore durante il collegamento') };
    }

    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (updatedProfile) {
      setProfile(mapDbToProfile(updatedProfile));
    }

    return { error: null };
  };

  const setAppMode = async (mode: AppMode) => {
    if (!user || !profile) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_profiles')
      .update({
        app_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, appMode: mode } : null);
    }

    return { error };
  };

  const setIncomeType = async (type: IncomeType) => {
    if (!user || !profile) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_profiles')
      .update({
        income_type: type,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, incomeType: type } : null);
    }

    return { error };
  };

  const unlinkFromFamily = async (): Promise<{ error: Error | null }> => {
    if (!user || !profile) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_profiles')
      .update({
        linked_to_user_id: null,
        role: 'primary',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, linkedToUserId: null, role: 'primary' } : null);
      setPrivacyMode('detailed');
    }

    return { error: error ? new Error(error.message) : null };
  };

  const updatePrivacyMode = async (mode: PrivacyMode): Promise<{ error: Error | null }> => {
    if (!user || !profile) return { error: new Error('Not authenticated') };

    // Update support_relationships if exists
    const { error } = await supabase
      .from('support_relationships')
      .update({
        privacy_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq('recipient_member_id', profile.id);

    if (!error) {
      setPrivacyMode(mode);
    }

    return { error: error ? new Error(error.message) : null };
  };

  const value: UserProfileContextType = {
    profile,
    linkedProfile,
    loading,
    isPrimary: profile?.role === 'primary',
    isSecondary: profile?.role === 'secondary',
    appMode: profile?.appMode,
    incomeType: profile?.incomeType,
    privacyMode,
    updateProfile,
    updatePersonalData,
    linkWithInviteCode,
    setAppMode,
    setIncomeType,
    unlinkFromFamily,
    updatePrivacyMode,
    refetch: fetchProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

function mapDbToProfile(data: any): UserProfile {
  return {
    id: data.id,
    userId: data.user_id,
    displayName: data.display_name,
    role: data.role as UserRole,
    linkedToUserId: data.linked_to_user_id,
    inviteCode: data.invite_code,
    appMode: data.app_mode as AppMode,
    incomeType: data.income_type as IncomeType,
    variableMonthsLookback: data.variable_months_lookback,
    age: data.age,
    gender: data.gender,
    yearsWorked: data.years_worked,
    familyStructure: data.family_structure,
    familyMembersCount: data.family_members_count,
    housingType: data.housing_type,
    housingSqm: data.housing_sqm,
    heatingType: data.heating_type,
    hasCar: data.has_car,
    carCount: data.car_count,
    citySize: data.city_size,
    region: data.region,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
