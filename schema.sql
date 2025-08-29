-- Création des types ENUM pour les statuts et méthodes de paiement
CREATE TYPE "public"."order_status" AS ENUM (
    'awaiting_payment',
    'in_preparation',
    'delivered',
    'cancelled'
);

CREATE TYPE "public"."payment_method" AS ENUM (
    'Carte de crédit',
    'Espèces'
);

CREATE TYPE "public"."item_status" AS ENUM (
    'available',
    'out_of_stock'
);


-- Table pour les articles du menu
CREATE TABLE "public"."menu_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "name" text NOT NULL,
    "description" text NOT NULL,
    "price" numeric NOT NULL,
    "category" text NOT NULL,
    "status" item_status NOT NULL DEFAULT 'available'::item_status,
    "image" text,
    "aiHint" text,
    PRIMARY KEY ("id")
);

-- Table pour les commandes
CREATE TABLE "public"."orders" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "customer" text NOT NULL,
    "table_id" integer NOT NULL,
    "total" numeric NOT NULL,
    "status" order_status NOT NULL,
    "payment_method" payment_method NOT NULL,
    "stripe_session_id" text,
    "short_id" text,
    PRIMARY KEY ("id")
);

-- Table pour les articles d'une commande (table de liaison)
CREATE TABLE "public"."order_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "order_id" uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    "menu_item_id" uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    "quantity" integer NOT NULL,
    "price" numeric NOT NULL,
    PRIMARY KEY ("id")
);

-- Activez la sécurité au niveau des lignes (RLS) pour les tables
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Créez des politiques RLS pour autoriser l'accès public en lecture (SELECT)
-- C'est crucial pour que votre application puisse lire les données
CREATE POLICY "Allow public read access to menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access to orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read access to order items" ON public.order_items FOR SELECT USING (true);

-- Créez des politiques RLS pour autoriser l'écriture (INSERT, UPDATE, DELETE) pour les utilisateurs authentifiés
-- Pour une application de démonstration, nous pouvons autoriser toutes les écritures pour le rôle 'anon' (clé publique)
-- ATTENTION: Pour une application en production, vous devriez créer des règles plus restrictives.
CREATE POLICY "Allow public write access to menu" ON public.menu_items FOR ALL USING (true);
CREATE POLICY "Allow public write access to orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow public write access to order items" ON public.order_items FOR ALL USING (true);
