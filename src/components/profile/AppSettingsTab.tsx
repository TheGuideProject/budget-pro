import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, LayoutDashboard, Sparkles, Zap } from 'lucide-react';
import { AppMode } from '@/types/family';

interface AppSettingsTabProps {
  appMode: AppMode | undefined;
  onSwitchMode: (mode: AppMode) => Promise<void>;
}

const modes = [
  {
    id: 'simple' as const,
    icon: Smartphone,
    title: 'Semplice',
    description: 'Interfaccia minimalista per tenere traccia delle spese quotidiane',
    features: ['Registrazione rapida spese', 'Vista mensile essenziale', 'Categorie base'],
    gradient: 'from-accent/10 to-accent/5',
    iconColor: 'text-accent',
  },
  {
    id: 'extended' as const,
    icon: LayoutDashboard,
    title: 'Completa',
    description: 'Tutte le funzionalità per una gestione finanziaria avanzata',
    features: ['Budget dettagliato', 'Analisi e grafici', 'Previsioni AI', 'Famiglia e fatture'],
    gradient: 'from-primary/10 to-primary/5',
    iconColor: 'text-primary',
  },
];

export function AppSettingsTab({ appMode, onSwitchMode }: AppSettingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {modes.map((mode) => {
          const isActive = appMode === mode.id;
          const Icon = mode.icon;
          
          return (
            <Card 
              key={mode.id}
              className={`relative overflow-hidden border-2 transition-all cursor-pointer hover:shadow-lg ${
                isActive 
                  ? 'border-primary shadow-lg' 
                  : 'border-transparent hover:border-muted-foreground/20'
              }`}
              onClick={() => onSwitchMode(mode.id)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} pointer-events-none`} />
              
              {isActive && (
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    <Sparkles className="h-3 w-3" />
                    Attiva
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-2 relative">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isActive ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : mode.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{mode.title}</CardTitle>
                    <CardDescription>{mode.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  {mode.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-3 w-3 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {!isActive && (
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => onSwitchMode(mode.id)}>
                    Attiva modalità {mode.title}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
