-- Script pour mettre à jour la table invoices existante
-- Exécutez ce script dans l'interface Supabase SQL Editor

-- Ajouter les nouvelles colonnes si elles n'existent pas
DO $$ 
BEGIN 
    -- Ajouter invoice_type si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_type'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_type text NOT NULL DEFAULT 'detailed';
        ALTER TABLE invoices ADD CONSTRAINT invoice_type_check CHECK (invoice_type IN ('detailed', 'simple'));
    END IF;

    -- Ajouter restaurant_details si elle n'existe pas  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'restaurant_details'
    ) THEN
        ALTER TABLE invoices ADD COLUMN restaurant_details jsonb;
    END IF;
END $$;