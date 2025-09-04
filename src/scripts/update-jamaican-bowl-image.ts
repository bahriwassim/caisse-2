// Script pour mettre à jour l'image du produit JAMAICAN BOWL
// Exécutez ce script une seule fois pour corriger l'image du produit

import { supabase } from '@/lib/supabase';

export async function updateJamaicanBowlImage() {
  try {
    console.log('Début de la mise à jour de l\'image du JAMAICAN BOWL...');
    
    // Vérifier si le produit existe
    const { data: existingItems, error: fetchError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('name', 'JAMAICAN BOWL');

    if (fetchError) {
      console.error('Erreur lors de la recherche du produit:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!existingItems || existingItems.length === 0) {
      console.log('Aucun produit "JAMAICAN BOWL" trouvé. Le produit sera créé lors du seed.');
      return { success: true, message: 'Produit non trouvé - sera créé lors du seed' };
    }

    // Mettre à jour l'image
    const { data: updatedData, error: updateError } = await supabase
      .from('menu_items')
      .update({
        image: '/images/jamaican-poke-bowl-08-683x1024.jpg',
        updated_at: new Date().toISOString()
      })
      .eq('name', 'JAMAICAN BOWL')
      .select();

    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('Image du JAMAICAN BOWL mise à jour avec succès!');
    console.log('Données mises à jour:', updatedData);

    return { 
      success: true, 
      message: 'Image du JAMAICAN BOWL mise à jour avec succès',
      data: updatedData 
    };

  } catch (error) {
    console.error('Erreur inattendue:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

// Fonction utilitaire pour vérifier l'état actuel
export async function checkJamaicanBowlStatus() {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('name', 'JAMAICAN BOWL');

    if (error) {
      console.error('Erreur:', error);
      return { success: false, error: error.message };
    }

    console.log('État actuel du JAMAICAN BOWL:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}