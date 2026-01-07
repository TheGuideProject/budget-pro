import React, { useState } from 'react';
import { useSupportRelationships } from '@/hooks/useSupportRelationships';
import { useHousehold } from '@/hooks/useHousehold';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function RecipientPrivacySettings() {
  const { currentMember } = useHousehold();
  const { 
    receivingRelationships, 
    updatePrivacyMode, 
    isLoading 
  } = useSupportRelationships();

  const [updating, setUpdating] = useState<string | null>(null);

  const handlePrivacyChange = async (relationshipId: string, detailed: boolean) => {
    setUpdating(relationshipId);
    try {
      await updatePrivacyMode.mutateAsync({
        relationshipId,
        privacyMode: detailed ? 'detailed' : 'summary',
      });
      toast.success(
        detailed 
          ? 'Dettagli ora visibili al supporter' 
          : 'Dettagli nascosti al supporter'
      );
    } catch (error) {
      toast.error('Errore nel salvare le impostazioni');
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  if (receivingRelationships.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Non hai relazioni di supporto attive.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Impostazioni Privacy
        </CardTitle>
        <CardDescription>
          Controlla quali informazioni condividere con chi ti supporta economicamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {receivingRelationships.map((relationship) => (
          <div 
            key={relationship.id}
            className="flex items-start justify-between p-4 border rounded-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {relationship.supporter?.display_name || 'Supporter'}
                </span>
                <Badge variant={relationship.privacy_mode === 'detailed' ? 'default' : 'secondary'}>
                  {relationship.privacy_mode === 'detailed' ? (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Dettagli visibili
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Solo riepilogo
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {relationship.privacy_mode === 'detailed' 
                  ? 'Può vedere le tue spese, categorie e merchant' 
                  : 'Può vedere solo il totale speso, senza dettagli'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`privacy-${relationship.id}`} className="text-sm">
                Mostra dettagli
              </Label>
              <Switch
                id={`privacy-${relationship.id}`}
                checked={relationship.privacy_mode === 'detailed'}
                onCheckedChange={(checked) => handlePrivacyChange(relationship.id, checked)}
                disabled={updating === relationship.id}
              />
            </div>
          </div>
        ))}

        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Le modifiche alla privacy hanno effetto immediato. 
            Chi ti supporta vedrà le informazioni secondo le tue preferenze.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
