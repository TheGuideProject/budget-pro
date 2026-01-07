-- Add hierarchical category columns to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS category_parent TEXT,
ADD COLUMN IF NOT EXISTS category_child TEXT;

-- Migrate existing data from category field to category_parent
UPDATE public.expenses 
SET category_parent = 
  CASE category
    WHEN 'casa' THEN 'casa_utenze'
    WHEN 'cibo' THEN 'alimentari'
    WHEN 'trasporti' THEN 'trasporti'
    WHEN 'salute' THEN 'salute'
    WHEN 'svago' THEN 'tempo_libero'
    WHEN 'abbonamenti' THEN 'abbonamenti_servizi'
    WHEN 'animali' THEN 'animali'
    WHEN 'viaggi' THEN 'viaggi'
    WHEN 'varie' THEN 'altro'
    WHEN 'fissa' THEN 'finanza_obblighi'
    WHEN 'variabile' THEN 'altro'
    WHEN 'carta_credito' THEN 'finanza_obblighi'
    ELSE 'altro'
  END
WHERE category_parent IS NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_expenses_category_parent ON public.expenses(category_parent);
CREATE INDEX IF NOT EXISTS idx_expenses_category_child ON public.expenses(category_child);