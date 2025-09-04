-- Script SQL pour créer la table invoices dans Supabase
-- Exécutez ce script dans l'interface Supabase SQL Editor

-- Créer la table invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_email text,
  company_name text,
  vat_number text,
  subtotal_ht numeric(10,2) NOT NULL,
  tax_amount numeric(10,2) NOT NULL,
  total_ttc numeric(10,2) NOT NULL,
  tax_rate numeric(4,4) NOT NULL DEFAULT 0.10,
  invoice_type text NOT NULL DEFAULT 'detailed' CHECK (invoice_type IN ('detailed', 'simple')),
  restaurant_details jsonb,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid')) DEFAULT 'draft'
);

-- Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON invoices(customer_email);

-- Activer RLS (Row Level Security)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable read for all users" ON invoices;
DROP POLICY IF EXISTS "Enable insert for service role" ON invoices;

-- Créer des politiques RLS appropriées pour l'API
-- Permettre la lecture à tous (pour les clients qui demandent leurs factures)
CREATE POLICY "Enable read for all users" ON invoices
    FOR SELECT USING (true);

-- Permettre l'insertion via l'API (côté serveur)
CREATE POLICY "Enable insert for service role" ON invoices
    FOR INSERT WITH CHECK (true);

-- Permettre la mise à jour via l'API (pour changer le statut)
CREATE POLICY "Enable update for service role" ON invoices
    FOR UPDATE USING (true) WITH CHECK (true);

-- Commentaires pour documentation
COMMENT ON TABLE invoices IS 'Table pour stocker les factures générées à partir des commandes';
COMMENT ON COLUMN invoices.invoice_number IS 'Numéro unique de facture au format INV-YEAR-XXXXXX';
COMMENT ON COLUMN invoices.company_name IS 'Nom de la société cliente (optionnel)';
COMMENT ON COLUMN invoices.vat_number IS 'Numéro de TVA de la société cliente (optionnel)';
COMMENT ON COLUMN invoices.subtotal_ht IS 'Sous-total hors taxes';
COMMENT ON COLUMN invoices.tax_amount IS 'Montant de la TVA';
COMMENT ON COLUMN invoices.total_ttc IS 'Total toutes taxes comprises';
COMMENT ON COLUMN invoices.tax_rate IS 'Taux de TVA appliqué (0.10 pour 10%)';
COMMENT ON COLUMN invoices.status IS 'Statut de la facture: draft, sent, paid';