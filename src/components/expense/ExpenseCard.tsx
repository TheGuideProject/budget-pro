import React, { useRef, useCallback } from 'react';
import {
  CreditCard,
  Banknote,
  Building2,
  Trash2,
  Pencil,
  Upload,
  MoreVertical,
  Receipt,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Expense } from '@/types';
import { getCategoryParent, getCategoryChild } from '@/types/categories';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCreditCardBookedDate } from '@/utils/expenseClassification';

const paymentMethodLabels: Record<string, { icon: React.ElementType; label: string }> = {
  contanti: { icon: Banknote, label: 'Contanti' },
  bancomat: { icon: CreditCard, label: 'Bancomat' },
  carta_credito: { icon: CreditCard, label: 'Carta' },
  bonifico: { icon: Building2, label: 'Bonifico' },
};

interface ExpenseCardProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
  onUploadReceipt?: (id: string) => void;
  formatCurrency: (amount: number) => string;
  // Selection mode props
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onUploadReceipt,
  formatCurrency,
  selectable = false,
  selected = false,
  onSelect,
  onLongPress,
}: ExpenseCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Long press handlers
  const handleTouchStart = useCallback(() => {
    if (selectable) return; // Already in selection mode
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress?.(expense.id);
    }, 500);
  }, [selectable, expense.id, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (selectable && onSelect) {
      onSelect(expense.id);
    }
  }, [selectable, onSelect, expense.id]);

  // Use new hierarchical category system with fallback to legacy
  const categoryParent = expense.categoryParent ? getCategoryParent(expense.categoryParent) : null;
  const categoryChild = expense.categoryParent && expense.categoryChild 
    ? getCategoryChild(expense.categoryParent, expense.categoryChild) 
    : null;
  
  // Get icon, color, and label from new system or use fallback
  const CategoryIcon = categoryParent?.icon || Receipt;
  const categoryColor = categoryParent?.color || 'text-gray-600';
  const categoryBgColor = categoryParent?.bgColor || 'bg-gray-100 dark:bg-gray-900/30';
  const categoryLabel = categoryChild?.label || categoryParent?.label || 'Altro';
  
  const paymentMethod = expense.paymentMethod ? paymentMethodLabels[expense.paymentMethod] : null;

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-card border transition-all duration-200",
        selectable ? "cursor-pointer" : "hover:shadow-md hover:border-border",
        selected 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-border/50"
      )}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Selection Checkbox */}
      {selectable && (
        <div className="flex-shrink-0 flex items-center justify-center">
          <div 
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
              selected 
                ? "bg-primary border-primary" 
                : "border-muted-foreground/40 bg-background"
            )}
          >
            {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
          </div>
        </div>
      )}

      {/* Category Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center",
        categoryBgColor
      )}>
        <CategoryIcon className={cn("w-5 h-5 sm:w-6 sm:h-6", categoryColor)} />
      </div>

      {/* Content - grows to fill space */}
      <div className="flex-1 min-w-0">
        {/* Title row with amount */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground text-sm sm:text-base leading-tight line-clamp-2">
            {expense.description}
          </p>
          <p className="flex-shrink-0 text-base sm:text-lg font-bold text-foreground tabular-nums">
            -{formatCurrency(expense.amount)}
          </p>
        </div>
        
        {/* Meta info */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            categoryBgColor,
            categoryColor
          )}>
            {categoryLabel}
          </span>
          {/* Show parent category as secondary label if child is selected */}
          {categoryChild && categoryParent && (
            <span className="text-xs text-muted-foreground">
              {categoryParent.label}
            </span>
          )}
          {expense.paymentMethod === 'carta_credito' ? (
            <>
              <span className="text-muted-foreground/40">•</span>
              <Badge 
                variant="outline" 
                className="text-xs h-5 bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-600"
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Addebito {format(getCreditCardBookedDate(expense.date), 'dd/MM')}
              </Badge>
            </>
          ) : paymentMethod ? (
            <>
              <span className="text-muted-foreground/40 hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <paymentMethod.icon className="w-3 h-3" />
                {paymentMethod.label}
              </span>
            </>
          ) : null}
          {expense.notes && (
            <p className="w-full text-xs text-muted-foreground truncate mt-0.5">
              {expense.notes}
            </p>
          )}
        </div>
      </div>

      {/* Actions - hide in selection mode */}
      {!selectable && (
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-lg z-50">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(expense)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifica
                </DropdownMenuItem>
              )}
              {onUploadReceipt && (
                <DropdownMenuItem onClick={() => onUploadReceipt(expense.id)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Carica scontrino
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(expense.id)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
