import { useUserProfile } from '@/hooks/useUserProfile';
import { LinkFamilyMember } from './LinkFamilyMember';

export function InviteCodeCard() {
  const { profile, refetch } = useUserProfile();

  if (!profile) return null;

  return (
    <LinkFamilyMember
      currentUserRole={profile.role}
      linkedToUserId={profile.linkedToUserId}
      currentDisplayName={profile.displayName}
      currentInviteCode={profile.inviteCode}
      onLinked={() => refetch?.()}
    />
  );
}
