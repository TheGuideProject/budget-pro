import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Copy, Check, Eye, EyeOff, UserMinus, Loader2, Link2, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '@/types/family';

interface FamilyTabProps {
  profile: UserProfile | null;
  isPrimary: boolean;
  privacyMode: 'detailed' | 'summary' | undefined;
  onLinkWithCode: (code: string) => Promise<{ error?: Error | null }>;
  onUnlink: () => Promise<{ error?: Error | null }>;
  onPrivacyToggle: (detailed: boolean) => Promise<void>;
}

export function FamilyTab({ 
  profile, 
  isPrimary, 
  privacyMode, 
  onLinkWithCode, 
  onUnlink, 
  onPrivacyToggle 
}: FamilyTabProps) {
  const [copied, setCopied] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const copyInviteCode = () => {
    if (profile?.inviteCode) {
      navigator.clipboard.writeText(profile.inviteCode);
      setCopied(true);
      toast.success('Codice copiato!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareInviteCode = async () => {
    if (profile?.inviteCode && navigator.share) {
      try {
        await navigator.share({
          title: 'Codice invito Budget Familiare',
          text: `Usa questo codice per collegarti al mio budget: ${profile.inviteCode}`,
        });
      } catch (err) {
        copyInviteCode();
      }
    } else {
      copyInviteCode();
    }
  };

  const handleLinkAccount = async () => {
    if (!inviteCodeInput.trim()) {
      toast.error('Inserisci un codice invito');
      return;
    }
    
    setLinking(true);
    const { error } = await onLinkWithCode(inviteCodeInput.trim());
    setLinking(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account collegato con successo!');
      setInviteCodeInput('');
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    const { error } = await onUnlink();
    setUnlinking(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account scollegato con successo');
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary user: Show invite code */}
      {isPrimary && profile?.inviteCode && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-card to-accent/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <QrCode className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Il tuo codice invito</CardTitle>
                <CardDescription className="text-xs">Condividi per collegare un familiare</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 relative">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-4 py-3 rounded-xl font-mono text-xl tracking-[0.3em] text-center font-bold">
                {profile.inviteCode}
              </div>
              <Button variant="outline" size="icon" className="h-12 w-12" onClick={copyInviteCode}>
                {copied ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>
            
            <Button variant="secondary" className="w-full gap-2" onClick={shareInviteCode}>
              <Share2 className="h-4 w-4" />
              Condividi via WhatsApp o SMS
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Chi riceve il codice potrà vedere il budget che gli assegni
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Secondary user not linked: Show link form */}
      {!profile?.linkedToUserId && !isPrimary && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10">
                <Link2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base">Collega account</CardTitle>
                <CardDescription className="text-xs">Inserisci il codice ricevuto da un familiare</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder="CODICE"
                className="font-mono tracking-widest text-center text-lg"
                maxLength={8}
              />
              <Button onClick={handleLinkAccount} disabled={linking} className="px-6">
                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Collega'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Una volta collegato, potrai ricevere budget e il gestore vedrà le tue spese
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Secondary user linked: Show status and settings */}
      {profile?.linkedToUserId && (
        <div className="space-y-4">
          {/* Connected status */}
          <Card className="border-0 shadow-lg border-l-4 border-l-success">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium">Account collegato</p>
                  <p className="text-sm text-muted-foreground">Sei collegato a un budget familiare</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-muted">
                  {privacyMode === 'detailed' ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </div>
                <div>
                  <CardTitle className="text-base">Privacy spese</CardTitle>
                  <CardDescription className="text-xs">Controlla cosa può vedere il gestore</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Mostra dettagli spese</p>
                  <p className="text-xs text-muted-foreground">
                    {privacyMode === 'detailed' 
                      ? 'Il gestore vede cosa compri e dove' 
                      : 'Il gestore vede solo il totale speso'
                    }
                  </p>
                </div>
                <Switch
                  checked={privacyMode === 'detailed'}
                  onCheckedChange={(v) => onPrivacyToggle(v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Unlink */}
          <Card className="border-0 shadow-lg">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive text-sm">Scollega account</p>
                  <p className="text-xs text-muted-foreground">
                    Rimuovi il collegamento con il gruppo famiglia
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={unlinking}>
                      {unlinking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserMinus className="h-4 w-4 mr-2" />}
                      Scollega
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Questa azione scollegherà il tuo account dal gruppo famiglia. 
                        Potrai sempre ricollegarti con un nuovo codice invito.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnlink}>
                        Conferma
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Empty state for primary without linked users */}
      {isPrimary && !profile?.inviteCode && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nessun familiare collegato</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
