-- Pulizia trasferimenti duplicati nella tabella budget_transfers
-- Mantiene solo un trasferimento per ogni combinazione unica
DELETE FROM budget_transfers a
USING budget_transfers b
WHERE a.id > b.id 
  AND a.month = b.month 
  AND a.amount = b.amount 
  AND COALESCE(a.description, '') = COALESCE(b.description, '')
  AND a.from_user_id = b.from_user_id;

-- Crea indice unico su linked_transfer_id per prevenire duplicati futuri
CREATE UNIQUE INDEX IF NOT EXISTS unique_linked_transfer 
ON expenses(linked_transfer_id) 
WHERE linked_transfer_id IS NOT NULL;