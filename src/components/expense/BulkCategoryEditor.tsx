import { useState } from 'react';
import { Check, X, FolderEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CategoryPicker } from '@/components/expense/CategoryPicker';
import { getCategoryParent, getCategoryChild } from '@/types/categories';
import { cn } from '@/lib/utils';

interface BulkCategoryEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onApply: (categoryParent: string, categoryChild: string | null) => void;
  onCancel: () => void;
}

export function BulkCategoryEditor({
  open,
  onOpenChange,
  selectedCount,
  onApply,
  onCancel,
}: BulkCategoryEditorProps) {
  const [categoryParent, setCategoryParent] = useState<string>('');
  const [categoryChild, setCategoryChild] = useState<string | null>(null);

  const handleCategoryChange = (parent: string, child: string | null) => {
    setCategoryParent(parent);
    setCategoryChild(child);
  };

  const handleApply = () => {
    if (categoryParent) {
      onApply(categoryParent, categoryChild);
      setCategoryParent('');
      setCategoryChild(null);
    }
  };

  const handleCancel = () => {
    setCategoryParent('');
    setCategoryChild(null);
    onCancel();
    onOpenChange(false);
  };

  const selectedParent = categoryParent ? getCategoryParent(categoryParent) : null;
  const selectedChild = categoryParent && categoryChild ? getCategoryChild(categoryParent, categoryChild) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <FolderEdit className="h-5 w-5 text-accent-foreground" />
            </div>
            Modifica Categoria
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Selected count info */}
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
            <p className="text-center text-sm text-muted-foreground">
              Modifica categoria per{' '}
              <span className="font-bold text-foreground">{selectedCount}</span>{' '}
              {selectedCount === 1 ? 'spesa selezionata' : 'spese selezionate'}
            </p>
          </div>

          {/* Category Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nuova categoria</label>
            <CategoryPicker
              value={categoryParent}
              childValue={categoryChild}
              onChange={handleCategoryChange}
            />
          </div>

          {/* Selected category preview */}
          {selectedParent && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedParent.bgColor)}>
                  <selectedParent.icon className={cn("h-5 w-5", selectedParent.color)} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedParent.label}</p>
                  {selectedChild && (
                    <p className="text-sm text-muted-foreground">{selectedChild.label}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl"
              onClick={handleApply}
              disabled={!categoryParent}
            >
              <Check className="h-4 w-4 mr-2" />
              Applica a {selectedCount}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
