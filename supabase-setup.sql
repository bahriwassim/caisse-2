-- Script SQL pour configurer la base de données Supabase avec les nouvelles fonctionnalités

-- 1. Création de la table restaurant_info
CREATE TABLE IF NOT EXISTS restaurant_info (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    address VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    postal_code VARCHAR NOT NULL,
    country VARCHAR DEFAULT 'France',
    phone VARCHAR,
    email VARCHAR,
    website VARCHAR,
    logo_url VARCHAR,
    siret VARCHAR,
    vat_number VARCHAR,
    legal_form VARCHAR,
    capital VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configuration du Storage pour les images
-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'images', 
    'images', 
    true, 
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Politiques RLS pour restaurant_info
ALTER TABLE restaurant_info ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique des infos restaurant
CREATE POLICY "Allow public read access" ON restaurant_info
    FOR SELECT USING (true);

-- Politique pour permettre l'insertion/mise à jour publique (à ajuster selon vos besoins de sécurité)
CREATE POLICY "Allow public insert/update" ON restaurant_info
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Politiques RLS pour le Storage
-- Politique pour permettre l'upload public dans le bucket images
CREATE POLICY "Allow public uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'images');

-- Politique pour permettre la lecture publique des images
CREATE POLICY "Allow public reads" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

-- Politique pour permettre la suppression des images
CREATE POLICY "Allow public deletes" ON storage.objects
    FOR DELETE USING (bucket_id = 'images');

-- 5. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger pour updated_at sur restaurant_info
CREATE TRIGGER update_restaurant_info_updated_at 
    BEFORE UPDATE ON restaurant_info 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Initialisation avec des données par défaut si la table est vide
INSERT INTO restaurant_info (
    name, 
    address, 
    city, 
    postal_code, 
    country, 
    phone, 
    email, 
    siret, 
    legal_form, 
    capital
)
SELECT 
    'Mon Restaurant',
    '123 Rue de la République',
    'Paris',
    '75001',
    'France',
    '+33 1 23 45 67 89',
    'contact@monrestaurant.fr',
    '12345678901234',
    'SARL',
    '10000€'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_info);

-- 8. Commentaires pour documenter les tables
COMMENT ON TABLE restaurant_info IS 'Informations du restaurant pour la facturation et les documents officiels';
COMMENT ON COLUMN restaurant_info.name IS 'Nom du restaurant';
COMMENT ON COLUMN restaurant_info.address IS 'Adresse complète';
COMMENT ON COLUMN restaurant_info.city IS 'Ville';
COMMENT ON COLUMN restaurant_info.postal_code IS 'Code postal';
COMMENT ON COLUMN restaurant_info.country IS 'Pays (défaut: France)';
COMMENT ON COLUMN restaurant_info.phone IS 'Numéro de téléphone';
COMMENT ON COLUMN restaurant_info.email IS 'Email de contact';
COMMENT ON COLUMN restaurant_info.website IS 'Site web';
COMMENT ON COLUMN restaurant_info.logo_url IS 'URL du logo (depuis Supabase Storage)';
COMMENT ON COLUMN restaurant_info.siret IS 'Numéro SIRET';
COMMENT ON COLUMN restaurant_info.vat_number IS 'Numéro de TVA';
COMMENT ON COLUMN restaurant_info.legal_form IS 'Forme juridique (SARL, SAS, etc.)';
COMMENT ON COLUMN restaurant_info.capital IS 'Capital social';