-- Script pour ajouter les champs société si la table invoices existe déjà
-- Exécutez ce script si vous avez déjà une table invoices sans les champs company_name et vat_number

-- Ajouter les colonnes company_name et vat_number si elles n'existent pas
DO $$
BEGIN
  -- Ajouter company_name si n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='invoices' AND column_name='company_name') THEN
    ALTER TABLE invoices ADD COLUMN company_name text;
  END IF;
  
  -- Ajouter vat_number si n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='invoices' AND column_name='vat_number') THEN
    ALTER TABLE invoices ADD COLUMN vat_number text;
  END IF;
END $$;

-- Ajouter les commentaires
COMMENT ON COLUMN invoices.company_name IS 'Nom de la société cliente (optionnel)';
COMMENT ON COLUMN invoices.vat_number IS 'Numéro de TVA de la société cliente (optionnel)';