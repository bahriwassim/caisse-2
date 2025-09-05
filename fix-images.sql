-- Script SQL pour corriger les images picsum.photos en production
-- À exécuter dans le SQL Editor de Supabase

-- 1. Voir quels éléments ont encore des images picsum.photos
SELECT id, name, image, category 
FROM menu_items 
WHERE image LIKE '%picsum.photos%';

-- 2. Corriger les images des pizzas
UPDATE menu_items 
SET image = '/images/Pizza-margherita.jpg' 
WHERE name ILIKE '%PIZZA%' AND image LIKE '%picsum.photos%';

-- 3. Corriger spécifiquement le JAMAICAN BOWL s'il existe
UPDATE menu_items 
SET image = '/images/jamaican-poke-bowl-08-683x1024.jpg' 
WHERE name ILIKE '%JAMAICAN%' AND image LIKE '%picsum.photos%';

-- 4. Vérification finale - il ne devrait plus y avoir d'images picsum.photos
SELECT id, name, image, category 
FROM menu_items 
WHERE image LIKE '%picsum.photos%';

-- 5. Voir toutes les images actuellement utilisées
SELECT name, image, category 
FROM menu_items 
ORDER BY category, name;