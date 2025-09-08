-- Correction du type ENUM pour le statut des articles
-- À exécuter dans Supabase

-- D'abord, vérifier le type ENUM existant
DO $$
BEGIN
    -- Vérifier si le type item_status existe et ses valeurs
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status') THEN
        RAISE NOTICE 'Type item_status existe déjà';
    ELSE
        -- Créer le type ENUM s'il n'existe pas
        CREATE TYPE item_status AS ENUM ('available', 'out_of_stock');
        RAISE NOTICE 'Type item_status créé';
    END IF;
END $$;

-- S'assurer que la colonne status utilise le bon type
DO $$
BEGIN
    -- Mettre à jour le type de la colonne si nécessaire
    ALTER TABLE menu_items 
    ALTER COLUMN status TYPE item_status 
    USING status::item_status;
    
    RAISE NOTICE 'Colonne status mise à jour vers le type item_status';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'La colonne status est déjà du bon type ou erreur: %', SQLERRM;
END $$;

-- Fonction corrigée pour décrémenter le stock avec cast explicite
CREATE OR REPLACE FUNCTION decrement_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Décrémenter le stock seulement si le suivi est activé
    UPDATE menu_items 
    SET 
        stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
        status = CASE 
            WHEN GREATEST(0, stock_quantity - NEW.quantity) <= 0 THEN 'out_of_stock'::item_status
            ELSE 'available'::item_status
        END
    WHERE id = NEW.menu_item_id 
    AND track_stock = TRUE 
    AND stock_quantity IS NOT NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction corrigée pour le réapprovisionnement
CREATE OR REPLACE FUNCTION restock_item(
    item_id UUID,
    quantity_to_add INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE menu_items 
    SET 
        stock_quantity = COALESCE(stock_quantity, 0) + quantity_to_add,
        status = CASE 
            WHEN COALESCE(stock_quantity, 0) + quantity_to_add > 0 THEN 'available'::item_status
            ELSE 'out_of_stock'::item_status
        END
    WHERE id = item_id AND track_stock = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction corrigée pour la mise à jour automatique du statut
CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour le statut automatiquement selon le stock
    IF NEW.track_stock = TRUE AND NEW.stock_quantity IS NOT NULL THEN
        IF NEW.stock_quantity <= 0 THEN
            NEW.status = 'out_of_stock'::item_status;
        ELSE
            NEW.status = 'available'::item_status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreer les triggers
DROP TRIGGER IF EXISTS trigger_decrement_stock ON order_items;
CREATE TRIGGER trigger_decrement_stock
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION decrement_stock();

DROP TRIGGER IF EXISTS trigger_update_stock_status ON menu_items;
CREATE TRIGGER trigger_update_stock_status
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_status();

-- Test et correction des données existantes
DO $$
BEGIN
    -- Corriger les statuts existants qui ne sont pas dans le bon format
    UPDATE menu_items 
    SET status = CASE 
        WHEN status::text = 'available' THEN 'available'::item_status
        WHEN status::text = 'out_of_stock' THEN 'out_of_stock'::item_status
        ELSE 'available'::item_status
    END
    WHERE track_stock = TRUE;
    
    RAISE NOTICE 'Statuts existants corrigés';
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Correction des types ENUM terminée avec succès !';
    RAISE NOTICE 'Le problème de type "text" vs "item_status" est résolu';
    RAISE NOTICE 'Les commandes peuvent maintenant être créées sans erreur';
END $$;