import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Wallet, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';

// Profile components
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { calculateProfileCompleteness } from '@/components/profile/ProfileCompleteness';
import { PersonalDataTab } from '@/components/profile/PersonalDataTab';
import { IncomeTab } from '@/components/profile/IncomeTab';
import { AppSettingsTab } from '@/components/profile/AppSettingsTab';
import { FamilyTab } from '@/components/profile/FamilyTab';
import { IncomeType } from '@/types/family';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    profile, 
    isPrimary, 
    linkWithInviteCode, 
    updateProfile, 
    updatePersonalData, 
    setAppMode, 
    appMode, 
    incomeType, 
    setIncomeType, 
    privacyMode, 
    unlinkFromFamily, 
    updatePrivacyMode 
  } = useUserProfile();
  const { settings, upsertSettings, isLoading: settingsLoading } = useFinancialSettings();

  // Calculate profile completeness
  const { percentage: completionPercentage } = calculateProfileCompleteness(profile, settings, incomeType);

  // Handlers
  const handleUpdateName = async (name: string) => {
    const { error } = await updateProfile({ displayName: name });
    if (!error) {
      toast.success('Nome aggiornato');
    }
  };

  const handleSwitchMode = async (mode: 'simple' | 'extended') => {
    await setAppMode(mode);
    if (mode === 'simple') {
      navigate('/simple-home');
    } else {
      navigate('/');
    }
  };

  const handleSwitchIncomeType = async (type: IncomeType) => {
    await setIncomeType(type);
    const labels = {
      freelancer: 'Libero Professionista',
      employee: 'Dipendente',
      family_member: 'Familiare'
    };
    toast.success(`Tipo reddito: ${labels[type]}`);
  };

  const handleSaveIncomeSettings = async (newSettings: Record<string, unknown>) => {
    try {
      await upsertSettings.mutateAsync(newSettings);
      toast.success('Impostazioni salvate');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  const handlePrivacyToggle = async (detailed: boolean) => {
    const mode = detailed ? 'detailed' : 'summary';
    const { error } = await updatePrivacyMode(mode);
    if (error) {
      toast.error('Errore aggiornamento privacy');
    } else {
      toast.success(mode === 'detailed' ? 'Dettagli spese visibili' : 'Solo totali visibili');
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto pb-20">
        {/* Modern Header */}
        <ProfileHeader
          profile={profile}
          email={user?.email}
          incomeType={incomeType}
          completionPercentage={completionPercentage}
          onUpdateName={handleUpdateName}
        />

        {/* Tab Navigation */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-12 p-1 bg-muted/50">
            <TabsTrigger value="personal" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Personale</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Reddito</span>
            </TabsTrigger>
            <TabsTrigger value="app" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">App</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Famiglia</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4 animate-fade-in">
            <PersonalDataTab 
              profile={profile}
              userId={user?.id}
              onUpdatePersonalData={updatePersonalData}
            />
          </TabsContent>

          <TabsContent value="income" className="mt-4 animate-fade-in">
            <IncomeTab
              incomeType={incomeType}
              settings={settings}
              onSwitchIncomeType={handleSwitchIncomeType}
              onSaveSettings={handleSaveIncomeSettings}
              isSaving={upsertSettings.isPending}
            />
          </TabsContent>

          <TabsContent value="app" className="mt-4 animate-fade-in">
            <AppSettingsTab
              appMode={appMode}
              onSwitchMode={handleSwitchMode}
            />
          </TabsContent>

          <TabsContent value="family" className="mt-4 animate-fade-in">
            <FamilyTab
              profile={profile}
              isPrimary={isPrimary}
              privacyMode={privacyMode}
              onLinkWithCode={linkWithInviteCode}
              onUnlink={unlinkFromFamily}
              onPrivacyToggle={handlePrivacyToggle}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
