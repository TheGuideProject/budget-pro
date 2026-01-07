import { FileText, Ship, Sparkles, Languages, ClipboardList } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  prompt: string;
}

interface QuickActionsBarProps {
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
}

const quickActions: QuickAction[] = [
  {
    icon: FileText,
    label: 'Genera Report',
    prompt: 'Genera un report tecnico professionale basato sulla nostra conversazione',
  },
  {
    icon: Ship,
    label: 'Report PINFABB',
    prompt: 'Genera un report PINFABB con tutti i dati discussi: nave, IMO, porto, date, lavori',
  },
  {
    icon: ClipboardList,
    label: 'Riassumi',
    prompt: 'Riassumi in punti chiave tutto quello che abbiamo discusso',
  },
  {
    icon: Languages,
    label: 'In English',
    prompt: 'Generate the report in English',
  },
  {
    icon: Sparkles,
    label: 'Migliora',
    prompt: 'Migliora e arricchisci il report con più dettagli tecnici',
  },
];

export function QuickActionsBar({ onSelectAction, disabled }: QuickActionsBarProps) {
  return (
    <div className="px-4 py-3 border-t bg-background/50 backdrop-blur-sm">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="quick-action-chip"
              onClick={() => onSelectAction(action.prompt)}
              disabled={disabled}
            >
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}
