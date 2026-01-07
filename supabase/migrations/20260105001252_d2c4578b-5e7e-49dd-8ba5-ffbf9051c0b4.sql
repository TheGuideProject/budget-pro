-- Rimuove il vincolo troppo restrittivo che blocca bonifici legittimi
DROP INDEX IF EXISTS unique_transfer_per_date_amount;

-- Aggiunge colonna per identificare univocamente la riga del CSV banca
ALTER TABLE budget_transfers
ADD COLUMN IF NOT EXISTS bank_row_key text;

-- Crea indice unico basato sulla riga banca (per evitare reimport dello stesso CSV)
CREATE UNIQUE INDEX IF NOT EXISTS unique_transfer_per_bank_row_key
ON budget_transfers (to_user_id, bank_row_key)
WHERE bank_row_key IS NOT NULL;

-- Indice per performance ricerche
CREATE INDEX IF NOT EXISTS idx_budget_transfers_to_user_transfer_date
ON budget_transfers (to_user_id, transfer_date);