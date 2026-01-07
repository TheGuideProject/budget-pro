import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet, LayoutDashboard, Mic, Camera, Landmark, Receipt, FileText, Users, Brain, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ModeSelection() {
  const navigate = useNavigate();
  const { setAppMode, loading } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectMode = async (mode: 'simple' | 'extended') => {
    setIsSubmitting(true);
    const { error } = await setAppMode(mode);
    
    if (error) {
      toast.error('Errore durante il salvataggio');
      setIsSubmitting(false);
      return;
    }

    if (mode === 'simple') {
      navigate('/simple-home');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Come vuoi usare l'app?</h1>
          <p className="text-muted-foreground">Scegli la versione più adatta alle tue esigenze</p>
        </div>

        <div className="space-y-4">
          {/* Simple Version */}
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
            onClick={() => !isSubmitting && handleSelectMode('simple')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Versione Semplice</CardTitle>
                  <CardDescription>Solo gestione spese</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" />
                  <span>Inserimento vocale</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Scansione scontrini</span>
                </div>
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  <span>Import banca</span>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Lista spese</span>
                </div>
              </div>
              <Button 
                className="w-full mt-4" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scegli Semplice'}
              </Button>
            </CardContent>
          </Card>

          {/* Extended Version */}
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
            onClick={() => !isSubmitting && handleSelectMode('extended')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                  <LayoutDashboard className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Versione Completa</CardTitle>
                  <CardDescription>Tutte le funzionalità</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-secondary-foreground" />
                  <span>Fatture e bollette</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary-foreground" />
                  <span>Budget familiare</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-secondary-foreground" />
                  <span>Analisi predittiva AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-secondary-foreground" />
                  <span>Calendario scadenze</span>
                </div>
              </div>
              <Button 
                className="w-full mt-4" 
                variant="secondary"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scegli Completa'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Potrai cambiare versione in qualsiasi momento dalle impostazioni
        </p>
      </div>
    </div>
  );
}
