-- Script pour uniformiser TOUTES les images avec des images locales fiables
-- À exécuter dans Supabase SQL Editor

-- 1. Voir l'état actuel
SELECT name, image, category FROM menu_items ORDER BY name;

-- 2. Forcer toutes les pizzas à utiliser l'image locale Pizza-margherita.jpg
UPDATE menu_items 
SET image = '/images/Pizza-margherita.jpg' 
WHERE name ILIKE '%PIZZA%';

-- 3. Forcer le JAMAICAN BOWL à utiliser son image locale (au cas où)
UPDATE menu_items 
SET image = '/images/jamaican-poke-bowl-08-683x1024.jpg' 
WHERE name ILIKE '%JAMAICAN%';

-- 4. Pour tout autre produit qui aurait une URL externe, le forcer vers l'image par défaut
UPDATE menu_items 
SET image = '/images/Pizza-margherita.jpg' 
WHERE image NOT LIKE '/images/%' AND name NOT ILIKE '%JAMAICAN%';

-- 5. Vérification finale - toutes les images doivent maintenant être locales
SELECT name, image, category FROM menu_items ORDER BY name;

-- 6. Compter combien d'images locales vs externes
SELECT 
  CASE 
    WHEN image LIKE '/images/%' THEN 'Images locales'
    ELSE 'Images externes'
  END as type_image,
  COUNT(*) as nombre
FROM menu_items 
GROUP BY 
  CASE 
    WHEN image LIKE '/images/%' THEN 'Images locales'
    ELSE 'Images externes'
  END;