-- Ajout du statut 'ready_for_delivery' pour les commandes
-- Ce script met à jour le type ENUM pour inclure le nouveau statut
-- IMPORTANT: Exécuter en deux étapes séparées pour éviter l'erreur PostgreSQL

-- ÉTAPE 1: Exécuter d'abord cette commande seule
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready_for_delivery';

-- ÉTAPE 2: Attendre que la transaction soit commitée, puis exécuter le reste

-- Vérifier que le nouveau statut a été ajouté
-- DO $$
-- DECLARE
--     enum_values text[];
-- BEGIN
--     SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_values
--     FROM pg_enum 
--     WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status');
--     
--     RAISE NOTICE 'Statuts disponibles: %', array_to_string(enum_values, ', ');
--     
--     IF 'ready_for_delivery' = ANY(enum_values) THEN
--         RAISE NOTICE 'Statut ready_for_delivery ajouté avec succès!';
--     ELSE
--         RAISE WARNING 'Échec de l''ajout du statut ready_for_delivery';
--     END IF;
-- END $$;