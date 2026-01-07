import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_PARENTS, CategoryParent } from '@/types/categories';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ExpenseFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | 'all';
  onCategoryChange: (category: string | 'all') => void;
  onAdvancedFilters?: () => void;
}

export function ExpenseFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onAdvancedFilters
}: ExpenseFiltersProps) {
  // Build filter items with "all" option first
  const categoryFilters: { id: string; icon: React.ElementType; label: string }[] = [
    { id: 'all', icon: CATEGORY_PARENTS[0].icon, label: 'Tutte' },
    ...CATEGORY_PARENTS.map(cat => ({
      id: cat.id,
      icon: cat.icon,
      label: cat.label.split(' ')[0], // Short label for chips
    }))
  ];

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca spese..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 h-11 bg-card border-border/50"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Chips */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {categoryFilters.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                "transition-all duration-200 whitespace-nowrap",
                "border",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
              )}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
}
