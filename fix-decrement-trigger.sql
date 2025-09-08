-- Correction du trigger de décompte de stock
-- Le problème: le trigger essaie de mettre à jour une colonne 'status' qui n'existe pas dans order_items

-- Supprimer le trigger défaillant
DROP TRIGGER IF EXISTS trigger_decrement_stock ON order_items;

-- Fonction corrigée pour décrémenter le stock (ne touche que menu_items)
CREATE OR REPLACE FUNCTION decrement_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    -- Log pour debug
    RAISE NOTICE 'Trigger déclenché pour menu_item_id: %, quantité: %', NEW.menu_item_id, NEW.quantity;
    
    -- Récupérer le stock actuel et vérifier si le suivi est activé
    SELECT stock_quantity INTO current_stock 
    FROM menu_items 
    WHERE id = NEW.menu_item_id AND track_stock = TRUE AND stock_quantity IS NOT NULL;
    
    -- Si l'article a un suivi de stock activé
    IF current_stock IS NOT NULL THEN
        -- Calculer le nouveau stock
        current_stock := GREATEST(0, current_stock - NEW.quantity);
        
        -- Mettre à jour SEULEMENT la table menu_items
        UPDATE menu_items 
        SET 
            stock_quantity = current_stock,
            status = CASE 
                WHEN current_stock <= 0 THEN 'out_of_stock'::item_status
                ELSE 'available'::item_status
            END
        WHERE id = NEW.menu_item_id;
        
        RAISE NOTICE 'Stock mis à jour pour item %: nouveau stock = %', NEW.menu_item_id, current_stock;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER trigger_decrement_stock
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION decrement_stock();

-- Test du trigger
DO $$
BEGIN
    RAISE NOTICE 'Trigger decrement_stock recréé avec succès';
    RAISE NOTICE 'Le trigger ne modifie plus order_items, seulement menu_items';
END $$;
