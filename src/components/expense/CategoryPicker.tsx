import React, { useState, useEffect } from 'react';
import { ChevronRight, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CATEGORY_PARENTS, 
  CATEGORY_CHILDREN, 
  getCategoryParent,
  getCategoryChild,
  CategoryParent,
  CategoryChild 
} from '@/types/categories';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface CategoryPickerProps {
  value: string | null;
  childValue?: string | null;
  onChange: (parentId: string, childId?: string | null) => void;
  className?: string;
  placeholder?: string;
}

export function CategoryPicker({
  value,
  childValue,
  onChange,
  className,
  placeholder = 'Seleziona categoria'
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'parent' | 'child'>('parent');
  const [selectedParent, setSelectedParent] = useState<string | null>(value);
  const isMobile = useIsMobile();

  // Reset step when opening
  useEffect(() => {
    if (isOpen) {
      setStep('parent');
      setSelectedParent(value);
    }
  }, [isOpen, value]);

  const handleParentSelect = (parentId: string) => {
    setSelectedParent(parentId);
    const children = CATEGORY_CHILDREN[parentId] || [];
    
    if (children.length > 0) {
      // Has subcategories - show them
      setStep('child');
    } else {
      // No subcategories - confirm immediately
      onChange(parentId, null);
      setIsOpen(false);
    }
  };

  const handleChildSelect = (childId: string | null) => {
    if (selectedParent) {
      onChange(selectedParent, childId);
      setIsOpen(false);
    }
  };

  const handleSkipChild = () => {
    if (selectedParent) {
      onChange(selectedParent, null);
      setIsOpen(false);
    }
  };

  const handleBack = () => {
    setStep('parent');
    setSelectedParent(null);
  };

  const currentParent = value ? getCategoryParent(value) : null;
  const currentChild = value && childValue ? getCategoryChild(value, childValue) : null;

  const renderTrigger = () => {
    if (currentParent) {
      const Icon = currentParent.icon;
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl border border-border/50",
            "bg-card hover:bg-muted/50 transition-all duration-200",
            "text-left",
            className
          )}
        >
          <div className={cn("p-2 rounded-lg", currentParent.bgColor)}>
            <Icon className={cn("w-5 h-5", currentParent.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{currentParent.label}</p>
            {currentChild && (
              <p className="text-sm text-muted-foreground truncate">{currentChild.label}</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-xl border border-border/50",
          "bg-card hover:bg-muted/50 transition-all duration-200",
          "text-muted-foreground",
          className
        )}
      >
        <span>{placeholder}</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    );
  };

  const renderParentGrid = () => (
    <div className="grid grid-cols-3 gap-2 p-4">
      {CATEGORY_PARENTS.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selectedParent === cat.id || value === cat.id;
        
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleParentSelect(cat.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl",
              "transition-all duration-200 ease-out",
              "border-2",
              isSelected
                ? "border-primary bg-primary/10 scale-[0.98]"
                : "border-transparent hover:bg-muted/50 active:scale-95"
            )}
          >
            <div className={cn(
              "p-2.5 rounded-xl transition-colors",
              cat.bgColor
            )}>
              <Icon className={cn("w-5 h-5", cat.color)} />
            </div>
            <span className={cn(
              "text-xs font-medium text-center leading-tight line-clamp-2",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderChildList = () => {
    const parent = selectedParent ? getCategoryParent(selectedParent) : null;
    const children = selectedParent ? CATEGORY_CHILDREN[selectedParent] || [] : [];
    
    if (!parent) return null;
    
    const ParentIcon = parent.icon;

    return (
      <div className="flex flex-col h-full">
        {/* Header with parent info */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180 text-muted-foreground" />
          </button>
          <div className={cn("p-2 rounded-lg", parent.bgColor)}>
            <ParentIcon className={cn("w-5 h-5", parent.color)} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{parent.label}</p>
            <p className="text-xs text-muted-foreground">Scegli sottocategoria (opzionale)</p>
          </div>
        </div>

        {/* Child list */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {children.map((child) => {
              const isSelected = childValue === child.id;
              
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleChildSelect(child.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl",
                    "transition-all duration-150",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <span className="font-medium">{child.label}</span>
                  {isSelected && <Check className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Skip button */}
        <div className="p-4 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSkipChild}
          >
            Salta e usa solo "{parent.label}"
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderTrigger()}

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85vh] z-[200]">
          <DrawerHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                {step === 'parent' ? 'Categoria' : 'Sottocategoria'}
              </DrawerTitle>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-hidden">
            {step === 'parent' ? (
              <ScrollArea className="h-[50vh]">
                {renderParentGrid()}
              </ScrollArea>
            ) : (
              <div className="h-[50vh] flex flex-col">
                {renderChildList()}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// Compact version for filters/chips
export function CategoryChip({
  parentId,
  childId,
  onRemove,
  className
}: {
  parentId: string;
  childId?: string | null;
  onRemove?: () => void;
  className?: string;
}) {
  const parent = getCategoryParent(parentId);
  const child = childId ? getCategoryChild(parentId, childId) : null;
  
  if (!parent) return null;
  
  const Icon = parent.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm",
      parent.bgColor,
      className
    )}>
      <Icon className={cn("w-3.5 h-3.5", parent.color)} />
      <span className={cn("font-medium", parent.color)}>
        {child ? child.label : parent.label}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Display only badge
export function CategoryBadge({
  parentId,
  childId,
  showChild = true,
  size = 'md',
  className
}: {
  parentId: string;
  childId?: string | null;
  showChild?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const parent = getCategoryParent(parentId);
  const child = childId && showChild ? getCategoryChild(parentId, childId) : null;
  
  if (!parent) return null;
  
  const Icon = parent.icon;
  const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-2';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("rounded-lg", parent.bgColor, sizeClasses)}>
        <Icon className={cn(iconSize, parent.color)} />
      </div>
      {showChild && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {parent.label}
          </span>
          {child && (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {child.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
