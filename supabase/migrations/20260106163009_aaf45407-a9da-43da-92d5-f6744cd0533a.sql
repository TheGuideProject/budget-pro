-- Tabella per memorizzare le categorizzazioni apprese
CREATE TABLE learned_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- La descrizione normalizzata di riferimento
  description TEXT NOT NULL,
  
  -- Categoria assegnata
  category_parent TEXT NOT NULL,
  category_child TEXT,
  
  -- Quante volte è stata usata/confermata questa regola
  usage_count INTEGER DEFAULT 1,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unicità: una descrizione per utente
  UNIQUE(user_id, description)
);

-- Indice per ricerche veloci
CREATE INDEX idx_learned_categories_user ON learned_categories(user_id);

-- Enable RLS
ALTER TABLE learned_categories ENABLE ROW LEVEL SECURITY;

-- Policy: utenti possono gestire le proprie regole apprese
CREATE POLICY "Users can manage their own learned categories"
ON learned_categories FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_learned_categories_updated_at
BEFORE UPDATE ON learned_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();