-- Migration pour ajouter le statut 'ready_for_delivery'
-- Exécuter dans l'éditeur SQL de Supabase

-- Ajouter le nouveau statut à l'enum (si pas déjà fait)
DO $$ 
BEGIN
    -- Vérifier si le statut existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ready_for_delivery' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
    ) THEN
        ALTER TYPE order_status ADD VALUE 'ready_for_delivery';
        RAISE NOTICE 'Statut ready_for_delivery ajouté avec succès';
    ELSE
        RAISE NOTICE 'Statut ready_for_delivery existe déjà';
    END IF;
END $$;