import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function setupStorage() {
  try {
    // Créer le bucket 'images' s'il n'existe pas
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Erreur lors de la récupération des buckets:', listError);
      return;
    }

    const imagesBucket = buckets.find(bucket => bucket.name === 'images');
    
    if (!imagesBucket) {
      console.log('Création du bucket images...');
      const { error: createError } = await supabaseAdmin.storage.createBucket('images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (createError) {
        console.error('Erreur lors de la création du bucket:', createError);
        return;
      }
      
      console.log('✅ Bucket images créé avec succès');
    } else {
      console.log('✅ Bucket images existe déjà');
    }

    // Vérifier et créer la politique RLS pour permettre l'upload public
    const { error: policyError } = await supabaseAdmin.rpc('create_storage_policy_if_not_exists', {
      bucket_name: 'images',
      policy_name: 'Allow public uploads',
      policy_definition: `
        CREATE POLICY "Allow public uploads" ON storage.objects 
        FOR INSERT 
        WITH CHECK (bucket_id = 'images');
      `
    });

    if (policyError) {
      console.log('Note: Impossible de créer automatiquement la politique RLS:', policyError.message);
      console.log('Veuillez créer manuellement les politiques suivantes dans Supabase Dashboard:');
      console.log('1. Politique INSERT: Allow public uploads');
      console.log('2. Politique SELECT: Allow public reads');
    }

  } catch (error) {
    console.error('Erreur lors de la configuration du storage:', error);
  }
}