import { useState } from 'react';
import { UserPlus, Check, Link, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

interface LinkFamilyMemberProps {
  currentUserRole: 'primary' | 'secondary';
  linkedToUserId?: string | null;
  currentDisplayName?: string;
  currentInviteCode?: string | null;
  onLinked: () => void;
}

export function LinkFamilyMember({
  currentUserRole,
  linkedToUserId,
  currentDisplayName,
  currentInviteCode,
  onLinked,
}: LinkFamilyMemberProps) {
  const { linkWithInviteCode } = useUserProfile();
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!currentInviteCode) return;
    await navigator.clipboard.writeText(currentInviteCode);
    setCopied(true);
    toast.success('Codice copiato!');
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLinkWithCode = async () => {
    const code = inviteCodeInput.trim();
    if (!code) {
      toast.error('Inserisci un codice invito');
      return;
    }

    setIsLinking(true);
    const { error } = await linkWithInviteCode(code);
    setIsLinking(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account collegato con successo!');
      onLinked();
    }
  };

  // Already linked as secondary
  if (currentUserRole === 'secondary' && linkedToUserId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            Profilo Collegato
          </CardTitle>
          <CardDescription>
            Sei collegato al budget familiare: ora il gestore principale può trasferirti budget e vedere le tue spese.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Collegamento Budget Familiare
        </CardTitle>
        <CardDescription>
          Per inviare soldi a un familiare serve prima collegare i profili.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentUserRole === 'primary' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Link className="h-4 w-4" />
              <span>
                Se sei il <span className="font-medium">gestore principale</span>, condividi il codice invito con il familiare.
              </span>
            </div>

            {currentInviteCode && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Il tuo codice invito</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 rounded-md bg-background px-3 py-2 font-mono text-sm tracking-wider">
                    {currentInviteCode}
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopyCode} aria-label="Copia codice invito">
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copia</span>
                  </Button>
                </div>
                {currentDisplayName && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nella lista apparirai come: <span className="font-medium">{currentDisplayName}</span>
                  </p>
                )}
                {copied && <p className="mt-2 text-xs text-success">Copiato</p>}
              </div>
            )}
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <Label htmlFor="invite-code-input">Inserisci codice invito</Label>
          <p className="text-xs text-muted-foreground">
            Chiedi il codice invito al gestore del budget familiare
          </p>
          <div className="flex gap-2">
            <Input
              id="invite-code-input"
              placeholder="Es: ABC12345"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              className="font-mono tracking-widest"
              maxLength={8}
            />
            <Button onClick={handleLinkWithCode} disabled={isLinking || !inviteCodeInput.trim()}>
              {isLinking ? 'Collegamento...' : 'Collega'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dopo il collegamento, il gestore potrà inviarti budget nella tab "Trasferimenti".
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
