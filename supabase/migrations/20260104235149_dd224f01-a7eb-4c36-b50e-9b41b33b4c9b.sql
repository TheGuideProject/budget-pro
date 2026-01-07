-- Elimina tutti i trasferimenti del 2025 per reimportarli correttamente dal CSV
-- NON tocca gennaio 2026 che è già corretto
DELETE FROM budget_transfers 
WHERE month >= '2025-01' AND month <= '2025-12';