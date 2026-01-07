import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Tag, ChevronDown, ListFilter, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutoCategorizeDialog } from './AutoCategorizeDialog';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category_parent?: string | null;
  category_child?: string | null;
}

type CategorizeMode = 'uncategorized' | 'all';

interface AutoCategorizeButtonProps {
  expenses: Expense[];
  onCategorized: () => void;
}

export function AutoCategorizeButton({ expenses, onCategorized }: AutoCategorizeButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mode, setMode] = useState<CategorizeMode>('uncategorized');

  // Filter expenses that need categorization (category is "altro", "Altro", empty or null)
  const uncategorizedExpenses = expenses.filter(e => {
    const category = e.category_parent?.toLowerCase();
    return !category || category === 'altro' || category === 'uncategorized' || category === '';
  });

  const uncategorizedCount = uncategorizedExpenses.length;
  const totalCount = expenses.length;

  // Get expenses to pass to dialog based on mode
  const expensesToCategorize = mode === 'uncategorized' ? uncategorizedExpenses : expenses;

  const handleOpenDialog = (selectedMode: CategorizeMode) => {
    setMode(selectedMode);
    setIsDialogOpen(true);
  };

  // Don't show button if there are no expenses at all
  if (totalCount === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "relative gap-2 border-primary/30 hover:border-primary",
              "bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10",
              "transition-all duration-300"
            )}
          >
            {uncategorizedCount > 0 && (
              <div className="absolute -top-2 -right-2">
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-[20px] text-xs font-bold px-1.5 animate-pulse"
                >
                  {uncategorizedCount}
                </Badge>
              </div>
            )}
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Auto-Categorizza</span>
            <Tag className="h-4 w-4 sm:hidden" />
            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={() => handleOpenDialog('uncategorized')}
            disabled={uncategorizedCount === 0}
            className="flex items-center gap-2"
          >
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <span>Solo senza categoria</span>
              <span className="ml-2 text-muted-foreground">({uncategorizedCount})</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleOpenDialog('all')}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <span>Tutte le spese</span>
              <span className="ml-2 text-muted-foreground">({totalCount})</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AutoCategorizeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        expenses={expensesToCategorize}
        onComplete={() => {
          setIsDialogOpen(false);
          onCategorized();
        }}
      />
    </>
  );
}
