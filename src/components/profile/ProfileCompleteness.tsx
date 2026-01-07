import { UserProfile } from '@/types/family';

interface CompletenessItem {
  label: string;
  completed: boolean;
}

export function calculateProfileCompleteness(
  profile: UserProfile | null,
  settings: {
    daily_rate?: number | null;
    monthly_salary?: number | null;
  } | null,
  incomeType: string | undefined
): { percentage: number; items: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    { label: 'Nome profilo', completed: !!profile?.displayName },
    { label: 'Età', completed: !!profile?.age },
    { label: 'Struttura familiare', completed: !!profile?.familyStructure },
    { label: 'Tipo abitazione', completed: !!profile?.housingType },
    { label: 'Regione', completed: !!profile?.region },
    { 
      label: 'Reddito configurato', 
      completed: incomeType === 'freelancer' 
        ? !!(settings?.daily_rate && settings.daily_rate > 0)
        : incomeType === 'employee'
          ? !!(settings?.monthly_salary && settings.monthly_salary > 0)
          : incomeType === 'family_member'
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const percentage = Math.round((completedCount / items.length) * 100);

  return { percentage, items };
}
