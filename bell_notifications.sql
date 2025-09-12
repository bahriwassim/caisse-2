    -- Table pour les notifications de sonnerie (bell)
    CREATE TABLE "public"."bell_notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "order_id" uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        "table_id" integer NOT NULL,
        "message" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "admin_user" text,
        PRIMARY KEY ("id")
    );

    -- Activez la sécurité au niveau des lignes (RLS)
    ALTER TABLE public.bell_notifications ENABLE ROW LEVEL SECURITY;

    -- Politiques RLS pour autoriser l'accès
    CREATE POLICY "Allow public read access to bell notifications" ON public.bell_notifications FOR SELECT USING (true);
    CREATE POLICY "Allow public write access to bell notifications" ON public.bell_notifications FOR ALL USING (true);

    -- Index pour améliorer les performances sur table_id et read status
    CREATE INDEX idx_bell_notifications_table_read ON public.bell_notifications(table_id, read);
    CREATE INDEX idx_bell_notifications_created_at ON public.bell_notifications(created_at);