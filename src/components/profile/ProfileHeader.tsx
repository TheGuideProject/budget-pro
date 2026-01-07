import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Mail, Calendar, Sparkles, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { UserProfile, IncomeType } from '@/types/family';
import { useState } from 'react';

interface ProfileHeaderProps {
  profile: UserProfile | null;
  email?: string;
  incomeType?: IncomeType;
  completionPercentage: number;
  onUpdateName: (name: string) => Promise<void>;
}

const incomeTypeLabels: Record<string, string> = {
  freelancer: 'Libero Professionista',
  employee: 'Dipendente',
  family_member: 'Familiare',
};

const incomeTypeColors: Record<string, string> = {
  freelancer: 'bg-primary/10 text-primary',
  employee: 'bg-accent/10 text-accent',
  family_member: 'bg-muted text-muted-foreground',
};

export function ProfileHeader({ 
  profile, 
  email, 
  incomeType,
  completionPercentage, 
  onUpdateName 
}: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);

  const memberSince = profile?.createdAt 
    ? format(profile.createdAt, 'MMMM yyyy', { locale: it })
    : '-';

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await onUpdateName(newName.trim());
    setSaving(false);
    setIsEditing(false);
  };

  const initials = profile?.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border shadow-lg">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
      
      <div className="relative p-6 space-y-4">
        {/* Top row: Avatar + Info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative group">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-primary-foreground">
                {initials}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="max-w-[200px] h-8"
                  placeholder="Nome"
                  autoFocus
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-success" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8" 
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold truncate">{profile?.displayName || 'Utente'}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    setNewName(profile?.displayName || '');
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              {email}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Membro da {memberSince}
              </span>
              {incomeType && (
                <Badge variant="secondary" className={incomeTypeColors[incomeType]}>
                  {incomeTypeLabels[incomeType]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Profilo completato</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </div>
    </div>
  );
}
