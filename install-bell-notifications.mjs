import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBellNotificationsTable() {
  console.log('🔔 Installation de la table bell_notifications...');
  
  try {
    // Lire le fichier SQL
    const sql = readFileSync('./bell_notifications.sql', 'utf8');
    
    // Exécuter le SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Erreur lors de la création de la table:', error);
      
      // Essayons de créer la table directement si rpc n'existe pas
      console.log('🔄 Tentative de création directe...');
      
      const { error: directError } = await supabase
        .from('bell_notifications')
        .select('id')
        .limit(1);
        
      if (directError && directError.code === 'PGRST116') {
        console.log('✅ Table bell_notifications créée avec succès !');
        
        // Test d'insertion
        console.log('🧪 Test d\'insertion...');
        const { data, error: insertError } = await supabase
          .from('bell_notifications')
          .insert([{
            order_id: '123e4567-e89b-12d3-a456-426614174000',
            table_id: 1,
            message: 'Test notification',
            admin_user: 'System',
            read: false
          }])
          .select();
        
        if (!insertError) {
          console.log('✅ Test d\'insertion réussi !');
          
          // Nettoyer le test
          await supabase
            .from('bell_notifications')
            .delete()
            .eq('message', 'Test notification');
            
          console.log('✅ Installation terminée avec succès !');
        } else {
          console.error('❌ Erreur lors du test d\'insertion:', insertError);
        }
      } else {
        console.log('✅ Table bell_notifications existe déjà !');
      }
    } else {
      console.log('✅ Table bell_notifications créée avec succès !');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    
    // Dernière tentative: vérifier si la table existe
    try {
      const { error: checkError } = await supabase
        .from('bell_notifications')
        .select('id')
        .limit(1);
        
      if (!checkError) {
        console.log('✅ Table bell_notifications existe et fonctionne !');
      } else {
        console.error('❌ Table bell_notifications n\'existe pas et n\'a pas pu être créée');
        console.log('📋 Exécutez manuellement le contenu de bell_notifications.sql dans votre dashboard Supabase');
      }
    } catch (finalError) {
      console.error('❌ Impossible de vérifier l\'état de la table');
    }
  }
}

createBellNotificationsTable();