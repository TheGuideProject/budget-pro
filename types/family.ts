export type UserRole = 'primary' | 'secondary';
export type AppMode = 'simple' | 'extended' | null;
export type IncomeType = 'freelancer' | 'employee' | 'family_member' | null;
export type Gender = 'male' | 'female' | 'other' | null;
export type FamilyStructure = 'single' | 'couple' | 'couple_with_kids' | 'single_parent' | null;
export type HousingType = 'owned' | 'rented' | 'family' | null;
export type HeatingType = 'gas' | 'electric' | 'heat_pump' | 'pellet' | 'district' | null;
export type CitySize = 'small' | 'medium' | 'large' | 'metropolitan' | null;

export interface PersonalData {
  age?: number | null;
  gender?: Gender;
  yearsWorked?: number | null;
  familyStructure?: FamilyStructure;
  familyMembersCount?: number | null;
  housingType?: HousingType;
  housingSqm?: number | null;
  heatingType?: HeatingType;
  hasCar?: boolean | null;
  carCount?: number | null;
  citySize?: CitySize;
  region?: string | null;
}

export interface UserProfile extends PersonalData {
  id: string;
  userId: string;
  displayName: string;
  role: UserRole;
  linkedToUserId?: string | null;
  inviteCode?: string | null;
  appMode?: AppMode;
  incomeType?: IncomeType;
  variableMonthsLookback?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetTransfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  month: string; // "YYYY-MM"
  description: string;
  transferDate?: string | null; // "YYYY-MM-DD" - data esatta del bonifico
  bankRowKey?: string | null; // Unique key from bank CSV to prevent re-import
  createdAt: Date;
}

export interface LinkedProfile {
  profile: UserProfile;
  displayName: string;
}
