-- Script SQL pour ajouter le champ invoice_type à la table invoices
-- Exécutez ce script dans l'interface Supabase SQL Editor

-- Ajouter la colonne invoice_type si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_type'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_type text NOT NULL DEFAULT 'detailed' 
        CHECK (invoice_type IN ('detailed', 'simple'));
    END IF;
END $$;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN invoices.invoice_type IS 'Type de facture: detailed (détaillée avec tous les articles) ou simple (nombre de repas selon total)';