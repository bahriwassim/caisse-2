-- Migration pour ajouter la gestion de stock aux produits
-- À exécuter dans Supabase

-- Ajouter les colonnes de gestion de stock
ALTER TABLE menu_items 
ADD COLUMN stock_quantity INTEGER DEFAULT NULL,
ADD COLUMN min_stock_alert INTEGER DEFAULT NULL,
ADD COLUMN track_stock BOOLEAN DEFAULT FALSE;

-- Mettre à jour les commentaires des colonnes
COMMENT ON COLUMN menu_items.stock_quantity IS 'Quantité en stock (null = stock illimité)';
COMMENT ON COLUMN menu_items.min_stock_alert IS 'Seuil d''alerte de stock bas';
COMMENT ON COLUMN menu_items.track_stock IS 'Activer le suivi de stock pour cet article';

-- Créer un index pour optimiser les requêtes de stock
CREATE INDEX idx_menu_items_stock ON menu_items(stock_quantity, track_stock) WHERE track_stock = TRUE;

-- Fonction pour décrémenter automatiquement le stock lors d'une commande
CREATE OR REPLACE FUNCTION decrement_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Décrémenter le stock seulement si le suivi est activé
    UPDATE menu_items 
    SET 
        stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
        status = CASE 
            WHEN GREATEST(0, stock_quantity - NEW.quantity) <= 0 THEN 'out_of_stock'
            ELSE 'available'
        END
    WHERE id = NEW.menu_item_id 
    AND track_stock = TRUE 
    AND stock_quantity IS NOT NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour décrémenter automatiquement le stock
CREATE TRIGGER trigger_decrement_stock
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION decrement_stock();

-- Fonction pour remettre en stock un article
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
            WHEN COALESCE(stock_quantity, 0) + quantity_to_add > 0 THEN 'available'
            ELSE 'out_of_stock'
        END
    WHERE id = item_id AND track_stock = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour automatiquement le statut selon le stock
CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour le statut automatiquement selon le stock
    IF NEW.track_stock = TRUE AND NEW.stock_quantity IS NOT NULL THEN
        IF NEW.stock_quantity <= 0 THEN
            NEW.status = 'out_of_stock';
        ELSE
            NEW.status = 'available';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour la mise à jour automatique du statut
CREATE TRIGGER trigger_update_stock_status
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_status();

-- Vue pour les articles en stock bas
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    id,
    name,
    category,
    stock_quantity,
    min_stock_alert,
    CASE 
        WHEN stock_quantity <= 0 THEN 'rupture'
        WHEN stock_quantity <= min_stock_alert THEN 'stock_bas'
        ELSE 'normal'
    END as stock_status
FROM menu_items 
WHERE track_stock = TRUE 
AND stock_quantity IS NOT NULL 
AND min_stock_alert IS NOT NULL
AND stock_quantity <= min_stock_alert;