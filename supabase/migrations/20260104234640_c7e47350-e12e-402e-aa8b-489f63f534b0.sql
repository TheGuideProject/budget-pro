-- Pulisci trasferimenti errati (non sono trasferimenti famiglia)
DELETE FROM budget_transfers
WHERE description IN ('Liquidazione interessi-commissioni-spese', 'Shein.com');

-- Aggiungi campo transfer_date per tracciare la data esatta del bonifico
ALTER TABLE budget_transfers 
ADD COLUMN IF NOT EXISTS transfer_date DATE;

-- Indice unico per prevenire duplicati (stesso utente, stessa data, stesso importo)
CREATE UNIQUE INDEX IF NOT EXISTS unique_transfer_per_date_amount
ON budget_transfers (to_user_id, transfer_date, amount)
WHERE transfer_date IS NOT NULL;