import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Settings, 
  Shield,
  Database,
  Bell,
  Mail,
  CreditCard,
  Globe,
  Lock
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminSettings() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isLoading: authLoading } = useAdminAuth();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const settingsGroups = [
    {
      title: 'Sicurezza',
      icon: Shield,
      description: 'Gestisci autenticazione e permessi',
      items: [
        { label: 'Autenticazione 2FA', status: 'coming_soon' },
        { label: 'Protezione password deboli', status: 'available' },
        { label: 'Sessioni attive', status: 'available' },
      ],
    },
    {
      title: 'Database',
      icon: Database,
      description: 'Backup e manutenzione dati',
      items: [
        { label: 'Backup automatici', status: 'available' },
        { label: 'Esportazione dati', status: 'available' },
        { label: 'Pulizia dati obsoleti', status: 'coming_soon' },
      ],
    },
    {
      title: 'Notifiche',
      icon: Bell,
      description: 'Configura notifiche push e email',
      items: [
        { label: 'Notifiche push', status: 'coming_soon' },
        { label: 'Email transazionali', status: 'available' },
        { label: 'Newsletter', status: 'coming_soon' },
      ],
    },
    {
      title: 'Email',
      icon: Mail,
      description: 'Template email e configurazione SMTP',
      items: [
        { label: 'Template email', status: 'available' },
        { label: 'Configurazione SMTP', status: 'available' },
        { label: 'Email di benvenuto', status: 'available' },
      ],
    },
    {
      title: 'Pagamenti',
      icon: CreditCard,
      description: 'Integrazione gateway pagamenti',
      items: [
        { label: 'Stripe', status: 'coming_soon' },
        { label: 'PayPal', status: 'coming_soon' },
        { label: 'Fatturazione automatica', status: 'coming_soon' },
      ],
    },
    {
      title: 'Localizzazione',
      icon: Globe,
      description: 'Lingue e formattazione',
      items: [
        { label: 'Italiano', status: 'active' },
        { label: 'Inglese', status: 'coming_soon' },
        { label: 'Formato valuta', status: 'available' },
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Attivo</Badge>;
      case 'available':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Disponibile</Badge>;
      case 'coming_soon':
        return <Badge variant="outline">Coming Soon</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="p-2 rounded-xl bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Impostazioni</h1>
                <p className="text-sm text-muted-foreground">Configurazione applicazione</p>
              </div>
            </div>
            {isSuperAdmin && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Super Admin
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsGroups.map((group) => (
            <Card key={group.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <group.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{group.title}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      {getStatusBadge(item.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Altre impostazioni in arrivo</h3>
                <p className="text-muted-foreground mt-1">
                  Stiamo lavorando su nuove funzionalità di configurazione. 
                  Le impostazioni "Coming Soon" saranno disponibili nelle prossime versioni.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
